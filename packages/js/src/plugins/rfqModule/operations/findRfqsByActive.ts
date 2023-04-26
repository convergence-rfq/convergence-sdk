import { StoredRfqState } from '@convergence-rfq/rfq';

import { Rfq, toRfq } from '../models';
import { toRfqAccount } from '../accounts';
import { RfqGpaBuilder } from '../RfqGpaBuilder';
import { getPages, convertRfqOutput } from '../helpers';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { collateralMintCache } from '@/plugins/collateralModule';

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

  /** Optional number of RFQs to return per page. */
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
      const { programs, commitment } = scope;
      const { rfqs, rfqsPerPage, numPages } = operation.input;

      const collateralMint = await collateralMintCache.get(convergence);
      const collateralMintDecimals = collateralMint.decimals;

      if (rfqs) {
        const rfqsByActive: Rfq[] = [];

        for (const rfq of rfqs) {
          if (rfq.state === StoredRfqState.Active) {
            const convertedRfq = convertRfqOutput(rfq, collateralMintDecimals);

            rfqsByActive.push(convertedRfq);
          }
        }

        rfqsByActive.sort((a, b) => {
          const aTimeToExpiry = Number(a.creationTimestamp) + a.activeWindow;
          const bTimeToExpiry = Number(b.creationTimestamp) + b.activeWindow;
          return aTimeToExpiry - bTimeToExpiry;
        });

        const pages = getPages(rfqsByActive, rfqsPerPage, numPages);

        return pages;
      }

      const rfqProgram = convergence.programs().getRfq(programs);
      const rfqGpaBuilder = new RfqGpaBuilder(convergence, rfqProgram.address);
      const unparsedAccounts = await rfqGpaBuilder
        .withoutData()
        // .whereState(StoredRfqState.Active)
        .get();
      const unparsedAddresses = unparsedAccounts.map(
        (account) => account.publicKey
      );
      scope.throwIfCanceled();

      const callsToGetMultipleAccounts = Math.ceil(
        unparsedAddresses.length / 100
      );

      const parsedRfqs: Rfq[] = [];

      for (let i = 0; i < callsToGetMultipleAccounts; i++) {
        const accounts = await convergence
          .rpc()
          .getMultipleAccounts(
            unparsedAddresses.slice(i * 100, (i + 1) * 100),
            commitment
          );

        for (const account of accounts) {
          const rfq = toRfq(toRfqAccount(account));

          if (rfq.state === StoredRfqState.Active) {
            const convertedRfq = convertRfqOutput(rfq, collateralMintDecimals);

            parsedRfqs.push(convertedRfq);
          }
        }
      }

      parsedRfqs.sort((a, b) => {
        const aTimeToExpiry = Number(a.creationTimestamp) + a.activeWindow;
        const bTimeToExpiry = Number(b.creationTimestamp) + b.activeWindow;
        return aTimeToExpiry - bTimeToExpiry;
      });

      const pages = getPages(parsedRfqs, rfqsPerPage, numPages);

      return pages;
    },
  };
