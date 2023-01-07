import { PublicKey } from '@solana/web3.js';
import { CollateralAccount } from '../accounts';
import { assert } from '@/utils';
import { Pda, SolAmount } from '@/types';

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

  readonly lockedTokensAmount: SolAmount;
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
  address: Pda.find(account.owner, [
    Buffer.from('collateral_info', 'utf8'),
    account.data.user.toBuffer(),
  ]),
  lockedTokensAmount: account.lamports,
});
