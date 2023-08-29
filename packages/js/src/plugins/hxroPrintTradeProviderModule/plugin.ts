import { ProgramClient } from '../programModule';
import { HxroClient } from './client';
import {
  getHxroPrintTradeProviderConfigOperation,
  getHxroPrintTradeProviderConfigOperationHandler,
} from './operations';
import { hxroPrintTradeProviderProgram } from './program';
import { Convergence } from '@/Convergence';
import { ConvergencePlugin, Program } from '@/types';

export const hxroModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    convergence.programs().register(hxroPrintTradeProviderProgram);
    convergence.programs().getHxroPrintTradeProvider = function (
      this: ProgramClient,
      programs?: Program[]
    ) {
      return this.get(hxroPrintTradeProviderProgram.name, programs);
    };

    const op = convergence.operations();

    op.register(
      getHxroPrintTradeProviderConfigOperation,
      getHxroPrintTradeProviderConfigOperationHandler
    );

    convergence.hxro = function () {
      return new HxroClient(this);
    };
  },
});

declare module '../../Convergence' {
  interface Convergence {
    hxro(): HxroClient;
  }
}

declare module '../programModule/ProgramClient' {
  interface ProgramClient {
    getHxroPrintTradeProvider(programs?: Program[]): Program;
  }
}
