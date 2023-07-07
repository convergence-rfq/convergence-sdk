import { PublicKey } from '@solana/web3.js';

import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Signer,
} from '../../../types';
import { cancelRfqBuilder } from './cancelRfq';
import { SendAndConfirmTransactionResponse } from '@/plugins';

const Key = 'CancelRfqsOperation' as const;

/**
 * Cancels existing Rfqs.
 *
 * ```ts
 *
 * await convergence
 *   .rfqs()
 *   .cancelRfqs({ rfqs: [<address>] });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const cancelRfqsOperation = useOperation<CancelRfqsOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CancelRfqsOperation = Operation<
  typeof Key,
  CancelRfqsInput,
  CancelRfqsOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CancelRfqsInput = {
  /** The address of the Rfq account. */
  rfqs: PublicKey[];

  /**
   * The Taker of the Rfq as a Signer.
   *
   * @defaultValue `convergence.identity()`
   */
  taker?: Signer;

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
export type CancelRfqsOutput = {
  responses: SendAndConfirmTransactionResponse[];
};

/**
 * @group Operations
 * @category Handlers
 */
export const cancelRfqsOperationHandler: OperationHandler<CancelRfqsOperation> =
  {
    handle: async (
      operation: CancelRfqsOperation,
      convergence: Convergence,
      scope: OperationScope
    ) => {
      const { rfqs } = operation.input;

      const builders = await Promise.all(
        rfqs.map((rfq) =>
          cancelRfqBuilder(convergence, { rfq, ...operation.input }, scope)
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
