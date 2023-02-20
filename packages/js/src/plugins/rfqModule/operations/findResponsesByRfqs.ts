import { PublicKey } from '@solana/web3.js';
// import { toResponseAccount } from '../accounts';
import { /*assertResponse,*/ Response } from '../models/Response';
import { ResponseGpaBuilder } from '../ResponseGpaBuilder';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';
import { getPages, convertResponseOutput } from '../helpers';

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

  /** Optional number of Responses to return per page.
   * @defaultValue `10`
   */
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
      const {
        addresses,
        responses,
        responsesPerPage = 10,
        numPages,
      } = operation.input;
      scope.throwIfCanceled();

      const responsesByRfqs: Response[] = [];

      if (responses) {
        for (const address of addresses) {
          for (let response of responses) {
            if (response.rfq.toBase58() === address.toBase58()) {
              response = convertResponseOutput(response);

              responsesByRfqs.push(response);
            }
          }
          scope.throwIfCanceled();

          return [responsesByRfqs];
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
              response = convertResponseOutput(response);

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
