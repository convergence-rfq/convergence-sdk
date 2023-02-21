import { StoredRfqState } from '@convergence-rfq/rfq';
import { Rfq } from '../models';
//@ts-ignore
import { toRfqAccount } from '../accounts';
import { RfqGpaBuilder } from '../RfqGpaBuilder';
import { getPages, convertRfqOutput } from '../helpers';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'FindRfqsByActiveOperation' as const;

/**
 * Finds all active RFQs.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findByActive();
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findRfqsByActiveOperation =
  useOperation<FindRfqsByActiveOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRfqsByActiveOperation = Operation<
  typeof Key,
  FindRfqsByActiveInput,
  FindRfqsByActiveOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindRfqsByActiveInput = {
  /** Optional array of Rfqs to search from. */
  rfqs?: Rfq[];

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
export type FindRfqsByActiveOutput = Rfq[][];

/**
 * @group Operations
 * @category Handlers
 */
export const findRfqsByActiveOperationHandler: OperationHandler<FindRfqsByActiveOperation> =
  {
    handle: async (
      operation: FindRfqsByActiveOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRfqsByActiveOutput> => {
      const { programs } = scope;
      const { rfqs, rfqsPerPage = 10, numPages } = operation.input;

      if (rfqs) {
        let rfqPages: Rfq[][] = [];
        const rfqsByActive: Rfq[] = [];

        for (let rfq of rfqs) {
          if (rfq.state == StoredRfqState.Active) {
            rfq = await convertRfqOutput(convergence, rfq);

            rfqsByActive.push(rfq);
          }
        }
        scope.throwIfCanceled();

        rfqPages = getPages(rfqsByActive, rfqsPerPage, numPages);

        return rfqPages;
      }

      const rfqProgram = convergence.programs().getRfq(programs);
      const rfqGpaBuilder = new RfqGpaBuilder(convergence, rfqProgram.address);
      const unparsedAccounts = await rfqGpaBuilder.withoutData().get();
      scope.throwIfCanceled();

      for (const unparsedAccount of unparsedAccounts) {
        let rfq = await convergence
          .rfqs()
          .findRfqByAddress({ address: unparsedAccount.publicKey });

        if (rfq.state != StoredRfqState.Active) {
          const index = unparsedAccounts.indexOf(unparsedAccount);
          unparsedAccounts.splice(index, 1);
        }
      }

      const pages = getPages(unparsedAccounts, rfqsPerPage, numPages);

      const rfqPages: Rfq[][] = [];

      for (const page of pages) {
        const rfqPage = [];

        for (const unparsedAccount of page) {
          let rfq = await convergence
            .rfqs()
            .findRfqByAddress({ address: unparsedAccount.publicKey });

          rfqPage.push(rfq);
        }
        if (rfqPage.length > 0) {
          rfqPages.push(rfqPage);
        }
      }

      return rfqPages;
    },
  };
