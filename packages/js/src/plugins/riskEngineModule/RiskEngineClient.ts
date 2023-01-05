import {
  initializeConfigOperation,
  InitializeConfigInput,
  SetInstrumentTypeInput,
  setInstrumentTypeOperation,
} from './operations';
import type { Convergence } from '@/Convergence';
import { OperationOptions } from '@/types';

/**
 * This is a client for the risk engine module.
 *
 * It enables us to interact with the risk engine program in order to
 * manage risk.
 *
 * You may access this client via the `riskEngine()` method of your `Convergence` instance.
 *
 * ```ts
 * const riskEngineClient = convergence.riskEngine();
 * ```
 */
export class RiskEngineClient {
  constructor(protected readonly convergence: Convergence) {}

  /** {@inheritDoc initializeConfig} */
  initializeConfig(input: InitializeConfigInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(initializeConfigOperation(input), options);
  }

  /** {@inheritDoc setInstrumentTypeOperation} */
  setInstrumentType(input: SetInstrumentTypeInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(setInstrumentTypeOperation(input), options);
  }
}
