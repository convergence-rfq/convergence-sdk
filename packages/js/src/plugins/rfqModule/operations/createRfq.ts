import { createCreateRfqInstruction } from '@convergence-rfq/rfq';
import { Keypair, AccountMeta } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { SpotInstrument } from '../../spotInstrumentModule';
import { PsyoptionsEuropeanInstrument } from '../../psyoptionsEuropeanInstrumentModule';
import { assertRfq, Rfq } from '../models';
import { OrderType, FixedSize, QuoteAsset, Leg } from '../types';
import { PsyoptionsAmericanInstrument } from '@/plugins/psyoptionsAmericanInstrumentModule';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import { sha256 } from '@noble/hashes/sha256';
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
import { InstrumentClient } from '@/plugins/instrumentModule';

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

  /** Optional Rfq keypair. */
  keypair?: Keypair;

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
    const { keypair = Keypair.generate() } = operation.input;

    const builder = await createRfqBuilder(
      convergence,
      {
        ...operation.input,
        keypair,
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
  // const { keypair = Keypair.generate() } = params;
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

  let serializedLegsData: Buffer[] = [];

  let expectedLegsHash: Uint8Array;

  let ic: InstrumentClient;

  for (const instrument of instruments) {
    const instrumentClient = convergence.instrument(
      instrument,
      instrument.legInfo
    );

    ic = instrumentClient;

    const leg = await instrumentClient.toLegData();
    legs.push(leg);

    // serializedLegsData.push(instrumentClient.serializeLegData(leg));

    legAccounts.push(...instrumentClient.getValidationAccounts());
  }

  serializedLegsData = legs.map(leg => ic.serializeLegData(leg));

  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeInt32LE(legs.length);
  const fullLegDataBuffer = Buffer.concat([
    lengthBuffer,
    ...serializedLegsData,
  ]);

  expectedLegsHash = sha256(fullLegDataBuffer);

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

  const recentTimestamp = new anchor.BN(Math.floor(Date.now() / 1000) - 1);

  const rfqPda = convergence.rfqs().pdas().rfq({
    taker: taker.publicKey,
    //@ts-ignore
    legsHash: expectedLegsHash,
    orderType,
    quoteAsset,
    fixedSize,
    activeWindow,
    settlingWindow,
    recentTimestamp,
  });

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .setContext({
      rfqPda,
    })
    .add({
      instruction: createCreateRfqInstruction(
        {
          taker: taker.publicKey,
          protocol: convergence.protocol().pdas().protocol(),
          rfq: rfqPda,
          systemProgram: systemProgram.address,
          anchorRemainingAccounts: [...quoteAccounts, ...legAccounts],
        },
        {
          expectedLegsSize,
          //@ts-ignore
          expectedLegsHash: Array.from(expectedLegsHash),
          // expectedLegsHash,
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
