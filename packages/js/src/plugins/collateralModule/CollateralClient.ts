import {
  fundCollateralOperation,
  FundCollateralInput,
  initializeCollateralOperation,
  InitializeCollateralInput,
} from './operations';
import { OperationOptions } from '@/types';
import type { Convergence } from '@/Convergence';

export class CollateralClient {
  constructor(protected readonly convergence: Convergence) {}

  /** {@inheritDoc fundCollateralOperation} */
  fundCollateral(input: FundCollateralInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(fundCollateralOperation(input), options);
  }

  /** {@inheritDoc initializeCollateralOperation} */
  initializeCollateral(
    input: InitializeCollateralInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(initializeCollateralOperation(input), options);
  }
}
