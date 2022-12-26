import { Leg } from '@convergence-rfq/rfq';
import { SpotInstrument } from './models';
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

  createLeg(spotInstrument: SpotInstrument): Leg {
    const spotInstrumentProgram = this.convergence
      .programs()
      .getSpotInstrument();
    return {
      instrumentProgram: spotInstrumentProgram.address,
      baseAssetIndex: { value: 0 },
      instrumentData: spotInstrument.data,
      instrumentAmount: spotInstrument.amount,
      instrumentDecimals: spotInstrument.decimals,
      side: spotInstrument.side,
    };
  }
}
