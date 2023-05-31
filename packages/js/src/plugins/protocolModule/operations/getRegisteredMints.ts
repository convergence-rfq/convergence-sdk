import { RegisteredMint } from '../models';
import { Operation, OperationHandler, useOperation } from '../../../types';
import { Convergence } from '../../../Convergence';
import { registeredMintsCache } from '../cache';

const Key = 'GetRegisteredMintsOperation' as const;

/**
 * Gets protocol registered mints.
 *
 * ```ts
 * const rfq = await convergence
 *   .protocol()
 *   .getRegisteredMints();
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const getRegisteredMintsOperation =
  useOperation<GetRegisteredMintsOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type GetRegisteredMintsOperation = Operation<
  typeof Key,
  GetRegisteredMintsInput,
  GetRegisteredMintsOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type GetRegisteredMintsInput = {} | undefined;

/**
 * @group Operations
 * @category Outputs
 */
export type GetRegisteredMintsOutput = RegisteredMint[];

/**
 * @group Operations
 * @category Handlers
 */
export const getRegisteredMintsOperationHandler: OperationHandler<GetRegisteredMintsOperation> =
  {
    handle: async (
      _operation: GetRegisteredMintsOperation,
      convergence: Convergence
    ): Promise<GetRegisteredMintsOutput> => {
      return registeredMintsCache.get(convergence);
    },
  };
