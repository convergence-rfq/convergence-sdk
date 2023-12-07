import { ProgramClient } from '../programModule';
import { PSYOPTIONS_AMERICAN_INSTRUMENT_PROGRAM_ID } from './types';
import { psyoptionsAmericanInstrumentParser } from './instrument';
import { ConvergencePlugin, Program } from '@/types';
import type { Convergence } from '@/Convergence';

/** @group Plugins */
export const psyoptionsAmericanInstrumentModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    const psyoptionsAmericanInstrumentProgram = {
      name: 'PsyoptionsAmericanInstrumentProgram',
      address: PSYOPTIONS_AMERICAN_INSTRUMENT_PROGRAM_ID,
    };
    convergence.programs().register(psyoptionsAmericanInstrumentProgram);

    convergence.programs().getPsyoptionsAmericanInstrument = function (
      this: ProgramClient,
      programs?: Program[]
    ) {
      return this.get(psyoptionsAmericanInstrumentProgram.name, programs);
    };

    convergence.addLegInstrument(
      psyoptionsAmericanInstrumentProgram.address,
      psyoptionsAmericanInstrumentParser
    );
  },
});

declare module '../programModule/ProgramClient' {
  interface ProgramClient {
    getPsyoptionsAmericanInstrument(programs?: Program[]): Program;
  }
}
