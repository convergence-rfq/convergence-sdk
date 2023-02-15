import { createCreateRfqInstruction } from '@convergence-rfq/rfq';
import { PublicKey, AccountMeta } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { SpotInstrument } from '../../spotInstrumentModule';
import { PsyoptionsEuropeanInstrument } from '../../psyoptionsEuropeanInstrumentModule';
import { assertRfq, Rfq } from '../models';
import { OrderType, FixedSize, QuoteAsset, Leg } from '../types';
import { PsyoptionsAmericanInstrument } from '@/plugins/psyoptionsAmericanInstrumentModule';
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
import * as anchor from '@project-serum/anchor';
import { Sha256 } from '@aws-crypto/sha256-js';

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
  quoteAsset: QuoteAsset;

  /** The instruments of the order, used to construct legs. */
  instruments: (
    | SpotInstrument
    | PsyoptionsEuropeanInstrument
    | PsyoptionsAmericanInstrument
  )[];

  /** The type of order. */
  orderType: OrderType;

  /** The type of the Rfq, specifying whether we fix the number of
   * base assets to be exchanged, the number of quote assets,
   * or neither.
   */
  fixedSize: FixedSize;

  /** The active window (in seconds). */
  activeWindow?: number;

  /** The settling window (in seconds). */
  settlingWindow?: number;

  /** The sum of the sizes of all legs of the Rfq,
   * including legs added in the future (if any).
   * This can be calculated automatically if
   * additional legs will not be added in
   * the future. */
  legSize?: number;

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

    let rfqPda: PublicKey;

    const recentTimestamp = new anchor.BN(Math.floor(Date.now() / 1_000) - 1);

    if (fixedSize.__kind == 'BaseAsset') {
      const parsedLegsMultiplierBps =
        (fixedSize.legsMultiplierBps as number) * Math.pow(10, 9);
      fixedSize.legsMultiplierBps = parsedLegsMultiplierBps;

      console.log(
        'baseasset fixedSize.legsMultiplierBps: ' +
          fixedSize.legsMultiplierBps.toString()
      );
      console.log(
        'baseasset createRfq parsedLegsMultBps: ' +
          parsedLegsMultiplierBps.toString()
      );
    } else if (fixedSize.__kind == 'QuoteAsset') {
      const parsedQuoteAmount =
        (fixedSize.quoteAmount as number) * Math.pow(10, 9);
      fixedSize.quoteAmount = parsedQuoteAmount;
    }

    if (expectedLegsHash) {
      rfqPda = convergence
        .rfqs()
        .pdas()
        .rfq({
          taker: taker.publicKey,
          legsHash: Buffer.from(expectedLegsHash),
          orderType,
          quoteAsset,
          fixedSize,
          activeWindow,
          settlingWindow,
          recentTimestamp,
        });
    } else {
      const serializedLegsData: Buffer[] = [];

      for (const instrument of instruments) {
        if (instrument.legInfo?.amount) {
          instrument.legInfo.amount *= Math.pow(10, instrument.decimals);
        }

        const instrumentClient = convergence.instrument(
          instrument,
          instrument.legInfo
        );

        const leg = await instrumentClient.toLegData();

        serializedLegsData.push(instrumentClient.serializeLegData(leg));
      }

      const lengthBuffer = Buffer.alloc(4);
      lengthBuffer.writeInt32LE(instruments.length);
      const fullLegDataBuffer = Buffer.concat([
        lengthBuffer,
        ...serializedLegsData,
      ]);

      const hash = new Sha256();
      hash.update(fullLegDataBuffer);
      expectedLegsHash = hash.digestSync();

      rfqPda = convergence
        .rfqs()
        .pdas()
        .rfq({
          taker: taker.publicKey,
          legsHash: Buffer.from(expectedLegsHash),
          orderType,
          quoteAsset,
          fixedSize,
          activeWindow,
          settlingWindow,
          recentTimestamp,
        });
    }

    const builder = await createRfqBuilder(
      convergence,
      {
        ...operation.input,
        rfq: rfqPda,
        fixedSize,
        instruments,
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

    const output = await builder.sendAndConfirm(convergence, confirmOptions);
    scope.throwIfCanceled();

    const rfq = await convergence.rfqs().findRfqByAddress({ address: rfqPda });
    assertRfq(rfq);

    return { ...output, rfq };
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
export const createRfqBuilder = async (
  convergence: Convergence,
  params: CreateRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;

  const {
    taker = convergence.identity(),
    orderType,
    instruments,
    quoteAsset,
    fixedSize,
    activeWindow = 5_000,
    settlingWindow = 1_000,
    rfq,
    recentTimestamp,
    expectedLegsHash,
  } = params;

  const { legSize } = params;

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

    const leg = await instrumentClient.toLegData();
    legs.push(leg);

    legAccounts.push(...instrumentClient.getValidationAccounts());
  }

  let expectedLegsSize: number;

  if (legSize) {
    expectedLegsSize = legSize;
  } else {
    expectedLegsSize = 4;

    for (const instrument of instruments) {
      const instrumentClient = convergence.instrument(
        instrument,
        instrument.legInfo
      );
      expectedLegsSize += await instrumentClient.getLegDataSize();
    }
  }

  return TransactionBuilder.make()
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
          anchorRemainingAccounts: [...quoteAccounts, ...legAccounts],
        },
        {
          expectedLegsSize,
          expectedLegsHash: Array.from(expectedLegsHash),
          legs,
          orderType,
          quoteAsset,
          fixedSize,
          activeWindow,
          settlingWindow,
          recentTimestamp,
        },
        rfqProgram.address
      ),
      signers: [taker],
      key: 'createRfq',
    });
};
