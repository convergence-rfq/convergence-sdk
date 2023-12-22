import { PublicKey } from '@solana/web3.js';
import { WhitelistAccount } from '../account';
import { assert } from '@/utils/assert';

/**
 * This model captures all the relevant information about an Whitelist
 * on the Solana blockchain.
 *
 * @group Models
 */
export type Whitelist = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'whitelist';

  /** The address of the creator */
  readonly creator: PublicKey;

  /** The address of the whitelist */
  readonly address: PublicKey;

  /** Max capacity of whitelist. */
  readonly capacity: number;

  /** Whitelisted Addresses */
  readonly whitelist: PublicKey[];
};

/** @group Model Helpers */
export const isWhitelist = (value: any): value is Whitelist =>
  typeof value === 'object' && value.model === 'whitelist';

/** @group Model Helpers */
export function assertWhitelist(value: any): asserts value is Whitelist {
  assert(isWhitelist(value), 'Expected Whitelist model');
}

export const toWhitelist = (account: WhitelistAccount): Whitelist => {
  const { data } = account;
  const whitelistData = {
    model: 'whitelist',
    address: account.publicKey,
    creator: data.creator,
    capacity: data.capacity,
    whitelist: data.whitelist,
  };

  assertWhitelist(whitelistData);
  return {
    model: 'whitelist',
    address: account.publicKey,
    creator: data.creator,
    capacity: data.capacity,
    whitelist: data.whitelist,
  };
};
