import { PROGRAM_ID } from '@convergence-rfq/risk-engine';
import { ProgramClient } from '../programModule';
import { RiskEngineClient } from './RiskEngineClient';
import {
  initializeConfigOperation,
  initializeConfigOperationHandler,
  setInstrumentTypeOperation,
  setInstrumentTypeOperationHandler,
  setRiskCategoriesInfoOperation,
  setRiskCategoriesInfoOperationHandler,
  calculateCollateralForConfirmationOperation,
  calculateCollateralForConfirmationOperationHandler,
  calculateCollateralForResponseOperation,
  calculateCollateralForResponseOperationHandler,
  calculateCollateralForRfqOperation,
  calculateCollateralForRfqOperationHandler,
  fetchConfigOperation,
  fetchConfigOperationHandler,
} from './operations';
import { ConvergencePlugin, Program } from '@/types';
import type { Convergence } from '@/Convergence';

/** @group Plugins */
export const riskEngineModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    const riskEngineProgram = {
      name: 'RiskEngineProgram',
      address: PROGRAM_ID,
    };
    convergence.programs().register(riskEngineProgram);

    convergence.programs().getRiskEngine = function (
      this: ProgramClient,
      programs?: Program[]
    ) {
      return this.get(riskEngineProgram.name, programs);
    };

    const op = convergence.operations();
    op.register(initializeConfigOperation, initializeConfigOperationHandler);
    op.register(setInstrumentTypeOperation, setInstrumentTypeOperationHandler);
    op.register(
      setRiskCategoriesInfoOperation,
      setRiskCategoriesInfoOperationHandler
    );
    op.register(
      calculateCollateralForRfqOperation,
      calculateCollateralForRfqOperationHandler
    );
    op.register(
      calculateCollateralForResponseOperation,
      calculateCollateralForResponseOperationHandler
    );
    op.register(
      calculateCollateralForConfirmationOperation,
      calculateCollateralForConfirmationOperationHandler
    );
    op.register(fetchConfigOperation, fetchConfigOperationHandler);

    convergence.riskEngine = function () {
      return new RiskEngineClient(this);
    };
  },
});

declare module '../../Convergence' {
  interface Convergence {
    riskEngine(): RiskEngineClient;
  }
}

declare module '../programModule/ProgramClient' {
  interface ProgramClient {
    getRiskEngine(programs?: Program[]): Program;
  }
}
