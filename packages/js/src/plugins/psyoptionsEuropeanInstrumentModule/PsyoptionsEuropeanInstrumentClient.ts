import {
  initializePsyoptionsEuropeanInstrumentOperation,
  InitializePsyoptionsEuropeanInstrumentInput,
} from './operations';
import { OperationOptions } from '@/types';
import type { Convergence } from '@/Convergence';

/**
 * This is a client for the psyoptionsEuropeanInstrumentmodule.
 *
 * It enables us to manage the Psyoptions European instrument.
 *
 * You may access this client via the `psyoptionsEuropeanInstrument()` method of your `Convergence` instance.
 *
 * ```ts
 * const psyoptionsEuropeanInstrumentClient = convergence.psyoptionsEuropeanInstrument();
 * ```
 *
 * @example
 * ```ts
 * const { protocol } = await convergence
 *   .psyoptionsEuropeanInstrument()
 *   .initialize();
 * ```
 *
 * @group Modules
 */
export class PsyoptionsEuropeanInstrumentClient {
  constructor(protected readonly convergence: Convergence) {}

  /** {@inheritDoc initializePsyoptionsEuropeanInstrumentOperation} */
  initialize(
    input: InitializePsyoptionsEuropeanInstrumentInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(initializePsyoptionsEuropeanInstrumentOperation(input), options);
  }
}
