import {
  createCreateRfqInstruction,
  OrderType,
  FixedSize,
  QuoteAsset,
  Leg,
} from '@convergence-rfq/rfq';
import { Keypair, PublicKey, AccountMeta } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { assertRfq, Rfq } from '../models';
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
import { PsyoptionsEuropeanInstrument, SpotInstrument } from '@/index';

const Key = 'CreateRfqOperation' as const;

/**
 * Creates a new Rfq.
 *
 * ```ts
 * const { rfq } = await convergence
 *   .rfqs()
 *   .create();
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

  /** The pubkey address of the protocol account. */
  protocol?: PublicKey;

  /** Optional quote asset account. */
  quoteAsset: QuoteAsset;

  /** The legs of the order. */
  instruments: (SpotInstrument | PsyoptionsEuropeanInstrument)[];

  /**
   * The type of order.
   *
   * @defaultValue Defaults to creating a two-way order
   */
  orderType?: OrderType;

  fixedSize?: FixedSize;

  activeWindow?: number;

  settlingWindow?: number;
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
      .findByAddress({ address: keypair.publicKey });
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
    orderType = OrderType.Sell,
    instruments,
    quoteAsset,
    fixedSize = { __kind: 'QuoteAsset', quoteAmount: 1 },
    activeWindow = 1,
    settlingWindow = 1,
  } = params;

  const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getRfq(programs);
  const spotInstrumentProgram = convergence
    .programs()
    .getSpotInstrument(programs);

  const anchorRemainingAccounts: AccountMeta[] = [];

  // TODO: Use PDA client
  const MINT_INFO_SEED = 'mint_info';
  const [quotePda] = PublicKey.findProgramAddressSync(
    [Buffer.from(MINT_INFO_SEED), quoteAsset.instrumentData],
    rfqProgram.address
  );
  const quoteAccounts: AccountMeta[] = [
    {
      pubkey: spotInstrumentProgram.address,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: quotePda,
      isSigner: false,
      isWritable: false,
    },
  ];

  const legAccounts: AccountMeta[] = [];
  const legs: Leg[] = [];
  const protocol = await convergence.protocol().get();
  const expectedLegSizes = [];

  for (const instrument of instruments) {
    const instrumentClient = convergence.instrument(instrument);
    expectedLegSizes.push(instrumentClient.getInstrumendDataSize());
    legs.push(instrumentClient.toLegData());

    const [mintInfoPda] = PublicKey.findProgramAddressSync(
      // TODO: Do not hardcode
      //[Buffer.from(MINT_INFO_SEED), instruments[0].mint.toBuffer()],
      [Buffer.from(MINT_INFO_SEED), PublicKey.default.toBuffer()],
      rfqProgram.address
    );
    legAccounts.push(
      {
        pubkey: spotInstrumentProgram.address,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: mintInfoPda,
        isSigner: false,
        isWritable: false,
      }
    );
  }

  const expectedLegSize = expectedLegSizes.reduce((a, b) => a + b, 0);

  anchorRemainingAccounts.push(...quoteAccounts, ...legAccounts);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .setContext({
      keypair,
    })
    .add({
      instruction: createCreateRfqInstruction(
        {
          taker: taker.publicKey,
          protocol: protocol.address,
          rfq: keypair.publicKey,
          systemProgram: systemProgram.address,
          anchorRemainingAccounts,
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
