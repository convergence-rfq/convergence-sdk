import { PublicKey } from '@solana/web3.js';
import { Rfq, toRfq } from '../models';
import { toRfqAccount } from '../accounts';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'FindRfqsByAddressesOperation' as const;

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
export const findRfqsByAddressesOperation =
  useOperation<FindRfqsByAddressesOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRfqsByAddressesOperation = Operation<
  typeof Key,
  FindRfqsByAddressesInput,
  FindRfqsByAddressesOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindRfqsByAddressesInput = {
  /** The address of the Rfq. */
  addresses: PublicKey[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRfqsByAddressesOutput = Rfq[];

/**
 * @group Operations
 * @category Handlers
 */
export const findRfqsByAddressesOperationHandler: OperationHandler<FindRfqsByAddressesOperation> =
  {
    handle: async (
      operation: FindRfqsByAddressesOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRfqsByAddressesOutput> => {
      const { addresses } = operation.input;
      const { commitment } = scope;
      scope.throwIfCanceled();

      const rfqs: Rfq[] = [];

      const accounts = await convergence
        .rpc()
        .getMultipleAccounts(addresses, commitment);

      for (const account of accounts) {
        const rfqAccount = toRfqAccount(account);
        const rfq = toRfq(rfqAccount);

        rfqs.push(rfq);
      }
      scope.throwIfCanceled();

      return rfqs;
    },
  };
