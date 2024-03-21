import { ProgramClient } from '../programModule';
import { ConvergencePlugin, Program } from '../../types';
import type { Convergence } from '../../Convergence';
import {
  createVaultOperation,
  createVaultOperationHandler,
} from './operations';
import { vaultOperatorProgram } from './program';
import { VaultOperatorClient } from './client';

/** @group Plugins */
export const vaultOperatorModule = (): ConvergencePlugin => ({
  install(cvg: Convergence) {
    cvg.programs().register(vaultOperatorProgram);
    cvg.programs().getVaultOperator = function (
      this: ProgramClient,
      programs?: Program[]
    ) {
      return this.get(vaultOperatorProgram.name, programs);
    };

    const op = cvg.operations();
    op.register(createVaultOperation, createVaultOperationHandler);

    cvg.vaultOperator = function () {
      return new VaultOperatorClient(this);
    };
  },
});

declare module '../../Convergence' {
  interface Convergence {
    vaultOperator(): VaultOperatorClient;
  }
}

declare module '../programModule/ProgramClient' {
  interface ProgramClient {
    getVaultOperator(programs?: Program[]): Program;
  }
}
