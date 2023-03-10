import { PublicKey } from '@solana/web3.js';
import { Response } from '../models/Response';
import { ResponseGpaBuilder } from '../ResponseGpaBuilder';
import { getPages, convertResponseOutput } from '../helpers';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'FindResponsesByRfqsOperation' as const;

/**
 * Finds all Responses for each RFQ in a list of given RFQ addresses.
 *
 * ```ts
 * const responses = await convergence
 *   .rfqs()
 *   .findResponsesByRfqs({
 *     addresses: [rfq1.address, rfq2.address]
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findResponsesByRfqsOperation =
  useOperation<FindResponsesByRfqsOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindResponsesByRfqsOperation = Operation<
  typeof Key,
  FindResponsesByRfqsInput,
  FindResponsesByRfqsOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindResponsesByRfqsInput = {
  /** The addresses of the Rfqs. */
  addresses: PublicKey[];

  /** Optional array of Responses to search from. */
  responses?: Response[];

  /** Optional number of Responses to return per page. */
  responsesPerPage?: number;

  /** Optional number of pages to return. */
  numPages?: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindResponsesByRfqsOutput = Response[][];

/**
 * @group Operations
 * @category Handlers
 */
export const findResponsesByRfqsOperationHandler: OperationHandler<FindResponsesByRfqsOperation> =
  {
    handle: async (
      operation: FindResponsesByRfqsOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindResponsesByRfqsOutput> => {
      const { programs } = scope;
      const { addresses, responses, responsesPerPage, numPages } =
        operation.input;
      scope.throwIfCanceled();

      if (responses) {
        let responsePages: Response[][] = [];
        const responsesByRfqs: Response[] = [];

        for (const address of addresses) {
          for (let response of responses) {
            if (response.rfq.toBase58() === address.toBase58()) {
              const rfq = await convergence
                .rfqs()
                .findRfqByAddress({ address: response.rfq });

              response = convertResponseOutput(
                response,
                rfq.quoteAsset.instrumentDecimals
              );

              responsesByRfqs.push(response);
            }
          }
          scope.throwIfCanceled();

          responsePages = getPages(responsesByRfqs, responsesPerPage, numPages);

          return responsePages;
        }
      }

      const rfqProgram = convergence.programs().getRfq(programs);
      const responseGpaBuilder = new ResponseGpaBuilder(
        convergence,
        rfqProgram.address
      );
      const unparsedAccounts = await responseGpaBuilder.withoutData().get();
      scope.throwIfCanceled();

      const pages = getPages(unparsedAccounts, responsesPerPage, numPages);

      const responsePages: Response[][] = [];

      for (const address of addresses) {
        for (const page of pages) {
          const responsePage = [];

          for (const unparsedAccount of page) {
            let response = await convergence
              .rfqs()
              .findResponseByAddress({ address: unparsedAccount.publicKey });

            if (response.rfq.toBase58() === address.toBase58()) {
              const rfq = await convergence
                .rfqs()
                .findRfqByAddress({ address: response.rfq });

              response = convertResponseOutput(
                response,
                rfq.quoteAsset.instrumentDecimals
              );

              responsePage.push(response);
            }
          }
          if (responsePage.length > 0) {
            responsePages.push(responsePage);
          }
        }
      }

      return responsePages;
    },
  };
