import { PublicKey } from '@solana/web3.js';
import { toResponseAccount } from '../accounts';
import { Response, toResponse } from '../models/Response';
import { GpaBuilder } from '@/utils';
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
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindResponsesByOwnerOutput = Response[];

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
      const { owner, responses } = operation.input;
      scope.throwIfCanceled();

      const responsesByowner: Response[] = [];

      if (responses) {
        for (const response of responses) {
          if (response.maker.toBase58() === owner.toBase58()) {
            responsesByowner.push(response);
          }
        }
        scope.throwIfCanceled();

        return responsesByowner;
      }
      const gpaBuilder = new GpaBuilder(
        convergence,
        convergence.programs().getRfq().address
      );
      const unparsedAccounts = await gpaBuilder.get();
      const responseAccounts = unparsedAccounts
        .map<Response | null>((account) => {
          if (account == null) {
            return null;
          }
          try {
            return toResponse(toResponseAccount(account));
          } catch (e) {
            return null;
          }
        })
        .filter((response): response is Response => response != null);
      for (const response of responseAccounts) {
        if (response.maker.toBase58() === owner.toBase58()) {
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

          responsesByowner.push(response);
        }
      }
      scope.throwIfCanceled();

      return responsesByowner;
    },
  };
