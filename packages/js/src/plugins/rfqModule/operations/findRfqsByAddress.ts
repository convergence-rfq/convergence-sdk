import { PublicKey } from '@solana/web3.js';
import { Rfq } from '../models';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'FindRfqsByAddressOperation' as const;

/**
 * Finds Rfq by a given address.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findByAddress({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findRfqsByAddressOperation =
  useOperation<FindRfqsByAddressOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRfqsByAddressOperation = Operation<
  typeof Key,
  FindRfqsByAddressInput,
  FindRfqsByAddressOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindRfqsByAddressInput = {
  /** The address of the Rfq. */
  addresses: PublicKey[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRfqsByAddressOutput = Rfq;

/**
 * @group Operations
 * @category Handlers
 */
export const findRfqByAddressOperationHandler: OperationHandler<FindRfqsByAddressOperation> =
  {
    handle: async (
      operation: FindRfqsByAddressOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRfqsByAddressOutput> => {
      const { addresses } = operation.input;

      scope.throwIfCanceled();

      const rfq = await convergence.rfqs().findByAddress({ addresses }, scope);
      scope.throwIfCanceled();

      return rfq;
    },
  };
