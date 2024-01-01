import { PublicKey } from '@solana/web3.js';

import { Whitelist, toWhitelist } from '../models';

import { Convergence } from '../../../Convergence';
import { toWhitelistAccount } from '../account';
import { WhitelistGpaBuilder } from '../WhitelistGpaBuilder';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';

const Key = 'FindWhitelistsByCreatorOperation' as const;

/**
 * Finds Whitelists by creator.
 *
 * ```ts
 * const whitelists = await convergence
 *   .whitelist()
 *   .findWhitelistsByCreator({ creator });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findWhitelistsByCreatorOperation =
  useOperation<FindWhitelistsByCreatorOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindWhitelistsByCreatorOperation = Operation<
  typeof Key,
  FindWhitelistsByCreatorInput,
  FindWhitelistsByCreatorOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindWhitelistsByCreatorInput = {
  /** The address of the Rfq. */
  creator: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindWhitelistsByCreatorOutput = Whitelist[];

/**
 * @group Operations
 * @category Handlers
 */
export const findWhitelistsByCreatorOperationHandler: OperationHandler<FindWhitelistsByCreatorOperation> =
  {
    handle: async (
      operation: FindWhitelistsByCreatorOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<FindWhitelistsByCreatorOutput> => {
      const { creator } = operation.input;
      scope.throwIfCanceled();
      const whitelistGpaBuilder = new WhitelistGpaBuilder(convergence);
      const accounts = await whitelistGpaBuilder.whereCreator(creator).get();
      const whitelists = accounts.map((account) =>
        toWhitelist(toWhitelistAccount(account))
      );
      scope.throwIfCanceled();

      return whitelists;
    },
  };
