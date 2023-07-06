import { PublicKey } from '@solana/web3.js';

import { Collateral, toCollateral } from '../models';
import { toCollateralAccount } from '../accounts';
import { CollateralGpaBuilder } from '../CollateralGpaBuilder';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { collateralMintCache } from '../cache';

const Key = 'FindCollateralByUserOperation' as const;

/**
 * Finds collateral account by a given owner.
 *
 * ```ts
 * const collateral = await convergence
 *   .collateral()
 *   .findByUser({ user: <publicKey> });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findCollateralByUserOperation =
  useOperation<FindCollateralByUserOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindCollateralByUserOperation = Operation<
  typeof Key,
  FindCollateralByUserInput,
  FindCollateralByUserOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindCollateralByUserInput = {
  /** The address of the user. */
  user: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindCollateralByUserOutput = Collateral;

/**
 * @group Operations
 * @category Handlers
 */
export const findCollateralByUserOperationHandler: OperationHandler<FindCollateralByUserOperation> =
  {
    handle: async (
      operation: FindCollateralByUserOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindCollateralByUserOutput> => {
      const { user } = operation.input;
      const { programs } = scope;

      const rfqProgram = convergence.programs().getRfq(programs);
      const gpaBuilder = new CollateralGpaBuilder(
        convergence,
        rfqProgram.address
      );

      const collateral = await gpaBuilder.whereUser(user).get();
      const collateralMint = await collateralMintCache.get(convergence);

      return collateral
        .map<Collateral | null>((account) => {
          if (account === null) {
            return null;
          }

          try {
            return toCollateral(toCollateralAccount(account), collateralMint);
          } catch (e) {
            return null;
          }
        })
        .filter(
          (collateral): collateral is Collateral => collateral !== null
        )[0];
    },
  };
