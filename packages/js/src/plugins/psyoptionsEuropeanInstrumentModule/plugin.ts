import { PsyoptionsEuropeanInstrumentClient } from './PsyoptionsEuropeanInstrumentClient';
import {
  initializePsyoptionsEuropeanInstrumentOperation,
  initializePsyoptionsEuropeanInstrumentOperationHandler,
} from './operations';
import { PsyoptionsEuropeanInstrument } from './models';
import { ConvergencePlugin } from '@/types';
import type { Convergence } from '@/Convergence';

/** @group Plugins */
export const psyoptionsEuropeanInstrumentModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    const op = convergence.operations();
    op.register(
      initializePsyoptionsEuropeanInstrumentOperation,
      initializePsyoptionsEuropeanInstrumentOperationHandler
    );

    convergence.psyoptionsEuropeanInstrument = function () {
      return new PsyoptionsEuropeanInstrumentClient(this);
    };
  },
});

declare module '../../Convergence' {
  interface Convergence {
    psyoptionsEuropeanInstrument(): PsyoptionsEuropeanInstrumentClient;
  }
}

declare module '../protocolModule/ProtocolClient' {
  interface ProtocolClient {
    getPsyoptionsEuropeanInstrument(): PsyoptionsEuropeanInstrument;
  }
}
