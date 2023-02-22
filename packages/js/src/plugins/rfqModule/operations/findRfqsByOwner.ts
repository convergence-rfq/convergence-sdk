import { PublicKey } from '@solana/web3.js';
import { Rfq /*toRfq*/ } from '../models';
//@ts-ignore
import { toRfqAccount } from '../accounts';
import { RfqGpaBuilder } from '../RfqGpaBuilder';
import { convertRfqOutput, getPages } from '../helpers';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'FindRfqsByOwnerOperation' as const;

/**
 * Finds multiple RFQs by a given owner.
 *
 * ```ts
 * const rfqs = await convergence
 *   .rfqs()
 *   .findAllByOwner({ owner: taker.publicKey };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findRfqsByOwnerOperation =
  useOperation<FindRfqsByOwnerOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRfqsByOwnerOperation = Operation<
  typeof Key,
  FindRfqsByOwnerInput,
  FindRfqsByOwnerOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindRfqsByOwnerInput = {
  /** The address of the owner. */
  owner: PublicKey;

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
export type FindRfqsByOwnerOutput = Rfq[][];

/**
 * @group Operations
 * @category Handlers
 */
export const findRfqsByOwnerOperationHandler: OperationHandler<FindRfqsByOwnerOperation> =
  {
    handle: async (
      operation: FindRfqsByOwnerOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRfqsByOwnerOutput> => {
      const { owner, rfqs, rfqsPerPage, numPages } = operation.input;
      const { programs } = scope;

      if (rfqs) {
        let rfqPages: Rfq[][] = [];
        const rfqsByOwner: Rfq[] = [];

        for (let rfq of rfqs) {
          if (rfq.taker.toBase58() === owner.toBase58()) {
            rfq = await convertRfqOutput(convergence, rfq);

            rfqsByOwner.push(rfq);
          }
        }
        scope.throwIfCanceled();

        rfqPages = getPages(rfqsByOwner, rfqsPerPage, numPages);

        return rfqPages;
      }

      const rfqProgram = convergence.programs().getRfq(programs);
      const rfqGpaBuilder = new RfqGpaBuilder(convergence, rfqProgram.address);
      const unparsedAccounts = await rfqGpaBuilder
        .withoutData()
        .whereTaker(owner)
        .get();
      scope.throwIfCanceled();

      const pages = getPages(unparsedAccounts, rfqsPerPage, numPages);

      const rfqPages: Rfq[][] = [];

      for (const page of pages) {
        const rfqPage = [];

        for (const unparsedAccount of page) {
          let rfq = await convergence
            .rfqs()
            .findRfqByAddress({ address: unparsedAccount.publicKey });

          rfq = await convertRfqOutput(convergence, rfq);

          rfqPage.push(rfq);
        }
        if (rfqPage.length > 0) {
          rfqPages.push(rfqPage);
        }
      }

      return rfqPages;
    },
  };
