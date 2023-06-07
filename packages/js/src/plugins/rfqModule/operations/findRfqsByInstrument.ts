import { Rfq, toRfq } from '../models';
import { toRfqAccount } from '../accounts';
import { convertRfqOutput, getPages, sortByActiveAndExpiry } from '../helpers';
import { RfqGpaBuilder } from '../RfqGpaBuilder';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  Program,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { collateralMintCache } from '../../collateralModule';

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

  /** Optional number of RFQs to return per page. */
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
      const { rfqs, instrumentProgram, rfqsPerPage, numPages } =
        operation.input;
      const { commitment } = scope;

      const collateralMint = await collateralMintCache.get(convergence);
      const collateralMintDecimals = collateralMint.decimals;

      if (rfqs) {
        let rfqsByInstrument: Rfq[] = [];

        for (const rfq of rfqs) {
          for (const leg of rfq.legs) {
            if (leg.getProgramId().equals(instrumentProgram.address)) {
              const convertedRfq = convertRfqOutput(
                rfq,
                collateralMintDecimals
              );

              rfqsByInstrument.push(convertedRfq);

              break;
            }
          }
        }
        scope.throwIfCanceled();

        rfqsByInstrument = sortByActiveAndExpiry(rfqsByInstrument);

        const pages = getPages(rfqsByInstrument, rfqsPerPage, numPages);

        return pages;
      }

      const rfqProgram = convergence.programs().getRfq(scope.programs);
      const rfqGpaBuilder = new RfqGpaBuilder(convergence, rfqProgram.address);
      const unparsedAccounts = await rfqGpaBuilder.withoutData().get();
      scope.throwIfCanceled();

      const unparsedAddresses = unparsedAccounts.map(
        (account) => account.publicKey
      );

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
          const rfq = toRfqAccount(account);

          for (const leg of rfq.data.legs) {
            if (
              leg.instrumentProgram.toBase58() ===
              instrumentProgram.address.toBase58()
            ) {
              const convertedRfq = convertRfqOutput(
                await toRfq(convergence, rfq),
                collateralMintDecimals
              );

              parsedRfqs.push(convertedRfq);

              break;
            }
          }
        }
      }

      parsedRfqs = sortByActiveAndExpiry(parsedRfqs);

      const pages = getPages(parsedRfqs, rfqsPerPage, numPages);

      return pages;
    },
  };
