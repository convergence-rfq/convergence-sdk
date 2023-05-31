import { PublicKey } from '@solana/web3.js';

import { BaseAsset } from '../models/BaseAsset';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { baseAssetsCache } from '../cache';

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
      const { address } = operation.input;
      scope.throwIfCanceled();

      const baseAssets = await baseAssetsCache.get(convergence);
      const baseAsset = baseAssets.find((ba) => ba.address.equals(address));
      if (baseAsset === undefined) {
        throw Error(
          `Couldn't find Base Asset account at address ${address.toString()}`
        );
      }
      scope.throwIfCanceled();

      return baseAsset;
    },
  };
