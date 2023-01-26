import {
  initializeConfigOperation,
  InitializeConfigInput,
  SetInstrumentTypeInput,
  setInstrumentTypeOperation,
  calculateCollateralForConfirmationOperation,
  calculateCollateralForResponseOperation,
  calculateCollateralForRfqOperation,
  CalculateCollateralForConfirmationIntput,
  CalculateCollateralForRfqIntput,
  CalculateCollateralForResponseIntput,
  setRiskCategoriesInfoOperation,
  SetRiskCategoriesInfoInput,
} from './operations';
import { RiskEnginePdasClient } from './RiskEnginePdasClient';
import type { Convergence } from '@/Convergence';
import { OperationOptions } from '@/types';

/**
 * This is a client for the Risk Engine module.
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

  /**
   * You may use the `pdas()` client to build PDAs related to this module.
   *
   * ```ts
   * const pdasClient = convergence.riskEngine().pdas();
   * ```
   */
  pdas() {
    return new RiskEnginePdasClient(this.convergence);
  }

  /** {@inheritDoc initializeConfig} */
  initializeConfig(input?: InitializeConfigInput, options?: OperationOptions) {
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

  /** {@inheritDoc setRiskCategoriesInfoOperation} */
  setRiskCategoriesInfo(
    input: SetRiskCategoriesInfoInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(setRiskCategoriesInfoOperation(input), options);
  }

  /** {@inheritDoc  calculateCollateralForRfq} */
  calculateCollateralForRfq(
    input: CalculateCollateralForRfqIntput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(calculateCollateralForRfqOperation(input), options);
  }

  /** {@inheritDoc calculateCollateralForResponse} */
  calculateCollateralForResponse(
    input: CalculateCollateralForResponseIntput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(calculateCollateralForResponseOperation(input), options);
  }

  /** {@inheritDoc calculateCollateralForConfirmation} */
  calculateCollateralForConfirmation(
    input: CalculateCollateralForConfirmationIntput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(calculateCollateralForConfirmationOperation(input), options);
  }
}
