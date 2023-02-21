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
import { convertResponseOutput, getPages } from '../helpers';

const Key = 'FindResponsesByRfqOperation' as const;

/**
 * Finds Responses for a given RFQ address.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findResponsesByRfq({
 *     address
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findResponsesByRfqOperation =
  useOperation<FindResponsesByRfqOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindResponsesByRfqOperation = Operation<
  typeof Key,
  FindResponsesByRfqInput,
  FindResponsesByRfqOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindResponsesByRfqInput = {
  /** The address of the Rfq. */
  address: PublicKey;

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
export type FindResponsesByRfqOutput = Response[][];

/**
 * @group Operations
 * @category Handlers
 */
export const findResponsesByRfqOperationHandler: OperationHandler<FindResponsesByRfqOperation> =
  {
    handle: async (
      operation: FindResponsesByRfqOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindResponsesByRfqOutput> => {
      const { programs } = scope;
      const {
        address,
        responses,
        responsesPerPage = 10,
        numPages,
      } = operation.input;
      scope.throwIfCanceled();

      if (responses) {
        let responsePages: Response[][] = [];
        const responsesByRfq: Response[] = [];

        for (let response of responses) {
          if (response.rfq.toBase58() === address.toBase58()) {
            response = convertResponseOutput(response);

            responsesByRfq.push(response);
          }
        }
        scope.throwIfCanceled();

        responsePages = getPages(responsesByRfq, responsesPerPage, numPages);

        return responsePages;
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
      scope.throwIfCanceled();

      return responsePages;
    },
  };
