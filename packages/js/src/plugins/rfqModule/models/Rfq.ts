import { Keypair, PublicKey } from '@solana/web3.js';
import type { Leg } from './Leg';
import { assert } from '@/utils';

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

/*
  TODO: pull legs out of params and put into RFQ
  should the toRfq function even exist? it needs a lot more params than this
*/

// /** @group Model Helpers */
// export const toRfq = (legs: Leg[]): Rfq => ({
//   model: 'rfq',
//   address: Keypair.generate().publicKey,
// });
