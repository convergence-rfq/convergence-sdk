import { PsyoptionsEuropeanInstrument } from '../psyoptionsEuropeanInstrumentModule';
import { InstrumentClient } from './InstrumentClient';
import { Instrument } from './models';
import { ConvergencePlugin, Program } from '@/types';
import type { Convergence } from '@/Convergence';

/** @group Plugins */
export const instrumentModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    convergence.instrument = function (
      instrument: PsyoptionsEuropeanInstrument
    ) {
      return new InstrumentClient(this, instrument, null, 0);
    };
  },
});

declare module '../../Convergence' {
  interface Convergence {
    instrument(instrument: Instrument): InstrumentClient;
  }
}

declare module '../programModule/ProgramClient' {
  interface ProgramClient {
    getSpotInstrument(programs?: Program[]): Program;
  }
}
