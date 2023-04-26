import { PublicKey } from '@solana/web3.js';

import { Rfq, toRfq } from '../models';
import { RfqGpaBuilder } from '../RfqGpaBuilder';
import { convertRfqOutput, getPages, sortByActiveAndExpiry } from '../helpers';
import { toRfqAccount } from '../accounts';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { collateralMintCache } from '@/plugins/collateralModule';

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
  /** The address of the owner of the RFQ. */
  owner: PublicKey;

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
      const { programs, commitment } = scope;

      const collateralMint = await collateralMintCache.get(convergence);
      const collateralMintDecimals = collateralMint.decimals;

      if (rfqs) {
        let rfqsByOwner: Rfq[] = [];

        for (const rfq of rfqs) {
          if (rfq.taker.toBase58() === owner.toBase58()) {
            const convertedRfq = convertRfqOutput(rfq, collateralMintDecimals);

            rfqsByOwner.push(convertedRfq);
          }
        }
        scope.throwIfCanceled();

        rfqsByOwner = sortByActiveAndExpiry(rfqsByOwner);

        const pages = getPages(rfqsByOwner, rfqsPerPage, numPages);

        return pages;
      }

      const rfqProgram = convergence.programs().getRfq(programs);
      const rfqGpaBuilder = new RfqGpaBuilder(convergence, rfqProgram.address);
      const unparsedAccounts = await rfqGpaBuilder
        .withoutData()
        .whereTaker(owner)
        .get();
      const unparsedAddresses = unparsedAccounts.map(
        (account) => account.publicKey
      );
      scope.throwIfCanceled();

      const callsToGetMultipleAccounts = Math.ceil(
        unparsedAddresses.length / 100
      );

      let parsedRfqs: Rfq[] = [];

      for (let i = 0; i < callsToGetMultipleAccounts; i++) {
        const accounts = await convergence
          .rpc()
          .getMultipleAccounts(
            unparsedAddresses.slice(i * 100, (i + 1) * 100),
            commitment
          );

        for (const account of accounts) {
          const rfq = toRfq(toRfqAccount(account));
          const convertedRfq = convertRfqOutput(rfq, collateralMintDecimals);

          parsedRfqs.push(convertedRfq);
        }
      }
      scope.throwIfCanceled();

      parsedRfqs = sortByActiveAndExpiry(parsedRfqs);
      const pages = getPages(parsedRfqs, rfqsPerPage, numPages);

      return pages;
    },
  };
