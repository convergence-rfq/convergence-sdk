//import {
//  initializeSpotInstrumentOperation,
//  InitializeSpotInstrumentInput,
//} from './operations';
//import { OperationOptions } from '@/types';
import type { Convergence } from '@/Convergence';

/**
 * This is a client for the spotInstrumentmodule.
 *
 * It enables us to manage the Psyoptions European instrument.
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
 *   .initialize();
 * ```
 *
 * @group Modules
 */
export class SpotInstrumentClient {
  constructor(protected readonly convergence: Convergence) {}

  /** {@inheritDoc initializeSpotInstrumentOperation} */
  //initialize(input: InitializeSpotInstrumentInput, options?: OperationOptions) {
  //  return this.convergence
  //    .operations()
  //    .execute(initializeSpotInstrumentOperation(input), options);
  //}
}
