import { PublicKey } from '@solana/web3.js';

import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { cleanUpResponseBuilder } from './cleanUpResponse';

const Key = 'cleanUpResponsesOperation' as const;

/**
 * Cleans up Rfq responses.
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .cleanUpResponses({
 *     rfq: <publicKey>,
 *     responses: <publicKey>,
 *     firstToPrepare: <publicKey>
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const cleanUpResponsesOperation =
  useOperation<CleanUpResponsesOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CleanUpResponsesOperation = Operation<
  typeof Key,
  CleanUpResponsesInput,
  CleanUpResponsesOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CleanUpResponsesInput = {
  /**
   * The maker public key address.
   */
  maker: PublicKey;

  /**
   * The address of the reponse accounts.
   */
  responses: PublicKey[];

  /**
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;

  /**
   * The address of the DAO.
   */
  dao?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CleanUpResponsesOutput = {};

/**
 * @group Operations
 * @category Handlers
 */
export const cleanUpResponsesOperationHandler: OperationHandler<CleanUpResponsesOperation> =
  {
    handle: async (
      operation: CleanUpResponsesOperation,
      convergence: Convergence,
      scope: OperationScope
    ) => {
      const { responses: rfqResponses } = operation.input;

      const builders = await Promise.all(
        rfqResponses.map((response) =>
          cleanUpResponseBuilder(
            convergence,
            { response, ...operation.input },
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
