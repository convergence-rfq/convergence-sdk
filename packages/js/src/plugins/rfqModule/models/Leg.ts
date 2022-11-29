import { PublicKey } from '@solana/web3.js';
import { RfqAccount } from '../accounts';
import { assert } from '@/utils';

/** @group Model Helpers */
export const isLeg = (value: any): value is Leg =>
  typeof value === 'object' && value.model === 'leg';

/** @group Model Helpers */
export function assertLeg(value: any): asserts value is Leg {
  assert(isLeg(value), `Expected Leg model`);
}

/** @group Models */
export type Leg = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'leg';

  /** The address of the edition account. */
  readonly address: PublicKey;
};

/** @group Model Helpers */
export const toLeg = (account: RfqAccount): Leg => ({
  model: 'leg',
  address: account.publicKey,
});
