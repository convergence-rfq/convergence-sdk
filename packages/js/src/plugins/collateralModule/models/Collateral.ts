import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';

// TODO: Find import
import { Mint } from '../../../models/Mint';
import { CollateralAccount } from '../accounts';
import { assert } from '../../../utils';

/**
 * This model captures all the relevant information about a collateral account
 * on the Solana blockchain.
 *
 * @group Models
 */
export type Collateral = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'collateral';

  /** The address of the collateral account. */
  readonly address: PublicKey;

  /** The owner of the Collateral account. */
  readonly user: PublicKey;

  // NOTE: Removed bump and token account bump

  /** The amount of locked tokens. */
  // TODO: Make sure this a number with built-in support for mint decimal
  // 9_000_000_000 bps
  // 6 decimals for USDC
  // 9_000.000_000 actual number accounting for decimals
  //
  // TODO: How do we make sure this uses the actual mint decimals?
  readonly lockedTokensAmount: number;
};

/** @group Model Helpers */
export const isCollateral = (value: any): value is Collateral =>
  typeof value === 'object' && value.model === 'collateral';

/** @group Model Helpers */
export function assertCollateral(value: any): asserts value is Collateral {
  assert(isCollateral(value), 'Expected collateral model');
}

// const collateralMint = await collateralMintCache.get(convergence);
// lockedTokensAmount = account.data.lockedTokensAmount * (10 ** collateralMint.decimals);

/** @group Model Helpers */
export const toCollateral = (
  account: CollateralAccount,
  mint: Mint
): Collateral => ({
  model: 'collateral',
  address: account.publicKey,
  user: account.data.user,
  lockedTokensAmount:
    account.data.lockedTokensAmount instanceof BN
      ? account.data.lockedTokensAmount.toNumber()
      : account.data.lockedTokensAmount,
});
