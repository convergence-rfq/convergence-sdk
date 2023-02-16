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

  responses?: Response[];

  responsesPerPage?: number;

  numPages?: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindResponsesByRfqOutput = Response[] | Response[][];

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

      const responsesByRfq: Response[] = [];

      if (responses) {
        for (let response of responses) {
          if (response.rfq.toBase58() === address.toBase58()) {
            response = convertResponseOutput(response);

            responsesByRfq.push(response);
          }
        }
        return responsesByRfq;
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
          responsePage.push(
            await convergence
              .rfqs()
              .findResponseByAddress({ address: unparsedAccount.publicKey })
          );
        }

        responsePages.push(responsePage);
      }

      for (const responsePage of responsePages) {
        for (let response of responsePage) {
          if (response.rfq.toBase58() === address.toBase58()) {
            response = convertResponseOutput(response);
          }
        }
      }
      scope.throwIfCanceled();

      return responsePages;
    },
  };
