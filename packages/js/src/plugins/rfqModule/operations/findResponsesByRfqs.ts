import { PublicKey } from '@solana/web3.js';
import { toResponseAccount } from '../accounts';
import { /*assertResponse,*/ Response, toResponse } from '../models/Response';
import { ResponseGpaBuilder } from '../ResponseGpaBuilder';
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
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindResponsesByRfqsOutput = Response[];

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
      const { addresses } = operation.input;
      scope.throwIfCanceled();

      const rfqProgram = convergence.programs().getRfq(programs);
      const responseGpaBuilder = new ResponseGpaBuilder(
        convergence,
        rfqProgram.address
      );
      const responseAccounts = await responseGpaBuilder.get();
      scope.throwIfCanceled();

      const responses = responseAccounts
        .map<Response | null>((account) => {
          if (account === null) {
            return null;
          }

          try {
            return toResponse(toResponseAccount(account));
          } catch (e) {
            return null;
          }
        })
        .filter((response): response is Response => response !== null);

      const foundResponses: Response[] = [];

      for (const address of addresses) {
        for (const response of responses) {
          if (response.rfq.toBase58() === address.toBase58()) {
            if (response.bid) {
              const parsedPriceQuoteAmountBps =
                (response.bid.priceQuote.amountBps as number) / 1_000_000_000;

              response.bid.priceQuote.amountBps = parsedPriceQuoteAmountBps;

              if (response.bid.__kind == 'Standard') {
                const parsedLegsMultiplierBps =
                  (response.bid.legsMultiplierBps as number) / 1_000_000_000;

                response.bid.legsMultiplierBps = parsedLegsMultiplierBps;
              }
            }
            if (response.ask) {
              const parsedPriceQuoteAmountBps =
                (response.ask.priceQuote.amountBps as number) / 1_000_000_000;

              response.ask.priceQuote.amountBps = parsedPriceQuoteAmountBps;

              if (response.ask.__kind == 'Standard') {
                const parsedLegsMultiplierBps =
                  (response.ask.legsMultiplierBps as number) / 1_000_000_000;

                response.ask.legsMultiplierBps = parsedLegsMultiplierBps;
              }
            }

            foundResponses.push(response);
          }
        }
      }
      return foundResponses;
    },
  };
