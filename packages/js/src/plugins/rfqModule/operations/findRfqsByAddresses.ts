import { PublicKey } from '@solana/web3.js';
import { Rfq, toRfq } from '../models';
import { toRfqAccount } from '../accounts';
import { convertRfqOutput, getPages } from '../helpers';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

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
      const { addresses, rfqsPerPage, numPages } = operation.input;
      const { commitment } = scope;
      scope.throwIfCanceled();

      const rfqs: Rfq[] = [];

      const protocol = await convergence.protocol().get();
      const collateralMintDecimals = (
        await convergence
          .tokens()
          .findMintByAddress({ address: protocol.collateralMint })
      ).decimals;

      const accounts = await convergence
        .rpc()
        .getMultipleAccounts(addresses, commitment);

      for (const account of accounts) {
        const rfq = toRfq(toRfqAccount(account));

        const convertedRfq = convertRfqOutput(rfq, collateralMintDecimals);

        rfqs.push(convertedRfq);
      }
      scope.throwIfCanceled();

      const pages = getPages(rfqs, rfqsPerPage, numPages);

      return pages;
    },
  };
