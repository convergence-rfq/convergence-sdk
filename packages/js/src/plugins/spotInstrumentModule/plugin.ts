import { PROGRAM_ID } from '@convergence-rfq/spot-instrument';
import { ProgramClient } from '../programModule';
import { spotLegInstrumentParser } from './instruments';
import { ConvergencePlugin, Program } from '@/types';
import type { Convergence } from '@/Convergence';

/** @group Plugins */
export const spotInstrumentModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    const spotInstrumentProgram = {
      name: 'SpotInstrumentProgram',
      address: PROGRAM_ID,
    };
    convergence.programs().register(spotInstrumentProgram);

    convergence.programs().getSpotInstrument = function (
      this: ProgramClient,
      programs?: Program[]
    ) {
      return this.get(spotInstrumentProgram.name, programs);
    };

    convergence.addLegInstrument(
      spotInstrumentProgram.address,
      spotLegInstrumentParser
    );
  },
});

declare module '../programModule/ProgramClient' {
  interface ProgramClient {
    getSpotInstrument(programs?: Program[]): Program;
  }
}
