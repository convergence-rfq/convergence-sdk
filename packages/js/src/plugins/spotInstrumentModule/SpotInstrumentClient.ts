import { Leg, QuoteAsset } from '@convergence-rfq/rfq';
import { SpotInstrument } from './models';
import type { Convergence } from '@/Convergence';

/**
 * This is a client for the spotInstrumentModule.
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
 * const spotInstrument = { ... };
 * const spotInstrumentLeg = await convergence
 *   .spotInstrument()
 *   .createLeg(spotInstrument);
 * ```
 *
 * @group Modules
 */
export class SpotInstrumentClient {
  constructor(protected readonly convergence: Convergence) {}

  createQuoteAsset(spotInstrument: SpotInstrument): QuoteAsset {
    const spotInstrumentProgram = this.convergence
      .programs()
      .getSpotInstrument();
    return {
      instrumentProgram: spotInstrumentProgram.address,
      instrumentData: spotInstrument.data,
      instrumentDecimals: spotInstrument.decimals,
    };
  }

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