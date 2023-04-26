import { Protocol } from '../models';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { protocolCache } from '../cache';

const Key = 'GetProtocolOperation' as const;

/**
 * Finds Rfq by a given address.
 *
 * ```ts
 * const rfq = await convergence
 *   .protocol()
 *   .get();
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const getProtocolOperation = useOperation<GetProtocolOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type GetProtocolOperation = Operation<
  typeof Key,
  GetProtocolInput,
  GetProtocolOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type GetProtocolInput = {} | undefined;

/**
 * @group Operations
 * @category Outputs
 */
export type GetProtocolOutput = Protocol;

/**
 * @group Operations
 * @category Handlers
 */
export const getProtocolOperationHandler: OperationHandler<GetProtocolOperation> =
  {
    handle: async (
      operation: GetProtocolOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<GetProtocolOutput> => {
      const protocol = await protocolCache.get(convergence);
      scope.throwIfCanceled();

      return protocol;
    },
  };
