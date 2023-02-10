import { PublicKey } from '@solana/web3.js';
import { toResponseAccount } from '../accounts';
import { assertResponse, Response, toResponse } from '../models/Response';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'FindResponseByAddressOperation' as const;

/**
 * Finds Response by a given address.
 *
 * ```ts
 *
 * const { rfqResponse } =
 *   await convergence
 *     .rfqs()
 *     .respond(...)
 *
 * const rfq = await convergence
 *   .rfqs()
 *   .findResponseByAddress({
 *     address: rfqResponse.address
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findResponseByAddressOperation =
  useOperation<FindResponseByAddressOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindResponseByAddressOperation = Operation<
  typeof Key,
  FindResponseByAddressInput,
  FindResponseByAddressOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindResponseByAddressInput = {
  /** The address of the Response. */
  address: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindResponseByAddressOutput = Response;

/**
 * @group Operations
 * @category Handlers
 */
export const findResponseByAddressOperationHandler: OperationHandler<FindResponseByAddressOperation> =
  {
    handle: async (
      operation: FindResponseByAddressOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindResponseByAddressOutput> => {
      const { commitment } = scope;
      const { address } = operation.input;
      scope.throwIfCanceled();

      const account = await convergence.rpc().getAccount(address, commitment);
      const response = toResponse(toResponseAccount(account));
      assertResponse(response);
      scope.throwIfCanceled();

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

      return response;
    },
  };
