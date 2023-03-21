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

      const protocol = await convergence.protocol().get();
      const collateralMintDecimals = (
        await convergence
          .tokens()
          .findMintByAddress({ address: protocol.collateralMint })
      ).decimals;

      if (rfqs) {
        const rfqsByActive: Rfq[] = [];

        for (const rfq of rfqs) {
          if (rfq.state === StoredRfqState.Active) {
            const convertedRfq = convertRfqOutput(rfq, collateralMintDecimals);

            rfqsByActive.push(convertedRfq);
          }
        }

        const pages = getPages(rfqsByActive, rfqsPerPage, numPages);

        return pages;
      }

      const rfqProgram = convergence.programs().getRfq(programs);
      const rfqGpaBuilder = new RfqGpaBuilder(convergence, rfqProgram.address);
      const unparsedAccounts = await rfqGpaBuilder.withoutData().get();
      scope.throwIfCanceled();

      const unparsedAddresses = unparsedAccounts.map(
        (account) => account.publicKey
      );

      const accounts = await convergence
        .rpc()
        .getMultipleAccounts(unparsedAddresses, commitment);

      const parsedRfqs: Rfq[] = [];

      for (const account of accounts) {
        const rfq = toRfq(toRfqAccount(account));

        if (rfq.state === StoredRfqState.Active) {
          const convertedRfq = convertRfqOutput(rfq, collateralMintDecimals);

          parsedRfqs.push(convertedRfq);
        }
      }

      const pages = getPages(parsedRfqs, rfqsPerPage, numPages);

      return pages;
    },
  };
