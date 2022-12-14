import { PublicKey } from '@solana/web3.js';
import { Rfq, toRfq } from '../models';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';
import { toRfqAccount } from '../accounts';

const Key = 'FindRfqByAddressOperation' as const;

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
export const findRfqByAddressOperation =
  useOperation<FindRfqByAddressOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRfqByAddressOperation = Operation<
  typeof Key,
  FindRfqByAddressInput,
  FindRfqByAddressOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindRfqByAddressInput = {
  /** The address of the Rfq. */
  rfq: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRfqByAddressOutput = Rfq;

/**
 * @group Operations
 * @category Handlers
 */
export const findRfqByAddressOperationHandler: OperationHandler<FindRfqByAddressOperation> =
  {
    handle: async (
      operation: FindRfqByAddressOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRfqByAddressOutput> => {
      const { commitment } = scope;
      const { rfq } = operation.input;
      scope.throwIfCanceled();

      const account = toRfqAccount(
        await convergence.rpc().getAccount(rfq, commitment)
      );
      scope.throwIfCanceled();

      return toRfq(account);
    },
  };
