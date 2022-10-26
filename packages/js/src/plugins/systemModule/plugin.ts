import { SystemProgram } from '@solana/web3.js';
import { ProgramClient } from '../programModule';
import {
  createAccountOperation,
  createAccountOperationHandler,
  transferSolOperation,
  transferSolOperationHandler,
} from './operations';
import { SystemClient } from './SystemClient';
import type { ConvergencePlugin, Program } from '@/types';
import type { Convergence } from '@/Convergence';

/**
 * @group Plugins
 */
/** @group Plugins */
export const systemModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    // Program.
    const systemProgram = {
      name: 'SystemProgram',
      address: SystemProgram.programId,
    };
    convergence.programs().register(systemProgram);
    convergence.programs().getSystem = function (
      this: ProgramClient,
      programs?: Program[]
    ) {
      return this.get(systemProgram.name, programs);
    };

    // Operations.
    const op = convergence.operations();
    op.register(createAccountOperation, createAccountOperationHandler);
    op.register(transferSolOperation, transferSolOperationHandler);

    convergence.system = function () {
      return new SystemClient(this);
    };
  },
});

declare module '../../Convergence' {
  interface Convergence {
    system(): SystemClient;
  }
}

declare module '../programModule/ProgramClient' {
  interface ProgramClient {
    getSystem(programs?: Program[]): Program;
  }
}
