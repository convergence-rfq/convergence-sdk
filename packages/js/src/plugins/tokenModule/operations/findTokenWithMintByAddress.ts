import type { PublicKey } from '@solana/web3.js';

import { toMintAccount, toTokenAccount } from '../accounts';
import { toMint } from '../models/Mint';
import { TokenWithMint, toTokenWithMint } from '../models/Token';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';

const Key = 'FindTokenWithMintByAddressOperation' as const;

/**
 * Finds a token account and its associated mint account
 * by providing the token address.
 *
 * ```ts
 * const tokenWithMint = await convergence.tokens().findTokenWithMintByAddress({ address });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findTokenWithMintByAddressOperation =
  useOperation<FindTokenWithMintByAddressOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindTokenWithMintByAddressOperation = Operation<
  typeof Key,
  FindTokenWithMintByAddressInput,
  TokenWithMint
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindTokenWithMintByAddressInput = {
  /** The address of the token account. */
  address: PublicKey;
};

/**
 * @group Operations
 * @category Handlers
 */
export const findTokenWithMintByAddressOperationHandler: OperationHandler<FindTokenWithMintByAddressOperation> =
  {
    handle: async (
      operation: FindTokenWithMintByAddressOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<TokenWithMint> => {
      const { commitment } = scope;
      const { address } = operation.input;

      const tokenAccount = toTokenAccount(
        await convergence.rpc().getAccount(address, commitment)
      );

      const mintAccount = toMintAccount(
        await convergence.rpc().getAccount(tokenAccount.data.mint, commitment)
      );

      return toTokenWithMint(tokenAccount, toMint(mintAccount));
    },
  };
