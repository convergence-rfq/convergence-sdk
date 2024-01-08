import { PublicKey } from '@solana/web3.js';

import { Whitelist, toWhitelist } from '../models';

import { Convergence } from '../../../Convergence';
import { toWhitelistAccount } from '../account';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';

const Key = 'FindWhitelistByAddressOperation' as const;

/**
 * Finds Whitelist by a given address.
 *
 * ```ts
 * const whitelist = await convergence
 *   .whitelist()
 *   .findWhitelistByAddress({ address });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findWhitelistByAddressOperation =
  useOperation<FindWhitelistByAddressOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindWhitelistByAddressOperation = Operation<
  typeof Key,
  FindWhitelistByAddressInput,
  FindWhitelistByAddressOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindWhitelistByAddressInput = {
  /** The address of the Rfq. */
  address: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindWhitelistByAddressOutput = Whitelist;

/**
 * @group Operations
 * @category Handlers
 */
export const findWhitelistByAddressOperationHandler: OperationHandler<FindWhitelistByAddressOperation> =
  {
    handle: async (
      operation: FindWhitelistByAddressOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindWhitelistByAddressOutput> => {
      const { commitment } = scope;
      const { address } = operation.input;
      scope.throwIfCanceled();

      const account = await convergence.rpc().getAccount(address, commitment);
      const whitelist = toWhitelist(toWhitelistAccount(account));
      scope.throwIfCanceled();

      return whitelist;
    },
  };
