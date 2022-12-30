import { PROGRAM_ID } from '@convergence-rfq/psyoptions-european-instrument';
import { ProgramClient } from '../programModule';
import { ConvergencePlugin, Program } from '@/types';
import type { Convergence } from '@/Convergence';

/** @group Plugins */
export const psyoptionsEuropeanInstrumentModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    const psyoptionsEuropeanInstrumentProgram = {
      name: 'PsyoptionsEuropeanInstrumentProgram',
      address: PROGRAM_ID,
    };
    convergence.programs().register(psyoptionsEuropeanInstrumentProgram);

    convergence.programs().getPsyoptionsEuropeanInstrument = function (
      this: ProgramClient,
      programs?: Program[]
    ) {
      return this.get(psyoptionsEuropeanInstrumentProgram.name, programs);
    };
  },
});

declare module '../programModule/ProgramClient' {
  interface ProgramClient {
    getPsyoptionsEuropeanInstrument(programs?: Program[]): Program;
  }
}
