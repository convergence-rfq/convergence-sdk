import { Side } from '../rfqModule';
import { PsyoptionsEuropeanInstrument } from '../psyoptionsEuropeanInstrumentModule';
import { InstrumentClient } from './InstrumentClient';
import { Instrument } from './models';
import { ConvergencePlugin, Program, BigNumber } from '@/types';
import type { Convergence } from '@/Convergence';

/** @group Plugins */
export const instrumentModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    convergence.instrument = function (
      instrument: PsyoptionsEuropeanInstrument,
      legInfo: {
        amount: BigNumber;
        side: Side;
        baseAssetIndex: number;
      } | null,
      decimals: number | 0
    ) {
      return new InstrumentClient(this, instrument, legInfo, decimals);
    };
  },
});

declare module '../../Convergence' {
  interface Convergence {
    instrument(
      instrument: Instrument,
      legInfo: { amount: BigNumber; side: Side; baseAssetIndex: number } | null,
      decimals: number | null
    ): InstrumentClient;
  }
}

declare module '../programModule/ProgramClient' {
  interface ProgramClient {
    getSpotInstrument(programs?: Program[]): Program;
  }
}
