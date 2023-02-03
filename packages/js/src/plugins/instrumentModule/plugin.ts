import { Side } from '../rfqModule';
import { SpotInstrument } from '../spotInstrumentModule';
import { PsyoptionsEuropeanInstrument } from '../psyoptionsEuropeanInstrumentModule';
import { PsyoptionsAmericanInstrument } from '../psyoptionsAmericanInstrumentModule';
import { InstrumentClient } from './InstrumentClient';
import { ConvergencePlugin, Program } from '@/types';
import type { Convergence } from '@/Convergence';

/** @group Plugins */
export const instrumentModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    convergence.instrument = function (
      instrument:
        | SpotInstrument
        | PsyoptionsEuropeanInstrument
        | PsyoptionsAmericanInstrument,
      legInfo?: {
        amount: number;
        side: Side;
      }
    ) {
      return new InstrumentClient(this, instrument, legInfo);
    };
  },
});

declare module '../../Convergence' {
  interface Convergence {
    instrument(
      instrument:
        | SpotInstrument
        | PsyoptionsEuropeanInstrument
        | PsyoptionsAmericanInstrument,
      legInfo?: { amount: number; side: Side }
    ): InstrumentClient;
  }
}

declare module '../programModule/ProgramClient' {
  interface ProgramClient {
    getSpotInstrument(programs?: Program[]): Program;
  }
}
