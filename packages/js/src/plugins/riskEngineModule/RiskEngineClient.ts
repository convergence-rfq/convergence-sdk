import {
  calculateCollateralForConfirmationOperation,
  calculateCollateralForResponseOperation,
  calculateCollateralForRfqOperation,
  CalculateCollateralForConfirmationInput,
  CalculateCollateralForRfqInput,
  CalculateCollateralForResponseInput,
} from './operations';
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

  /** {@inheritDoc  calculateCollateralForRfq} */
  calculateCollateralForRfq(
    input: CalculateCollateralForRfqInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(calculateCollateralForRfqOperation(input), options);
  }

  /** {@inheritDoc calculateCollateralForResponse} */
  calculateCollateralForResponse(
    input: CalculateCollateralForResponseInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(calculateCollateralForResponseOperation(input), options);
  }

  /** {@inheritDoc calculateCollateralForConfirmation} */
  calculateCollateralForConfirmation(
    input: CalculateCollateralForConfirmationInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(calculateCollateralForConfirmationOperation(input), options);
  }
}
