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
  rfqsPerPage?: number;

  numPages?: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRfqsByActiveOutput = Rfq[] | Rfq[][];

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
      const { rfqsPerPage = 10, numPages } = operation.input;

      const rfqProgram = convergence.programs().getRfq(programs);
      const rfqGpaBuilder = new RfqGpaBuilder(convergence, rfqProgram.address);
      const unparsedAccounts = await rfqGpaBuilder.withoutData().get();
      scope.throwIfCanceled();

      const pages = getPages(unparsedAccounts, rfqsPerPage, numPages);

      const rfqPages: Rfq[][] = [];

      for (const page of pages) {
        const rfqPage = [];

        for (const unparsedAccount of page) {
          rfqPage.push(
            await convergence
              .rfqs()
              .findRfqByAddress({ address: unparsedAccount.publicKey })
          );
        }

        rfqPages.push(rfqPage);
      }

      for (const rfqPage of rfqPages) {
        for (let rfq of rfqPage) {
          if (rfq.state == StoredRfqState.Active) {
            rfq = await convertRfqOutput(convergence, rfq);
          }
        }
      }

      if (rfqPages.length === 1) {
        return rfqPages.flat();
      }

      return rfqPages;
    },
  };
