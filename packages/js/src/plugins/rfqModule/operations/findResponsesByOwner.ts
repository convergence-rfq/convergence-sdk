import { PublicKey } from '@solana/web3.js';

import { Response, toResponse } from '../models/Response';
import { Rfq } from '../models';
import { toResponseAccount } from '../accounts';
import { getPages, convertResponseOutput } from '../helpers';
import { ResponseGpaBuilder } from '../ResponseGpaBuilder';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';

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

  /** Optional number of Responses to return per page. */
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
      const { owner, responses, responsesPerPage, numPages } = operation.input;
      const { programs, commitment } = scope;
      scope.throwIfCanceled();

      if (responses) {
        const responsesByOwner: Response[] = [];

        for (const response of responses) {
          if (response.maker.toBase58() === owner.toBase58()) {
            const rfq = await convergence
              .rfqs()
              .findRfqByAddress({ address: response.rfq });

            const convertedResponse = convertResponseOutput(
              response,
              rfq.quoteAsset.instrumentDecimals
            );

            responsesByOwner.push(convertedResponse);
          }
        }
        scope.throwIfCanceled();

        const pages = getPages(responsesByOwner, responsesPerPage, numPages);

        return pages;
      }

      const rfqProgram = convergence.programs().getRfq(programs);
      const responseGpaBuilder = new ResponseGpaBuilder(
        convergence,
        rfqProgram.address
      );
      const unparsedAccounts = await responseGpaBuilder.withoutData().get();
      const unparsedAddresses = unparsedAccounts.map(
        (account) => account.publicKey
      );
      scope.throwIfCanceled();

      const callsToGetMultipleAccounts = Math.ceil(
        unparsedAddresses.length / 100
      );

      const parsedResponses: Response[] = [];

      const matchingResponses: Response[] = [];
      const matchingRfqPromises: Promise<Rfq>[] = [];

      for (let i = 0; i < callsToGetMultipleAccounts; i++) {
        const accounts = await convergence
          .rpc()
          .getMultipleAccounts(
            unparsedAddresses.slice(i * 100, (i + 1) * 100),
            commitment
          );

        for (const account of accounts) {
          const response = toResponse(toResponseAccount(account));

          if (response.maker.toBase58() === owner.toBase58()) {
            matchingResponses.push(response);
            matchingRfqPromises.push(
              convergence.rfqs().findRfqByAddress({ address: response.rfq })
            );
          }
        }
      }

      const matchingRfqs = await Promise.all(matchingRfqPromises);

      for (const matchingRfq of matchingRfqs) {
        for (const matchingResponse of matchingResponses)
          if (
            matchingResponse.rfq.toBase58() === matchingRfq.address.toBase58()
          ) {
            const convertedResponse = convertResponseOutput(
              matchingResponse,
              matchingRfq.quoteAsset.instrumentDecimals
            );

            parsedResponses.push(convertedResponse);
          }
      }

      const pages = getPages(parsedResponses, responsesPerPage, numPages);

      return pages;
    },
  };
