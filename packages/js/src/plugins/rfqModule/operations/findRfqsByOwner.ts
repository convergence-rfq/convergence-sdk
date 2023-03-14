import { PublicKey } from '@solana/web3.js';
import { Rfq, toRfq } from '../models';
import { RfqGpaBuilder } from '../RfqGpaBuilder';
import { convertRfqOutput, getPages } from '../helpers';
import { toRfqAccount } from '../accounts';
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

      const protocol = await convergence.protocol().get();
      const collateralMintDecimals = (
        await convergence
          .tokens()
          .findMintByAddress({ address: protocol.collateralMint })
      ).decimals;

      if (rfqs) {
        const rfqsByOwner: Rfq[] = [];

        for (const rfq of rfqs) {
          if (rfq.taker.toBase58() === owner.toBase58()) {
            const convertedRfq = convertRfqOutput(rfq, collateralMintDecimals);

            rfqsByOwner.push(convertedRfq);
          }
        }
        scope.throwIfCanceled();

        const pages = getPages(rfqsByOwner, rfqsPerPage, numPages);

        return pages;
      }

      const rfqProgram = convergence.programs().getRfq(programs);
      const rfqGpaBuilder = new RfqGpaBuilder(convergence, rfqProgram.address);
      const unparsedAccounts = await rfqGpaBuilder
        .withoutData()
        .whereTaker(owner)
        .get();
      scope.throwIfCanceled();

      const parsedRfqs: Rfq[] = [];

      // for (const unparsedAccount of unparsedAccounts) {
      //   const rfq = await convergence
      //     .rfqs()
      //     .findRfqByAddress({ address: unparsedAccount.publicKey });

      //   const convertedRfq = convertRfqOutput(rfq, collateralMintDecimals);

      //   parsedRfqs.push(convertedRfq);
      // }

      const unparsedAddresses = unparsedAccounts.map(
        (account) => account.publicKey
      );

      const accounts = await convergence
        .rpc()
        .getMultipleAccounts(unparsedAddresses, commitment);

      for (const account of accounts) {
        const rfq = toRfq(toRfqAccount(account));
        const convertedRfq = convertRfqOutput(rfq, collateralMintDecimals);

        parsedRfqs.push(convertedRfq);
      }
      scope.throwIfCanceled();

      const pages = getPages(parsedRfqs, rfqsPerPage, numPages);

      return pages;
    },
  };
