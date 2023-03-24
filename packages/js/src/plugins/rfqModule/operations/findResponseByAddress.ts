import { PublicKey } from '@solana/web3.js';

import { toResponseAccount, toRfqAccount } from '../accounts';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { ApiResponse, toApiResponse } from '..';

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

      // TODO add caching to protocol and collateral meta
      const protocolModel = await convergence.protocol().get();
      const collateralDecimals = (
        await convergence
          .tokens()
          .findMintByAddress({ address: protocolModel.collateralMint })
      ).decimals;
      const rfq = await convergence
        .rfqs()
        .findRfqByAddress({ address: response.data.rfq });

      return toApiResponse(
        response,
        collateralDecimals,
        rfq.quoteAsset.instrumentDecimals
      );
    },
  };
