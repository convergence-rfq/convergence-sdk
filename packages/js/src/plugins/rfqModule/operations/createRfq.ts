import { createCreateRfqInstruction } from '@convergence-rfq/rfq';
import { Keypair, AccountMeta } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { SpotInstrument } from '../../spotInstrumentModule';
import { PsyoptionsEuropeanInstrument } from '../../psyoptionsEuropeanInstrumentModule';
import { assertRfq, Rfq } from '../models';
import { OrderType, FixedSize, QuoteAsset, Leg } from '../types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '@/types';
import { Convergence } from '@/Convergence';
import { addLegsToRfqBuilder } from './addLegsToRfq';

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

  /** Optional Rfq keypair */
  keypair?: Keypair;

  /** Optional quote asset account. */
  quoteAsset: QuoteAsset;

  /** The legs of the order. */
  instruments: (SpotInstrument | PsyoptionsEuropeanInstrument)[];

  /**
   * The type of order.
   *
   * @defaultValue Defaults to creating a two-way order
   */
  orderType: OrderType;

  fixedSize: FixedSize;

  activeWindow?: number;

  settlingWindow?: number;

  legSize?: number;
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
      keypair = Keypair.generate(),
      taker = convergence.identity(),
      instruments,
    } = operation.input;

    const MAX_TX_SIZE = 1232;

    let builder = await createRfqBuilder(
      convergence,
      {
        ...operation.input,
        keypair,
      },
      scope
    );
    scope.throwIfCanceled();

    let txSize = await convergence
      .rpc()
      .getTransactionSize(builder, [taker, keypair]);

    let slicedInstruments = instruments;

    while (txSize + 193 > MAX_TX_SIZE) {
      const ins = slicedInstruments.slice(
        0,
        Math.trunc(slicedInstruments.length / 2)
      );

      builder = await createRfqBuilder(
        convergence,
        {
          ...operation.input,
          keypair,
          instruments: ins,
        },
        scope
      );

      txSize = await convergence
        .rpc()
        .getTransactionSize(builder, [taker, keypair]);

      slicedInstruments = ins;
    }

    let addLegsBuilder: TransactionBuilder;
    let addLegsBuilder2: TransactionBuilder;
    let addLegsTxSize: number = 0;

    if (slicedInstruments.length < instruments.length) {
      let addLegsSlicedInstruments = instruments.slice(
        slicedInstruments.length
      );

      addLegsBuilder = await addLegsToRfqBuilder(
        convergence,
        {
          ...operation.input,
          rfq: keypair.publicKey,
          instruments: addLegsSlicedInstruments,
        },
        scope
      );

      addLegsTxSize = await convergence
        .rpc()
        .getTransactionSize(addLegsBuilder, [taker]);

      while (addLegsTxSize + 193 > MAX_TX_SIZE) {
        const ins = addLegsSlicedInstruments.slice(
          0,
          Math.trunc(addLegsSlicedInstruments.length / 2)
        );

        addLegsBuilder = await addLegsToRfqBuilder(
          convergence,
          {
            ...operation.input,
            rfq: keypair.publicKey,
            instruments: ins,
          },
          scope
        );

        addLegsTxSize = await convergence
          .rpc()
          .getTransactionSize(addLegsBuilder, [taker]);

        addLegsSlicedInstruments = ins;
      }

      if (
        addLegsSlicedInstruments.length <
        instruments.slice(slicedInstruments.length).length
      ) {
        let ins = instruments.slice(addLegsSlicedInstruments.length);

        addLegsBuilder2 = await addLegsToRfqBuilder(
          convergence,
          {
            ...operation.input,
            rfq: keypair.publicKey,
            instruments: ins,
          },
          scope
        );
      }
    }

    const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
      convergence,
      scope.confirmOptions
    );

    const output = await builder.sendAndConfirm(convergence, confirmOptions);
    scope.throwIfCanceled();

    //@ts-ignore
    if (addLegsBuilder) {
      await addLegsBuilder.sendAndConfirm(convergence, confirmOptions);
      scope.throwIfCanceled();
    }
    //@ts-ignore
    if (addLegsBuilder2) {
      await addLegsBuilder2.sendAndConfirm(convergence, confirmOptions);
      scope.throwIfCanceled();
    }

    const rfq = await convergence
      .rfqs()
      .findRfqByAddress({ address: keypair.publicKey });
    assertRfq(rfq);

    return { ...output, rfq };
  },
};

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CreateRfqBuilderParams = CreateRfqInput;

/**
 * Creates a new Rfq.
 *
 * ```ts
 * const transactionBuilder = await convergence
 *   .rfqs()
 *   .builders()
 *   .create();
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const createRfqBuilder = async (
  convergence: Convergence,
  params: CreateRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { keypair = Keypair.generate() } = params;
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;

  const {
    taker = convergence.identity(),
    orderType,
    instruments,
    quoteAsset,
    fixedSize,
    activeWindow = 5_000,
    settlingWindow = 1_000,
  } = params;

  let { legSize } = params;

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
      pubkey: convergence.rfqs().pdas().quote({ quoteAsset }),
      isSigner: false,
      isWritable: false,
    },
  ];

  const legAccounts: AccountMeta[] = [];
  const legs: Leg[] = [];

  for (const instrument of instruments) {
    const instrumentClient = convergence.instrument(
      instrument,
      instrument.legInfo
    );
    legs.push(await instrumentClient.toLegData());
    legAccounts.push(...instrumentClient.getValidationAccounts());
  }

  let expectedLegSize: number;

  if (legSize) {
    expectedLegSize = legSize;
  } else {
    expectedLegSize = 4;

    for (const instrument of instruments) {
      const instrumentClient = convergence.instrument(
        instrument,
        instrument.legInfo
      );
      expectedLegSize += await instrumentClient.getLegDataSize();
    }
  }

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .setContext({
      keypair,
    })
    .add({
      instruction: createCreateRfqInstruction(
        {
          taker: taker.publicKey,
          protocol: convergence.protocol().pdas().protocol(),
          rfq: keypair.publicKey,
          systemProgram: systemProgram.address,
          anchorRemainingAccounts: [...quoteAccounts, ...legAccounts],
        },
        {
          expectedLegSize,
          legs,
          fixedSize,
          orderType,
          quoteAsset,
          activeWindow,
          settlingWindow,
        },
        rfqProgram.address
      ),
      signers: [taker, keypair],
      key: 'createRfq',
    });
};
