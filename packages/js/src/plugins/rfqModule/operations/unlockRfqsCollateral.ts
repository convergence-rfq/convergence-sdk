import { PublicKey } from '@solana/web3.js';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { unlockRfqCollateralBuilder } from './unlockRfqCollateral';

const Key = 'UnlockRfqsCollateralOperation' as const;

/**
 * Unlocks collateral for multiples Rfqs
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .unlockRfqsCollateral({ rfqs: [rfq.address, rfq2.address,...] });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const unlockRfqsCollateralOperation =
  useOperation<UnlockRfqsCollateralOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type UnlockRfqsCollateralOperation = Operation<
  typeof Key,
  UnlockRfqsCollateralInput,
  UnlockRfqsCollateralOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type UnlockRfqsCollateralInput = {
  /**
   * The protocol address.
   *
   * @defaultValue `convergence.protocol().pdas().protocol()`
   */
  protocol?: PublicKey;

  /** The address of the Rfq account. */
  rfqs: PublicKey[];

  /**
   * Optional address of the Taker's collateral info account.
   *
   * @defaultValue `convergence.collateral().pdas().collateralInfo({ user: rfq.taker })`
   *
   */
  collateralInfo?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type UnlockRfqsCollateralOutput = {
  responses: SendAndConfirmTransactionResponse[];
};

/**
 * @group Operations
 * @category Handlers
 */
export const unlockRfqsCollateralOperationHandler: OperationHandler<UnlockRfqsCollateralOperation> =
  {
    handle: async (
      operation: UnlockRfqsCollateralOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<UnlockRfqsCollateralOutput> => {
      const { rfqs } = operation.input;
      const builders = await Promise.all(
        rfqs.map((rfq) =>
          unlockRfqCollateralBuilder(
            convergence,
            {
              ...operation.input,
              rfq,
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
