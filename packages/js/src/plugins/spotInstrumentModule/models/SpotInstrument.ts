import { Side } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import { assert } from '@/utils';

/**
 * This model captures all the relevant information about a Psyoptions European
 * instrument on the Solana blockchain.
 *
 * @group Models
 */
export type SpotInstrument = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'spotInstrument';

  readonly mint: PublicKey;

  readonly amount: number;

  readonly decimals: number;

  readonly side: Side;

  readonly data: Buffer;
};

/** @group Model Helpers */
export const isSpotInstrument = (value: any): value is SpotInstrument =>
  typeof value === 'object' && value.model === 'spotInstrument';

/** @group Model Helpers */
export function assertSpotInstrument(
  value: any
): asserts value is SpotInstrument {
  assert(isSpotInstrument(value), `Expected SpotInstrument model`);
}
