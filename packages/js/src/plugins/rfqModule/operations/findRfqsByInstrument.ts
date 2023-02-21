import { Rfq } from '../models';
import { convertRfqOutput, getPages } from '../helpers';
import { RfqGpaBuilder } from '../RfqGpaBuilder';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Program,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'FindRfqsByInstrumentOperation' as const;

/**
 * Finds all RFQs corresponding to a given instrument program address.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findByInstrument({ instrumentProgram: SpotInstrumentProgram };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findRfqsByInstrumentOperation =
  useOperation<FindRfqsByInstrumentOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRfqsByInstrumentOperation = Operation<
  typeof Key,
  FindRfqsByInstrumentInput,
  FindRfqsByInstrumentOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindRfqsByInstrumentInput = {
  /** Optional array of RFQs to search through. */
  rfqs?: Rfq[];

  /** The instrument program to search for. */
  instrumentProgram: Program;

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
export type FindRfqsByInstrumentOutput = Rfq[][];

/**
 * @group Operations
 * @category Handlers
 */
export const findRfqsByInstrumentOperationHandler: OperationHandler<FindRfqsByInstrumentOperation> =
  {
    handle: async (
      operation: FindRfqsByInstrumentOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRfqsByInstrumentOutput> => {
      const {
        rfqs,
        instrumentProgram,
        rfqsPerPage = 10,
        numPages,
      } = operation.input;

      //TODO: this has no pagination
      if (rfqs) {
        let rfqPages: Rfq[][] = [];
        const rfqsByInstrument: Rfq[] = [];

        for (let rfq of rfqs) {
          for (const leg of rfq.legs) {
            if (
              leg.instrumentProgram.toBase58() ===
              instrumentProgram.address.toBase58()
            ) {
              rfq = await convertRfqOutput(convergence, rfq);

              rfqsByInstrument.push(rfq);
            }
          }
        }
        scope.throwIfCanceled();

        rfqPages = getPages(rfqsByInstrument, rfqsPerPage, numPages);

        return rfqPages;
      }

      const rfqProgram = convergence.programs().getRfq(scope.programs);
      const rfqGpaBuilder = new RfqGpaBuilder(convergence, rfqProgram.address);
      const unparsedAccounts = await rfqGpaBuilder.withoutData().get();
      scope.throwIfCanceled();

      for (const unparsedAccount of unparsedAccounts) {
        let rfq = await convergence
          .rfqs()
          .findRfqByAddress({ address: unparsedAccount.publicKey });

        for (const leg of rfq.legs) {
          if (
            leg.instrumentProgram.toBase58() !=
            instrumentProgram.address.toBase58()
          ) {
            const index = unparsedAccounts.indexOf(unparsedAccount);
            unparsedAccounts.splice(index, 1);
          }
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
