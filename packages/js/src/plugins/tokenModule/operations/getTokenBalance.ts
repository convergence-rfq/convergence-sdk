import { PublicKey } from '@solana/web3.js';

import BN from 'bn.js';
import type { Convergence } from '../../../Convergence';
import { Operation, OperationHandler, useOperation } from '../../../types';

const Key = 'GetTokenBalance' as const;

/**
 * Get token Balance.
 *
 * ```ts
 * await convergence
 *   .tokens()
 *   .getTokenBalance({
 *     mintAddress,
 *     owner,
 *     mintDecimals
 *   };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const getTokenBalanceOperation =
  useOperation<GetTokenBalanceOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type GetTokenBalanceOperation = Operation<
  typeof Key,
  GetTokenBalanceInput,
  GetTokenBalanceOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type GetTokenBalanceInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;
  /** The address of  ATA owner */
  owner: PublicKey;
  /** mint decimals*/
  mintDecimals: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type GetTokenBalanceOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  tokenBalance: number;
};

/**
 * @group Operations
 * @category Handlers
 */
export const getTokenBalanceOperationHandler: OperationHandler<GetTokenBalanceOperation> =
  {
    async handle(
      operation: GetTokenBalanceOperation,
      convergence: Convergence
    ): Promise<GetTokenBalanceOutput> {
      const { mintAddress, owner, mintDecimals } = operation.input;

      const ataAddress = convergence.tokens().pdas().associatedTokenAccount({
        mint: mintAddress,
        owner,
      });
      try {
        const ata = await convergence
          .tokens()
          .findTokenByAddress({ address: ataAddress });
        return {
          tokenBalance: ata.amount.basisPoints
            .div(new BN(Math.pow(10, mintDecimals)))
            .toNumber(),
        };
      } catch (e) {
        return {
          tokenBalance: 0,
        };
      }
    },
  };
