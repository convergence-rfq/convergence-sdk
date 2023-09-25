import { createCreateRfqInstruction } from '@convergence-rfq/rfq';
import { PublicKey, AccountMeta } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';

import { BN } from 'bn.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { assertRfq, FixedSize, Rfq, toSolitaFixedSize } from '../models';
import {
  calculateExpectedLegsHash,
  calculateExpectedLegsSize,
} from '../helpers';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import {
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import {
  LegInstrument,
  // LegInstrumentInputData,
  QuoteInstrument,
  toQuote,
} from '../../../plugins/instrumentModule';
import { OrderType, toSolitaOrderType } from '../models/OrderType';
import { InstructionUniquenessTracker } from '@/utils/classes';

const Key = 'CreateRfqOperation' as const;

/**
 * Creates a new Rfq.
 *
 * ```ts
 * const spotInstrument = new SpotInstrument(...);
 * const psyoptionsEuropeanInstrument = new PsyOptionsEuropeanInstrument(...);
 * const quoteAsset = instrumentClient.createQuote(new SpotInstrument(...));
 *
 * const { rfq } = await convergence
 *   .rfqs()
 *   .create({
 *     instruments: [spotInstrument, psyoptionsEuropeanInstrument],
 *     orderType: OrderType.Sell,
 *     fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
 *     activeWindow: 100,
 *     settlingWindow: 100,
 *     quoteAsset,
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const createRfqOperation = useOperation<CreateRfqOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CreateRfqOperation = Operation<
  typeof Key,
  CreateRfqInput,
  CreateRfqOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CreateRfqInput = {
  /**
   * The taker of the Rfq to create.
   *
   * @defaultValue `convergence.identity().publicKey`
   */
  taker?: Signer;

  /** The quote asset account. */
  quoteAsset: QuoteInstrument;

  /** The instruments of the order, used to construct legs. */
  instruments: LegInstrument[];

  /** The type of order. */
  orderType: OrderType;

  /**
   * The type of the Rfq, specifying whether we fix the number of
   * base assets to be exchanged, the number of quote assets,
   * or neither.
   */
  fixedSize: FixedSize;

  /**
   * Optional active window (in seconds).
   *
   * @defaultValue `5_000`
   */
  activeWindow?: number;

  /**
   * Optional settling window (in seconds).
   *
   * @defaultValue `1_000`
   */
  settlingWindow?: number;

  /**
   * The sum of the sizes of all legs of the Rfq,
   * including legs added in the future (if any).
   * This can be calculated automatically if
   * additional legs will not be added in
   * the future. */
  expectedLegsSize?: number;

  /** Optional expected legs hash (of all legs).
   * This can be calculated automatically if
   * additional legs will not be added in the future.
   */
  expectedLegsHash?: Uint8Array;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CreateRfqOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The newly created Rfq. */
  rfq: Rfq;
};

/**
 * @group Operations
 * @category Handlers
 */
export const createRfqOperationHandler: OperationHandler<CreateRfqOperation> = {
  handle: async (
    operation: CreateRfqOperation,
    convergence: Convergence,
    scope: OperationScope
  ) => {
    const {
      taker = convergence.identity(),
      orderType,
      quoteAsset,
      instruments,
      fixedSize,
      activeWindow = 5_000,
      settlingWindow = 1_000,
    } = operation.input;
    let { expectedLegsHash } = operation.input;
    const payer = convergence.rpc().getDefaultFeePayer();
    const recentTimestamp = new BN(Math.floor(Date.now() / 1_000));
    const optionMarketTxBuilderArray: TransactionBuilder[] = [];
    const ixTracker = new InstructionUniquenessTracker([]);
    for (const ins of instruments) {
      const optionMarketIxs = await ins.getPreparationsBeforeRfqCreation();
      const optionMarketTxBuilder =
        TransactionBuilder.make().setFeePayer(payer);
      if (optionMarketIxs.length > 0) {
        optionMarketIxs.forEach((ix) => {
          if (ixTracker.checkedAdd(ix)) {
            optionMarketTxBuilder.add({
              instruction: ix,
              signers: [convergence.identity()],
            });
          }
        });
        optionMarketTxBuilderArray.push(optionMarketTxBuilder);
      }
    }
    expectedLegsHash =
      expectedLegsHash ?? calculateExpectedLegsHash(instruments);

    const rfqPda = convergence
      .rfqs()
      .pdas()
      .rfq({
        taker: taker.publicKey,
        legsHash: Buffer.from(expectedLegsHash),
        orderType,
        quoteAsset: toQuote(quoteAsset),
        fixedSize,
        activeWindow,
        settlingWindow,
        recentTimestamp,
      });

    const { createRfqTxBuilder } = await createRfqBuilder(
      convergence,
      {
        ...operation.input,
        instruments,
        rfq: rfqPda,
        fixedSize,
        activeWindow,
        settlingWindow,
        expectedLegsHash,
        recentTimestamp,
      },
      scope
    );
    scope.throwIfCanceled();

    const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
      convergence,
      scope.confirmOptions
    );

    const lastValidBlockHeight = await convergence.rpc().getLatestBlockhash();

    const optionMarketTxs = optionMarketTxBuilderArray.map((b) =>
      b.toTransaction(lastValidBlockHeight)
    );

    const createRfqTx = createRfqTxBuilder.toTransaction(lastValidBlockHeight);

    const [optionMarketSignedTxs, [createRfqSignedTx]] = await convergence
      .rpc()
      .signTransactionMatrix(
        [optionMarketTxs, [createRfqTx]],
        [convergence.identity()]
      );
    for (const signedTx of optionMarketSignedTxs) {
      await convergence
        .rpc()
        .serializeAndSendTransaction(
          signedTx,
          lastValidBlockHeight,
          confirmOptions
        );
    }

    const response = await convergence
      .rpc()
      .serializeAndSendTransaction(
        createRfqSignedTx,
        lastValidBlockHeight,
        confirmOptions
      );

    scope.throwIfCanceled();

    const rfq = await convergence.rfqs().findRfqByAddress({ address: rfqPda });
    assertRfq(rfq);

    return { response, rfq };
  },
};

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CreateRfqBuilderParams = CreateRfqInput & {
  rfq: PublicKey;

  expectedLegsHash: Uint8Array;

  recentTimestamp: anchor.BN;
};

