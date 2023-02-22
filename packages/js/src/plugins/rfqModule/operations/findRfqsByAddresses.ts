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
import { convertRfqOutput, getPages } from '../helpers';

const Key = 'FindRfqsByAddressesOperation' as const;

/**
 * Finds Rfqs corresponding to a list of addresses.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findByAddress({
 *     addresses: [rfq1.address, rfq2.address]
 *   });
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
  /** The addresses of the Rfqs. */
  addresses: PublicKey[];

  /** Optional number of RFQs to return per page.
   * @defaultValue `10`
   */
  rfqsPerPage?: number;

  /** Optional number of pages to return. */
  numPages?: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRfqsByAddressesOutput = Rfq[][];

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
      const { addresses, rfqsPerPage = 10, numPages } = operation.input;
      const { commitment } = scope;
      scope.throwIfCanceled();

      const rfqs: Rfq[] = [];

      const accounts = await convergence
        .rpc()
        .getMultipleAccounts(addresses, commitment);

      for (const account of accounts) {
        let rfq = toRfq(toRfqAccount(account));

        rfq = await convertRfqOutput(convergence, rfq);

        rfqs.push(rfq);
      }
      scope.throwIfCanceled();

      const rfqPages = getPages(rfqs, rfqsPerPage, numPages);

      return rfqPages;
    },
  };
