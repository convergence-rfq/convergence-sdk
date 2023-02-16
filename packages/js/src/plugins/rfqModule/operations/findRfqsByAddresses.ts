import { PublicKey } from '@solana/web3.js';
import { Rfq } from '../models';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';
import { convertRfqOutput, getPages } from '../helpers';
import { RfqGpaBuilder } from '../RfqGpaBuilder';

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

  rfqsPerPage?: number;

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
      const { programs } = scope;
      scope.throwIfCanceled();

      const rfqProgram = convergence.programs().getRfq(programs);
      const rfqGpaBuilder = new RfqGpaBuilder(convergence, rfqProgram.address);
      const unparsedAccounts = await rfqGpaBuilder.withoutData().get();
      scope.throwIfCanceled();

      const pages = getPages(unparsedAccounts, rfqsPerPage, numPages);

      const rfqPages: Rfq[][] = [];

      for (const page of pages) {
        const rfqPage = [];

        for (const unparsedAccount of page) {
          for (const address of addresses) {
            if (unparsedAccount.publicKey.toBase58() === address.toBase58()) {
              let rfq = await convergence
                .rfqs()
                .findRfqByAddress({ address: unparsedAccount.publicKey });

              rfq = await convertRfqOutput(convergence, rfq);
              rfqPage.push(rfq);
            }
          }
        }

        rfqPages.push(rfqPage);
      }

      scope.throwIfCanceled();

      return rfqPages;
    },
  };
