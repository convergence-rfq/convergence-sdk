import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';
import { CollateralAccount } from '../accounts';
import { assert } from '@/utils';

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

  /** The bump of the collateral account. */
  readonly bump: number;

  /** The owner of the Collateral account. */
  readonly user: PublicKey;

  /** The bump of the token account. */
  readonly tokenAccountBump: number;

  /** The amount of locked tokens. */
  lockedTokensAmount: number;
};

/** @group Model Helpers */
export const isCollateral = (value: any): value is Collateral =>
  typeof value === 'object' && value.model === 'collateral';

/** @group Model Helpers */
export function assertCollateral(value: any): asserts value is Collateral {
  assert(isCollateral(value), `Expected collateral model`);
}

/** @group Model Helpers */
export const toCollateral = (account: CollateralAccount): Collateral => ({
  model: 'collateral',
  address: account.publicKey,
  bump: account.data.bump,
  user: account.data.user,
  tokenAccountBump: account.data.tokenAccountBump,
  lockedTokensAmount:
    account.data.lockedTokensAmount instanceof BN
      ? account.data.lockedTokensAmount.toNumber()
      : account.data.lockedTokensAmount,
});
