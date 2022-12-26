import { Leg, Side } from '@convergence-rfq/rfq';
import type { Convergence } from '@/Convergence';

/**
 * This is a client for the spotInstrumentmodule.
 *
 * It enables us to manage the spot instrument.
 *
 * You may access this client via the `spotInstrument()` method of your `Convergence` instance.
 *
 * ```ts
 * const spotInstrumentClient = convergence.spotInstrument();
 * ```
 *
 * @example
 * ```ts
 * const { spotInstrument } = await convergence
 *   .spotInstrument()
 *   .createLeg();
 * ```
 *
 * @group Modules
 */
export class SpotInstrumentClient {
  constructor(protected readonly convergence: Convergence) {}

  createLeg(): Leg {
    const spotInstrumentProgram = this.convergence
      .programs()
      .getSpotInstrument();
    return {
      instrumentProgram: spotInstrumentProgram.address,
      baseAssetIndex: { value: 0 },
      instrumentData: Buffer.from(''),
      instrumentAmount: 1,
      instrumentDecimals: 0,
      side: Side.Bid,
    };
  }
}
