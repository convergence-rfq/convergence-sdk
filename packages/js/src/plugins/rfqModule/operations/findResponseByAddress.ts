import { PublicKey } from '@solana/web3.js';

import { toResponseAccount } from '../accounts';
import { assertResponse, Response, toResponse } from '../models/Response';
import { convertResponseOutput } from '../helpers';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { collateralMintCache } from '../../collateralModule';

const Key = 'FindResponseByAddressOperation' as const;

/**
 * Finds Response by a given address.
 *
 * ```ts
 * await convergence
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
  /** The address of the Response account. */
  address: PublicKey;

  /** Optional flag for whether to convert the output to a human-readable format. */
  convert?: boolean;
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
      const { address, convert = true } = operation.input;
      scope.throwIfCanceled();

      const collateralMint = await collateralMintCache.get(convergence);
      const account = await convergence.rpc().getAccount(address, commitment);
      const response = toResponse(
        toResponseAccount(account),
        collateralMint.decimals
      );
      assertResponse(response);
      scope.throwIfCanceled();

      if (convert) {
        const rfq = await convergence
          .rfqs()
          .findRfqByAddress({ address: response.rfq });

        const convertedResponse = convertResponseOutput(
          response,
          rfq.quoteAsset.getDecimals()
        );

        return convertedResponse;
      }

      return response;
    },
  };
