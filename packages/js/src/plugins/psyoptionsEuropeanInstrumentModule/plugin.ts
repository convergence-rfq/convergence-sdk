import { ProgramClient } from '../programModule';
import { psyoptionsEuropeanInstrumentParser } from './instrument';
import { PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ID } from './types';
import { ConvergencePlugin, Program } from '@/types';
import type { Convergence } from '@/Convergence';

/** @group Plugins */
export const psyoptionsEuropeanInstrumentModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    const psyoptionsEuropeanInstrumentProgram = {
      name: 'PsyoptionsEuropeanInstrumentProgram',
      address: PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ID,
    };
    convergence.programs().register(psyoptionsEuropeanInstrumentProgram);

    convergence.programs().getPsyoptionsEuropeanInstrument = function (
      this: ProgramClient,
      programs?: Program[]
    ) {
      return this.get(psyoptionsEuropeanInstrumentProgram.name, programs);
    };

    convergence.addLegInstrument(
      psyoptionsEuropeanInstrumentProgram.address,
      psyoptionsEuropeanInstrumentParser
    );
  },
});

declare module '../programModule/ProgramClient' {
  interface ProgramClient {
    getPsyoptionsEuropeanInstrument(programs?: Program[]): Program;
  }
}
