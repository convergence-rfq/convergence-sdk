import { PublicKey } from '@solana/web3.js';
import { Response, toResponse } from '../models/Response';
import { toResponseAccount } from '../accounts';
import { ResponseGpaBuilder } from '../ResponseGpaBuilder';
import { convertResponseOutput, getPages } from '../helpers';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

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

  /** Optional number of Responses to return per page. */
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
      const { programs, commitment } = scope;
      const { address, responses, responsesPerPage, numPages } =
        operation.input;
      scope.throwIfCanceled();

      if (responses) {
        const responsesByRfq: Response[] = [];

        for (const response of responses) {
          if (response.rfq.toBase58() === address.toBase58()) {
            const rfq = await convergence
              .rfqs()
              .findRfqByAddress({ address: response.rfq });

            const convertedResponse = convertResponseOutput(
              response,
              rfq.quoteAsset.instrumentDecimals
            );

            responsesByRfq.push(convertedResponse);
          }
        }
        scope.throwIfCanceled();

        const pages = getPages(responsesByRfq, responsesPerPage, numPages);

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

      const accounts = await convergence
        .rpc()
        .getMultipleAccounts(unparsedAddresses, commitment);

      const parsedResponses: Response[] = [];

      for (const account of accounts) {
        const response = toResponse(toResponseAccount(account));

        if (response.rfq.toBase58() === address.toBase58()) {
          const rfq = await convergence
            .rfqs()
            .findRfqByAddress({ address: response.rfq });

          const convertedResponse = convertResponseOutput(
            response,
            rfq.quoteAsset.instrumentDecimals
          );

          parsedResponses.push(convertedResponse);
        }
      }

      const pages = getPages(parsedResponses, responsesPerPage, numPages);

      return pages;
    },
  };
