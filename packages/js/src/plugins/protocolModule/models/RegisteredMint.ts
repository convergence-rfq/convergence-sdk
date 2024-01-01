import { PublicKey } from '@solana/web3.js';
import { MintType } from '@convergence-rfq/rfq';

import { RegisteredMintAccount } from '../accounts';
import { assert } from '../../../utils/assert';

/**
 * This model captures all the relevant information about a registered mint
 * on the Solana blockchain.
 *
 * @group Models
 */
export type RegisteredMint = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'registeredMint';

  /** The address of the base asset. */
  readonly address: PublicKey;

  /** The PDA bump of the registered mint. */
  readonly bump: number;

  /** The mint address. */
  readonly mintAddress: PublicKey;

  /** The number of decimals. */
  readonly decimals: number;

  /** The mint type. */
  readonly mintType: MintType;
};

/** @group Model Helpers */
export const isRegisteredMint = (value: any): value is RegisteredMint =>
  typeof value === 'object' && value.model === 'registeredMint';

/** @group Model Helpers */
export function assertRegisteredMint(
  value: any
): asserts value is RegisteredMint {
  assert(isRegisteredMint(value), 'Expected RegisteredMint model');
}

/** @group Model Helpers */
export const toRegisteredMint = (
  account: RegisteredMintAccount
): RegisteredMint => ({
  model: 'registeredMint',
  address: account.publicKey,
  bump: account.data.bump,
  mintAddress: account.data.mintAddress,
  decimals: account.data.decimals,
  mintType: account.data.mintType,
});
