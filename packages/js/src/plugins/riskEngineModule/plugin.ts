import { PROGRAM_ID } from '@convergence-rfq/risk-engine';
import { ProgramClient } from '../programModule';
import { RiskEngineClient } from './RiskEngineClient';
import { ConvergencePlugin, Program } from '@/types';
import type { Convergence } from '@/Convergence';

/** @group Plugins */
export const riskEngineModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    const rfqProgram = {
      name: 'RiskEngineProgram',
      address: PROGRAM_ID,
    };
    convergence.programs().register(rfqProgram);
    convergence.programs().getRiskEngine = function (
      this: ProgramClient,
      programs?: Program[]
    ) {
      return this.get(rfqProgram.name, programs);
    };

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
    getRiskEngine(): Program;
  }
}
