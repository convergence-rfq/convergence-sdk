import { PublicKey } from '@solana/web3.js';

import { Response, toResponse } from '../models/Response';
import { ResponseGpaBuilder } from '../ResponseGpaBuilder';
import { getPages, convertResponseOutput } from '../helpers';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { toResponseAccount } from '../accounts';

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
      const { programs, commitment } = scope;
      const { addresses, responses, responsesPerPage, numPages } =
        operation.input;
      scope.throwIfCanceled();

      if (responses) {
        const responsesByRfqs: Response[] = [];

        for (const response of responses) {
          for (const address of addresses) {
            if (response.rfq.toBase58() === address.toBase58()) {
              const rfq = await convergence
                .rfqs()
                .findRfqByAddress({ address: response.rfq });

              const convertedResponse = convertResponseOutput(
                response,
                rfq.quoteAsset.getDecimals()
              );

              responsesByRfqs.push(convertedResponse);
            }
          }
          scope.throwIfCanceled();

          const pages = getPages(responsesByRfqs, responsesPerPage, numPages);

          return pages;
        }
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

      for (let i = 0; i < callsToGetMultipleAccounts; i++) {
        const accounts = await convergence
          .rpc()
          .getMultipleAccounts(
            unparsedAddresses.slice(i * 100, (i + 1) * 100),
            commitment
          );

        for (const account of accounts) {
          const response = toResponse(toResponseAccount(account));

          for (const address of addresses) {
            if (response.rfq.toBase58() === address.toBase58()) {
              const rfq = await convergence
                .rfqs()
                .findRfqByAddress({ address: response.rfq });

              const convertedResponse = convertResponseOutput(
                response,
                rfq.quoteAsset.getDecimals()
              );

              parsedResponses.push(convertedResponse);
            }
          }
        }
      }
      scope.throwIfCanceled();

      const pages = getPages(parsedResponses, responsesPerPage, numPages);

      return pages;
    },
  };
