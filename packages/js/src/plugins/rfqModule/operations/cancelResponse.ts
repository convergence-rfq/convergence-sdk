import { createCancelResponseInstruction } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

const Key = 'CancelResponseOperation' as const;

/**
 * Cancels an existing Response.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .cancel({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const CancelResponseOperation =
  useOperation<CancelResponseOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CancelResponseOperation = Operation<
  typeof Key,
  CancelResponseInput,
  CancelResponseOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CancelResponseInput = {
  /**
   * The Maker as a Signer
   *
   * @defaultValue `convergence.identity()`
   */
  maker?: Signer;

  protocol: PublicKey;

  /** The address of the Rfq account. */
  rfq: PublicKey;

  response: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CancelResponseOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const cancelResponseOperationHandler: OperationHandler<CancelResponseOperation> =
  {
    handle: async (
      operation: CancelResponseOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CancelResponseOutput> => {
      scope.throwIfCanceled();

      return cancelResponseBuilder(
        convergence,
        operation.input,
        scope
      ).sendAndConfirm(convergence, scope.confirmOptions);
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CancelResponseBuilderParams = CancelResponseInput;

/**
 * Cancels an existing Response.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .cancel({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const cancelResponseBuilder = (
  convergence: Convergence,
  params: CancelResponseBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
  const { maker = convergence.identity(), protocol, rfq, response } = params;

  const rfqProgram = convergence.programs().getRfq(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createCancelResponseInstruction(
        {
          maker: maker.publicKey,
          protocol,
          rfq,
          response,
        },
        rfqProgram.address
      ),
      signers: [maker],
      key: 'cancelResponse',
    });
};
