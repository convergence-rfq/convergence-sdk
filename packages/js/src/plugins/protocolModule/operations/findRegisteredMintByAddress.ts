import { PublicKey } from '@solana/web3.js';

import { RegisteredMint } from '../models/RegisteredMint';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { registeredMintsCache } from '../cache';

const Key = 'FindRegisteredMintByAddressOperation' as const;

/**
 * Finds RegisteredMint by a given address.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .findRegisteredMintByAddress({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findRegisteredMintByAddressOperation =
  useOperation<FindRegisteredMintByAddressOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRegisteredMintByAddressOperation = Operation<
  typeof Key,
  FindRegisteredMintByAddressInput,
  FindRegisteredMintByAddressOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindRegisteredMintByAddressInput = {
  /** The address of the RegisteredMint. */
  address: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRegisteredMintByAddressOutput = RegisteredMint;

/**
 * @group Operations
 * @category Handlers
 */
export const findRegisteredMintByAddressOperationHandler: OperationHandler<FindRegisteredMintByAddressOperation> =
  {
    handle: async (
      operation: FindRegisteredMintByAddressOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindRegisteredMintByAddressOutput> => {
      const { address } = operation.input;

      const mintInfos = await registeredMintsCache.get(convergence);
      scope.throwIfCanceled();

      const mintInfo = mintInfos.find((mintInfo) =>
        mintInfo.address.equals(address)
      );
      if (mintInfo === undefined) {
        throw Error(
          `Missing registered mint by the address ${address.toString()}`
        );
      }
      return mintInfo;
    },
  };
