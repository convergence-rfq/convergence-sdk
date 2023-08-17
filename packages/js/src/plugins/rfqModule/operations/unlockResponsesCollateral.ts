import { PublicKey } from '@solana/web3.js';

import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { unlockResponseCollateralBuilder } from './unlockResponseCollateral';

const Key = 'unlockResponsesCollateralOperation' as const;

/**
 * Unlocks collateral for a Response
 *
 * ```ts
 * await convergence
 *   .rfqs()
 *   .unlockResponseCollateral({
 *     responses: [<publicKey>],
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const unlockResponsesCollateralOperation =
  useOperation<UnlockResponsesCollateralOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type UnlockResponsesCollateralOperation = Operation<
  typeof Key,
  UnlockResponsesCollateralInput,
  UnlockResponsesCollateralOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type UnlockResponsesCollateralInput = {
  /**
   * The response address.
   */
  responses: PublicKey[];

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
export type UnlockResponsesCollateralOutput = {
  responses: SendAndConfirmTransactionResponse[];
};

/**
 * @group Operations
 * @category Handlers
 */
export const unlockResponsesCollateralOperationHandler: OperationHandler<UnlockResponsesCollateralOperation> =
  {
    handle: async (
      operation: UnlockResponsesCollateralOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<UnlockResponsesCollateralOutput> => {
      const { responses: rfqResponses } = operation.input;

      const builders = await Promise.all(
        rfqResponses.map((response) =>
          unlockResponseCollateralBuilder(
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
            .serializeAndSendTransaction(
              signedTx,
              lastValidBlockHeight,
              scope.confirmOptions
            )
        )
      );
      scope.throwIfCanceled();

      return { responses };
    },
  };
