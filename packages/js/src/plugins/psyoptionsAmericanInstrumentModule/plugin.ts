import { PROGRAM_ID } from '@convergence-rfq/psyoptions-european-instrument';
import { ProgramClient } from '../programModule';
import { ConvergencePlugin, Program } from '@/types';
import type { Convergence } from '@/Convergence';

/** @group Plugins */
export const psyoptionsAmericanInstrumentModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    const psyoptionsAmericanInstrumentProgram = {
      name: 'PsyoptionsAmericanInstrumentProgram',
      address: PROGRAM_ID,
    };
    convergence.programs().register(psyoptionsAmericanInstrumentProgram);

    convergence.programs().getPsyoptionsAmericanInstrument = function (
      this: ProgramClient,
      programs?: Program[]
    ) {
      return this.get(psyoptionsAmericanInstrumentProgram.name, programs);
    };
  },
});

declare module '../programModule/ProgramClient' {
  interface ProgramClient {
    getPsyoptionsAmericanInstrument(programs?: Program[]): Program;
  }
}
