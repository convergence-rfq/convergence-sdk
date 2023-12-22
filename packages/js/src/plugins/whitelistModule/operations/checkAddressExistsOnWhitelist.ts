import { PublicKey } from '@solana/web3.js';

import { toWhitelist } from '../models';

import { Convergence } from '../../../Convergence';
import { toWhitelistAccount } from '../account';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';

const Key = 'CheckAddressExistsOnWhitelistOperation' as const;

/**
 * check an address already exists in a whitelist.
 *
 * ```ts
 * const doesExists = await convergence
 *   .whitelist()
 *   .checkAddressExistsOnWhitelist({
 *      whitelistAddress: PublicKey,
 *       addressToSearch: PublicKey,
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const checkAddressExistsOnWhitelistOperation =
  useOperation<CheckAddressExistsOnWhitelistOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CheckAddressExistsOnWhitelistOperation = Operation<
  typeof Key,
  CheckAddressExistsOnWhitelistInput,
  CheckAddressExistsOnWhitelistOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CheckAddressExistsOnWhitelistInput = {
  /** The address of the Rfq. */
  whitelistAddress: PublicKey;
  addressToSearch: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CheckAddressExistsOnWhitelistOutput = boolean;

/**
 * @group Operations
 * @category Handlers
 */
export const checkAddressExistsOnWhitelistOperationHandler: OperationHandler<CheckAddressExistsOnWhitelistOperation> =
  {
    handle: async (
      operation: CheckAddressExistsOnWhitelistOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<CheckAddressExistsOnWhitelistOutput> => {
      const { commitment } = scope;
      const { whitelistAddress, addressToSearch } = operation.input;
      scope.throwIfCanceled();

      const account = await convergence
        .rpc()
        .getAccount(whitelistAddress, commitment);
      const whitelistAccount = toWhitelist(toWhitelistAccount(account));

      scope.throwIfCanceled();

      const isExists = whitelistAccount.whitelist.find((address) =>
        address.equals(addressToSearch)
      );
      return Boolean(isExists);
    },
  };