/**
 * Creates a new Rfq.
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .create({});
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */

export type CreateRfqBuilderResult = {
  createRfqTxBuilder: TransactionBuilder;
  remainingLegsToAdd: LegInstrument[];
};

export const createRfqBuilder = async (
  convergence: Convergence,
  params: CreateRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<CreateRfqBuilderResult> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;

  const {
    taker = convergence.identity(),
    quoteAsset,
    rfq,
    orderType,
    fixedSize,
    activeWindow = 5_000,
    settlingWindow = 1_000,
    recentTimestamp,
    expectedLegsHash,
    instruments,
  } = params;
  let { expectedLegsSize } = params;

  const legs = instruments.map((ins) => ins.toLeg());
  const expectedLegsSizeValue = calculateExpectedLegsSize(instruments);
  expectedLegsSize = expectedLegsSize ?? expectedLegsSizeValue;

  const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getRfq(programs);
  const spotInstrumentProgram = convergence
    .programs()
    .getSpotInstrument(programs);

  const quoteAccounts: AccountMeta[] = [
    {
      pubkey: spotInstrumentProgram.address,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: convergence
        .rfqs()
        .pdas()
        .quote({ quoteAsset: toQuote(quoteAsset) }),
      isSigner: false,
      isWritable: false,
    },
  ];

  let baseAssetAccounts = instruments.map((ins) => ins.getBaseAssetAccount());
  let legAccounts = instruments
    .map((ins) => ins.getValidationAccounts())
    .flat();

  let rfqBuilder = TransactionBuilder.make()
    .setFeePayer(payer)
    .setContext({
      rfq,
    })
    .add({
      instruction: createCreateRfqInstruction(
        {
          taker: taker.publicKey,
          protocol: convergence.protocol().pdas().protocol(),
          rfq,
          systemProgram: systemProgram.address,
          anchorRemainingAccounts: [
            ...quoteAccounts,
            ...baseAssetAccounts,
            ...legAccounts,
          ],
        },
        {
          expectedLegsSize,
          expectedLegsHash: Array.from(expectedLegsHash),
          legs,
          orderType: toSolitaOrderType(orderType),
          quoteAsset: toQuote(quoteAsset),
          fixedSize: toSolitaFixedSize(fixedSize, quoteAsset.getDecimals()),
          activeWindow,
          settlingWindow,
          recentTimestamp,
        },
        rfqProgram.address
      ),
      signers: [taker],
      key: 'createRfq',
    });

  let legsToAdd = [...legs];
  let instrumentsToAdd = [...instruments];

  while (!rfqBuilder.checkTransactionFits()) {
    instrumentsToAdd = instrumentsToAdd.slice(0, instrumentsToAdd.length - 1);
    legsToAdd = legsToAdd.slice(0, instrumentsToAdd.length);
    legAccounts = instrumentsToAdd
      .map((ins) => ins.getValidationAccounts())
      .flat();
    baseAssetAccounts = instrumentsToAdd.map((i) => i.getBaseAssetAccount());
    rfqBuilder = TransactionBuilder.make()
      .setFeePayer(payer)
      .setContext({
        rfq,
      })
      .add({
        instruction: createCreateRfqInstruction(
          {
            taker: taker.publicKey,
            protocol: convergence.protocol().pdas().protocol(),
            rfq,
            systemProgram: systemProgram.address,
            anchorRemainingAccounts: [
              ...quoteAccounts,
              ...baseAssetAccounts,
              ...legAccounts,
            ],
          },
          {
            expectedLegsSize,
            expectedLegsHash: Array.from(expectedLegsHash),
            legs: legsToAdd,
            orderType: toSolitaOrderType(orderType),
            quoteAsset: toQuote(quoteAsset),
            fixedSize: toSolitaFixedSize(fixedSize, quoteAsset.getDecimals()),
            activeWindow,
            settlingWindow,
            recentTimestamp,
          },
          rfqProgram.address
        ),
        signers: [taker],
        key: 'createRfq',
      });
  }

  const remainingLegsToAdd = instruments.slice(legsToAdd.length, legs.length);
  return {
    createRfqTxBuilder: rfqBuilder,
    remainingLegsToAdd,
  };
};
