import { PublicKey } from '@solana/web3.js';
import { Collateral, toCollateral } from '../models';
import { toCollateralAccount } from '../accounts';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'FindCollateralByAddressOperation' as const;

/**
 * Finds Collateral by a given address.
 *
 * ```ts
 * const collateral = await convergence
 *   .collateral()
 *   .findByAddress({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findCollateralByAddressOperation =
  useOperation<FindCollateralByAddressOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindCollateralByAddressOperation = Operation<
  typeof Key,
  FindCollateralByAddressInput,
  FindCollateralByAddressOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindCollateralByAddressInput = {
  /** The address of the Collateral account. */
  address: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindCollateralByAddressOutput = Collateral;

/**
 * @group Operations
 * @category Handlers
 */
export const findCollateralByAddressOperationHandler: OperationHandler<FindCollateralByAddressOperation> =
  {
    handle: async (
      operation: FindCollateralByAddressOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindCollateralByAddressOutput> => {
      const { commitment } = scope;
      const { address } = operation.input;
      scope.throwIfCanceled();

      const account = await convergence.rpc().getAccount(address, commitment);
      const collateral = toCollateral(toCollateralAccount(account));
      scope.throwIfCanceled();

      return collateral;
    },
  };
