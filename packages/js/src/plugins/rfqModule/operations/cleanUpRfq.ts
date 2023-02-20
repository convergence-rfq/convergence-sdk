import { createCleanUpRfqInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  makeConfirmOptionsFinalizedOnMainnet,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

const Key = 'CleanUpRfqOperation' as const;

/**
 * Cleans up an Rfq.
 *
 * ```ts
 *
 * const { rfq } = await convergence.rfqs.create(...);
 *
 * await convergence
 *   .rfqs()
 *   .cleanUpRfq({
 *     rfq: rfq.address
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const cleanUpRfqOperation = useOperation<CleanUpRfqOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CleanUpRfqOperation = Operation<
  typeof Key,
  CleanUpRfqInput,
  CleanUpRfqOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CleanUpRfqInput = {
  /**
   * The Taker of the Rfq
   *
   *  @defaultValue `convergence.identity().publicKey`
   *
   */
  taker?: PublicKey;

  /** The protocol address.
   * @defaultValue `(await convergence.protocol().get()).address
   */
  protocol?: PublicKey;

  /** The address of the Rfq account. */
  rfq: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CleanUpRfqOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const cleanUpRfqOperationHandler: OperationHandler<CleanUpRfqOperation> =
  {
    handle: async (
      operation: CleanUpRfqOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CleanUpRfqOutput> => {
      scope.throwIfCanceled();

      const builder = await cleanUpRfqBuilder(
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

      return { ...output };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CleanUpRfqBuilderParams = CleanUpRfqInput;

/**
 * Cancels an existing Response.
 *
 * ```ts
 * const transactionBuilder = convergence
 * .rfqs()
 * .builders()
 * .cleanUpRfq({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const cleanUpRfqBuilder = async (
  convergence: Convergence,
  params: CleanUpRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder> => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { taker = convergence.identity().publicKey, rfq } = params;

  const rfqProgram = convergence.programs().getRfq(programs);
  const protocol = await convergence.protocol().get();

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createCleanUpRfqInstruction(
        {
          taker,
          protocol: protocol.address,
          rfq,
        },
        rfqProgram.address
      ),
      signers: [],
      key: 'cleanUpRfq',
    });
};
