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
  const { keypair = Keypair.generate() } = params;
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;

  const {
    taker = convergence.identity(),
    orderType,
    instruments,
    quoteAsset,
    fixedSize,
    activeWindow = 1,
    settlingWindow = 1,
    legSize = 4,
  } = params;

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
  let expectedLegSize = legSize;
  for (const instrument of instruments) {
    const instrumentClient = convergence.instrument(
      instrument,
      instrument.legInfo
    );
    legs.push(instrumentClient.toLegData());
    legAccounts.push(...instrumentClient.getValidationAccounts());
    expectedLegSize += instrumentClient.getLegDataSize();
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
