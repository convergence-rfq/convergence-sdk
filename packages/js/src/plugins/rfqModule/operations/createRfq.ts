import {
  createCreateRfqInstruction,
  OrderType,
  FixedSize,
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
   * The owner of the Rfq to create.
   *
   * @defaultValue `convergence.identity().publicKey`
   */
  owner?: PublicKey;

  legs?: object[];
  expectedLegSize?: number;

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
    const { owner = convergence.identity().publicKey } = operation.input;

    const builder = await createRfqBuilder(
      convergence,
      {
        ...operation.input,
        owner,
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

    const rfq = await convergence.rfqs().create(
      {
        ...operation.input,
      },
      scope
    );
    scope.throwIfCanceled();

    assertRfq(rfq);

    return { ...output, rfq };
  },
};

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CreateRfqBuilderParams = Omit<CreateRfqInput, 'confirmOptions'> & {
  /**
   * Whether or not the provided token account already exists.
   * If `false`, we'll add another instruction to create it.
   *
   * @defaultValue `true`
   */
  tokenExists?: boolean;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type CreateRfqBuilderContext = Omit<CreateRfqOutput, 'rfq'>;

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
): Promise<TransactionBuilder<CreateRfqBuilderContext>> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { owner = convergence.identity() } = params;

  const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getRfq(programs);

  const rfq = new Keypair();
  const expectedLegSize = 0;
  const legs: Leg[] = [];
  const orderType = OrderType.TwoWay;
  const fixedSize: FixedSize = { __kind: 'QuoteAsset', quoteAmount: 1 };
  const activeWindow = 1;
  const settlingWindow = 1;
  const anchorRemainingAccounts: AccountMeta[] = [];
  const quoteMint = new Keypair();
  const protocol = new Keypair();

  return (
    TransactionBuilder.make<CreateRfqBuilderContext>()
      .setFeePayer(payer)
      //.setContext()
      .add({
        instruction: createCreateRfqInstruction(
          {
            taker: owner as PublicKey,
            protocol: protocol.publicKey,
            rfq: rfq.publicKey,
            quoteMint: quoteMint.publicKey,
            systemProgram: systemProgram.address,
            anchorRemainingAccounts,
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
        signers: [payer, rfq],
        key: 'createRfq',
      })
  );
};
