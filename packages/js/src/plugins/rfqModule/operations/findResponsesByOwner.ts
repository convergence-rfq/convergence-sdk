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

  responsesPerPage?: number;

  numPages?: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindResponsesByOwnerOutput = Response[] | Response[][];

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

      const responsesByowner: Response[] = [];

      if (responses) {
        for (let response of responses) {
          if (response.maker.toBase58() === owner.toBase58()) {
            response = convertResponseOutput(response);

            responsesByowner.push(response);
          }
        }
        scope.throwIfCanceled();

        return responsesByowner;
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
          if (response.maker.toBase58() === owner.toBase58()) {
            response = convertResponseOutput(response);
          }
        }
      }
      return responsePages;
    },
  };
