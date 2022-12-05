import { Keypair, PublicKey } from '@solana/web3.js';
import { assert, Option } from '@/utils';
import { RfqAccount } from '../accounts';
// import type { Leg } from './Leg';
// import { Account } from '@/types';
// import {
//   // accountProviders,
//   FixedSize,
//   OrderType,
//   StoredRfqState,
// } from '@convergence-rfq/rfq';
// import { bignum } from '@metaplex-foundation/beet';

/**
 * This model captures all the relevant information about an RFQ
 * on the Solana blockchain. That includes the Rfq's leg accounts.
 *
 * @group Models
 */
export type Rfq = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'rfq';

  /** The mint address of the Rfq. */
  readonly address: PublicKey;
};

/** @group Model Helpers */
export const isRfq = (value: any): value is Rfq =>
  typeof value === 'object' && value.model === 'rfq';

/** @group Model Helpers */
export function assertRfq(value: any): asserts value is Rfq {
  assert(isRfq(value), `Expected Rfq model`);
}

/** @group Model Helpers */
// export const toRfq = (legs: Leg[]): Rfq => ({
export const toRfq = (account: RfqAccount): Rfq => ({
  model: 'rfq',
  address: account.publicKey,
});
