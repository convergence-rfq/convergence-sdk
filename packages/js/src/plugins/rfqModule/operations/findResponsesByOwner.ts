import { PublicKey } from '@solana/web3.js';
import { Response } from '../models/Response';
import { getPages, convertResponseOutput } from '../helpers';
import { ResponseGpaBuilder } from '../ResponseGpaBuilder';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'FindResponsesByOwnerOperation' as const;

/**
 * Finds all Responses for a given maker (owner).
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findResponsesByOwner({
 *     address: maker.publicKey
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findResponsesByOwnerOperation =
  useOperation<FindResponsesByOwnerOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindResponsesByOwnerOperation = Operation<
  typeof Key,
  FindResponsesByOwnerInput,
  FindResponsesByOwnerOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindResponsesByOwnerInput = {
  /** The address of the Maker (owner) of the Response(s). */
  owner: PublicKey;

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
export type FindResponsesByOwnerOutput = Response[][];

/**
 * @group Operations
 * @category Handlers
 */
export const findResponsesByOwnerOperationHandler: OperationHandler<FindResponsesByOwnerOperation> =
  {
    handle: async (
      operation: FindResponsesByOwnerOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindResponsesByOwnerOutput> => {
      const {
        owner,
        responses,
        responsesPerPage = 10,
        numPages,
      } = operation.input;
      scope.throwIfCanceled();

      if (responses) {
        let responsePages: Response[][] = [];
        const responsesByOwner: Response[] = [];

        for (let response of responses) {
          if (response.maker.toBase58() === owner.toBase58()) {
            response = convertResponseOutput(response);

            responsesByOwner.push(response);
          }
        }
        scope.throwIfCanceled();

        responsePages = getPages(responsesByOwner, responsesPerPage, numPages);

        return responsePages;
      }

      const gpaBuilder = new ResponseGpaBuilder(
        convergence,
        convergence.programs().getRfq().address
      );
      const unparsedAccounts = await gpaBuilder.withoutData().get();
      scope.throwIfCanceled();

      const pages = getPages(unparsedAccounts, responsesPerPage, numPages);

      const responsePages: Response[][] = [];

      for (const page of pages) {
        const responsePage = [];

        for (const unparsedAccount of page) {
          let response = await convergence
            .rfqs()
            .findResponseByAddress({ address: unparsedAccount.publicKey });

          if (response.maker.toBase58() === owner.toBase58()) {
            response = convertResponseOutput(response);

            responsePage.push(response);
          }
        }

        if (responsePage.length > 0) {
          responsePages.push(responsePage);
        }
      }

      return responsePages;
    },
  };
