import { PublicKey } from '@solana/web3.js';

import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { cleanUpRfqBuilder } from './cleanUpRfq';
import { SendAndConfirmTransactionResponse } from '@/plugins';

const Key = 'CleanUpRfqsOperation' as const;

/**
 * Cleans up Rfqs.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .cleanUpRfqs({
 *     rfqs: [<address>]
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const cleanUpRfqsOperation = useOperation<CleanUpRfqsOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CleanUpRfqsOperation = Operation<
  typeof Key,
  CleanUpRfqsInput,
  CleanUpRfqsOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CleanUpRfqsInput = {
  /** The address of the Rfq account. */
  rfqs: PublicKey[];

  /**
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CleanUpRfqsOutput = {
  responses: SendAndConfirmTransactionResponse[];
};

/**
 * @group Operations
 * @category Handlers
 */
export const cleanUpRfqsOperationHandler: OperationHandler<CleanUpRfqsOperation> =
  {
    handle: async (
      operation: CleanUpRfqsOperation,
      convergence: Convergence,
      scope: OperationScope
    ) => {
      const { rfqs } = operation.input;

      const builders = await Promise.all(
        rfqs.map((rfq) =>
          cleanUpRfqBuilder(
            convergence,
            {
              rfq,
              ...operation.input,
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
