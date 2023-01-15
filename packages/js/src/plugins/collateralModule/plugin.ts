import { CollateralClient } from './CollateralClient';
import {
  initializeCollateralOperation,
  initializeCollateralOperationHandler,
  fundCollateralOperation,
  fundCollateralOperationHandler,
  withdrawCollateralOperation,
  withdrawCollateralOperationHandler,
  findCollateralByAddressOperation,
  findCollateralByAddressOperationHandler,
  findCollateralByUserOperation,
  findCollateralByUserOperationHandler,
} from './operations';
import { ConvergencePlugin } from '@/types';
import type { Convergence } from '@/Convergence';

/** @group Plugins */
export const collateralModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    const op = convergence.operations();

    op.register(
      initializeCollateralOperation,
      initializeCollateralOperationHandler
    );
    op.register(fundCollateralOperation, fundCollateralOperationHandler);
    op.register(
      withdrawCollateralOperation,
      withdrawCollateralOperationHandler
    );
    op.register(
      findCollateralByAddressOperation,
      findCollateralByAddressOperationHandler
    );
    op.register(
      findCollateralByUserOperation,
      findCollateralByUserOperationHandler
    );

    convergence.collateral = function () {
      return new CollateralClient(this);
    };
  },
});

declare module '../../Convergence' {
  interface Convergence {
    collateral(): CollateralClient;
  }
}
