import { BaseAsset, toBaseAsset } from '../models';
import { toBaseAssetAccount } from '../accounts';
import { ProtocolGpaBuilder } from '../ProtocolGpaBuilder';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

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
      operation: GetBaseAssetsOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<GetBaseAssetsOutput> => {
      const { programs } = scope;

      const rfqProgram = convergence.programs().getRfq(programs);
      const protocolGpaBuilder = new ProtocolGpaBuilder(
        convergence,
        rfqProgram.address
      );
      const baseAssets = await protocolGpaBuilder.whereBaseAssets().get();
      scope.throwIfCanceled();

      return baseAssets
        .map<BaseAsset | null>((account) => {
          if (account === null) {
            return null;
          }

          try {
            return toBaseAsset(toBaseAssetAccount(account));
          } catch (e) {
            return null;
          }
        })
        .filter((baseAsset): baseAsset is BaseAsset => baseAsset !== null)
        .sort((a: BaseAsset, b: BaseAsset) => {
          return a.index.value - b.index.value;
        });
    },
  };
