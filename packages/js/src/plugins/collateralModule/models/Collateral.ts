import { PublicKey } from '@solana/web3.js';
import { CollateralAccount } from '../accounts';
import { assert } from '@/utils';

/**
 * This model captures all the relevant information about a Collateral account
 * on the Solana blockchain.
 *
 * @group Models
 */
export type Collateral = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'collateral';

  /** The mint address of the Collateral account. */
  readonly address: PublicKey;
};

/** @group Model Helpers */
export const isCollateral = (value: any): value is Collateral =>
  typeof value === 'object' && value.model === 'collateral';

/** @group Model Helpers */
export function assertCollateral(value: any): asserts value is Collateral {
  assert(isCollateral(value), `Expected collateral model`);
}

/** @group Model Helpers */
export const toCollateral = (collateral: CollateralAccount): Collateral => ({
  model: 'collateral',
  address: collateral.publicKey,
});
