import { PublicKey } from '@solana/web3.js';

import { toBaseAssetAccount } from '../accounts';
import { BaseAsset, toBaseAsset } from '../models/BaseAsset';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';

const Key = 'FindBaseAssetByAddressOperation' as const;

/**
 * Finds BaseAsset by a given address.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findBaseAssetByAddress({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findBaseAssetByAddressOperation =
  useOperation<FindBaseAssetByAddressOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindBaseAssetByAddressOperation = Operation<
  typeof Key,
  FindBaseAssetByAddressInput,
  FindBaseAssetByAddressOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindBaseAssetByAddressInput = {
  /** The pubkey address of the BaseAssetInfo account. */
  address: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindBaseAssetByAddressOutput = BaseAsset;

/**
 * @group Operations
 * @category Handlers
 */
export const findBaseAssetByAddressOperationHandler: OperationHandler<FindBaseAssetByAddressOperation> =
  {
    handle: async (
      operation: FindBaseAssetByAddressOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindBaseAssetByAddressOutput> => {
      const { commitment } = scope;
      const { address } = operation.input;
      scope.throwIfCanceled();

      const account = await convergence.rpc().getAccount(address, commitment);
      const baseAsset = toBaseAsset(toBaseAssetAccount(account));
      scope.throwIfCanceled();

      return baseAsset;
    },
  };
