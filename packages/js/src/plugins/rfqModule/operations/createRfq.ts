import {
  createCreateRfqInstruction,
  OrderType,
  FixedSize,
  Leg,
} from '@convergence-rfq/rfq';
import { Keypair, PublicKey } from '@solana/web3.js';
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
  protocol: PublicKey;

  /** The pubkey address of the quote mint account. */
  quoteMint: PublicKey;

  /*
   * Args
   */

  expectedLegSize?: number;

  legs?: Leg[];

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
// & {
//   /**
//    * Whether or not the provided token account already exists.
//    * If `false`, we'll add another instruction to create it.
//    *
//    * @defaultValue `true`
//    */
//   tokenExists?: boolean;
// };

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type CreateRfqBuilderContext = Omit<CreateRfqOutput, 'response' | 'rfq'>;

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
    protocol,
    quoteMint,
    expectedLegSize = 0,
    legs = [],
    orderType = OrderType.TwoWay,
    fixedSize = { __kind: 'QuoteAsset', quoteAmount: 1 },
    activeWindow = 1,
    settlingWindow = 1,
  } = params;

  const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getRfq(programs);

  return TransactionBuilder.make<CreateRfqBuilderContext>()
    .setFeePayer(payer)
    .setContext({
      keypair,
    })
    .add({
      instruction: createCreateRfqInstruction(
        {
          taker: taker.publicKey,
          protocol,
          rfq: keypair.publicKey,
          quoteMint,
          systemProgram: systemProgram.address,
        },
        {
          expectedLegSize,
          legs,
          orderType,
          fixedSize,
          activeWindow,
          settlingWindow,
        },
        rfqProgram.address
      ),
      signers: [taker, keypair],
      key: 'createRfq',
    });
};
