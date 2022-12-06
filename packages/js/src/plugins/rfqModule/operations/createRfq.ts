import {
  createCreateRfqInstruction,
  OrderType,
  FixedSize,
  Leg,
} from '@convergence-rfq/rfq';
import {
  PublicKey,
  // AccountMeta,
  SystemProgram,
} from '@solana/web3.js';
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

  rfq: PublicKey;

  // legs?: object[];
  legs?: Leg[];

  expectedLegSize?: number;

  /**
   * The type of order.
   *
   * @defaultValue Defaults to creating a two-way order
   */
  orderType?: OrderType;

  fixedSize?: FixedSize;

  quoteMint: PublicKey;

  activeWindow?: number;

  settlingWindow?: number;

  protocol: PublicKey;
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
    const builder = await createRfqBuilder(
      convergence,
      {
        ...operation.input,
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

    let rfq;

    if (operation.__output) {
      const { rfq: RFQ } = operation.__output;
      rfq = RFQ;
    }
    scope.throwIfCanceled();

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
export type CreateRfqBuilderContext = SendAndConfirmTransactionResponse;

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
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;

  const {
    taker = convergence.identity(),
    rfq,
    legs = [],
    expectedLegSize = 0,
    orderType = OrderType.TwoWay,
    fixedSize, //should default to `None`
    quoteMint,
    activeWindow = 1,
    settlingWindow = 1,
    protocol,
  } = params;

  const fixedsz = fixedSize!;

  // const systemProgram = convergence.programs().getSystem(programs);
  const rfqProgram = convergence.programs().getRfq(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createCreateRfqInstruction(
        {
          taker: taker.publicKey,
          protocol,
          rfq,
          quoteMint,
          systemProgram: SystemProgram.programId,
        },
        {
          expectedLegSize,
          legs,
          orderType,
          fixedSize: fixedsz, //TODO: get None value
          activeWindow,
          settlingWindow,
        },
        rfqProgram.address
      ),
      signers: [payer],
      key: 'createRfq',
    });
};
