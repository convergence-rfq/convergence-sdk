import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';

import { Mint } from '../../tokenModule/models/Mint';
import { CollateralAccount } from '../accounts';
import { assert, removeDecimals } from '../../../utils';

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
  readonly lockedTokensAmount: number;
};

/** @group Model Helpers */
export const isCollateral = (value: any): value is Collateral =>
  typeof value === 'object' && value.model === 'collateral';

/** @group Model Helpers */
export function assertCollateral(value: any): asserts value is Collateral {
  assert(isCollateral(value), 'Expected collateral model');
}

function getLockedTokensAmount(value: unknown, mint: Mint | undefined): number {
  if (typeof mint === 'undefined') {
    return 0;
  }
  if (typeof value === 'number') {
    return removeDecimals(value, mint.decimals);
  }
  if (value instanceof BN) {
    return removeDecimals(value.toNumber(), mint.decimals);
  }
  return 0;
}

/** @group Model Helpers */
export const toCollateral = (
  account: CollateralAccount,
  mint?: Mint
): Collateral => ({
  model: 'collateral',
  address: account.publicKey,
  user: account.data.user,
  lockedTokensAmount: getLockedTokensAmount(
    account.data.lockedTokensAmount,
    mint
  ),
});
