import { ProgramClient } from '../programModule';
import { HxroClient } from './client';
import {
  fetchHxroPrintTradeProviderConfigOperation,
  fetchHxroPrintTradeProviderConfigOperationHandler,
  fetchHxroProductsOperation,
  fetchHxroProductsOperationHandler,
} from './operations';
import { hxroPrintTradeProviderProgram } from './program';
import { HxroPrintTradeParser } from './printTrade';
import type { Convergence } from '@/Convergence';
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
      fetchHxroPrintTradeProviderConfigOperation,
      fetchHxroPrintTradeProviderConfigOperationHandler
    );

    op.register(fetchHxroProductsOperation, fetchHxroProductsOperationHandler);

    convergence.hxro = function () {
      return new HxroClient(this);
    };

    convergence.addPrintTradeParser(
      hxroPrintTradeProviderProgram.address,
      new HxroPrintTradeParser()
    );
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
