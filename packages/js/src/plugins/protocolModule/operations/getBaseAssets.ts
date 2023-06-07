import { BaseAsset } from '../models';
import { Operation, OperationHandler, useOperation } from '../../../types';
import { Convergence } from '../../../Convergence';
import { baseAssetsCache } from '../cache';

const Key = 'GetBaseAssetsOperation' as const;

/**
 * Finds Rfq by a given address.
 *
 * ```ts
 * const rfq = await convergence
 *   .protocol()
 *   .getBaseAssets();
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const getBaseAssetsOperation = useOperation<GetBaseAssetsOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type GetBaseAssetsOperation = Operation<
  typeof Key,
  GetBaseAssetsInput,
  GetBaseAssetsOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type GetBaseAssetsInput = {} | undefined;

/**
 * @group Operations
 * @category Outputs
 */
export type GetBaseAssetsOutput = BaseAsset[];

/**
 * @group Operations
 * @category Handlers
 */
export const getBaseAssetsOperationHandler: OperationHandler<GetBaseAssetsOperation> =
  {
    handle: async (
      _operation: GetBaseAssetsOperation,
      convergence: Convergence
    ): Promise<GetBaseAssetsOutput> => {
      return await baseAssetsCache.get(convergence);
    },
  };
