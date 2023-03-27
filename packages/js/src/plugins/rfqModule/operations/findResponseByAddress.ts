import { PublicKey } from '@solana/web3.js';

import { toResponseAccount } from '../accounts';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { ApiResponse, ApiRfq, toApiResponse } from '..';
import { collateralMintCache } from '../../collateralModule/cache';

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

// TODO add optional rfq address or model to pre-fetch it
/**
 * @group Operations
 * @category Inputs
 */
export type FindResponseByAddressInput = {
  /** The address of the Response account. */
  address: PublicKey;
  /** Pass already parsed rfq to avoid refetching of it */
  rfq: ApiRfq | null;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindResponseByAddressOutput = ApiResponse;

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
      const response = toResponseAccount(account);
      scope.throwIfCanceled();

      const collateralMint = await collateralMintCache.get(convergence);
      let { rfq } = operation.input;
      if (rfq == null) {
        rfq = await convergence
          .rfqs()
          .findRfqByAddress({ address: response.data.rfq });
      } else {
        if (response.data.rfq != rfq.address) {
          throw Error("Passed rfq doesn't match a response!");
        }
      }

      return toApiResponse(
        response,
        collateralMint.decimals,
        rfq.quoteAsset.instrumentDecimals
      );
    },
  };
