//import { BN } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@types';
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

  /** The address of the instrument. */
  readonly address: PublicKey;

  readonly underlyingMint: PublicKey;

  readonly stableMint: PublicKey;

  readonly callWriterMint: PublicKey;
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

export type Leg = {
    readonly instrumentProgram: PublicKey;

    readonly baseAssetIndex: number;

    readonly instrumentData: Buffer | Uint8Array;
    
    readonly instrumentAmount: BN;
    
    readonly instrumentDecimals: number;

    readonly side: Side;
}

export const createLeg(): Leg => {
    return {

    }
}
