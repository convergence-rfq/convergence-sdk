import { PublicKey } from '@solana/web3.js';

import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '../../../types';
import { cancelResponseBuilder } from './cancelResponse';

const Key = 'cancelResponsesOperation' as const;

/**
 * Cancel multiple response.
 *
 * ```ts
 * await convergence.
 *   rfqs()
 *   .cancelResponses({
 *     responses: [<publicKey>]
 * });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const cancelResponsesOperation =
  useOperation<CancelResponsesOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CancelResponsesOperation = Operation<
  typeof Key,
  CancelResponsesInput,
  CancelResponsesOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CancelResponsesInput = {
  /**
   * The addresses of the reponses.
   */
  responses: PublicKey[];

  /**
   * The maker as a signer.
   *
   * @defaultValue `convergence.identity()`
   */
  maker?: Signer;

  /**
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().get()`
   */
  protocol?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CancelResponsesOutput = {
  responses: SendAndConfirmTransactionResponse[];
};

/**
 * @group Operations
 * @category Handlers
 */
export const cancelResponsesOperationHandler: OperationHandler<CancelResponsesOperation> =
  {
    handle: async (
      operation: CancelResponsesOperation,
      convergence: Convergence,
      scope: OperationScope
    ) => {
      const { responses: rfqResponses } = operation.input;

      const builders = await Promise.all(
        rfqResponses.map((response) =>
          cancelResponseBuilder(
            convergence,
            {
              response,
              ...operation,
            },
            scope
          )
        )
      );

      const lastValidBlockHeight = await convergence.rpc().getLatestBlockhash();
      const signedTxs = await convergence
        .identity()
        .signAllTransactions(
          builders.map((b) => b.toTransaction(lastValidBlockHeight))
        );

      const responses = await Promise.all(
        signedTxs.map((signedTx) =>
          convergence
            .rpc()
            .serializeAndSendTransaction(signedTx, scope.confirmOptions)
        )
      );
      scope.throwIfCanceled();

      return { responses };
    },
  };
