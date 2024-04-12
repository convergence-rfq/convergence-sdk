import { PROGRAM_ID } from '@convergence-rfq/spot-instrument';
import { ProgramClient } from '../programModule';
import { spotLegInstrumentParser } from './instruments';
import { SpotInstrumentClient } from './client';
import {
  fetchSpotInstrumentConfigOperation,
  fetchSpotInstrumentConfigOperationHandler,
  initializeSpotInstrumentConfigOperation,
  initializeSpotInstrumentConfigOperationHandler,
  modifySpotInstrumentConfigOperation,
  modifySpotInstrumentConfigOperationHandler,
} from './operations';
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

    convergence.spotInstrument = function () {
      return new SpotInstrumentClient(this);
    };

    const op = convergence.operations();
    op.register(
      fetchSpotInstrumentConfigOperation,
      fetchSpotInstrumentConfigOperationHandler
    );
    op.register(
      initializeSpotInstrumentConfigOperation,
      initializeSpotInstrumentConfigOperationHandler
    );
    op.register(
      modifySpotInstrumentConfigOperation,
      modifySpotInstrumentConfigOperationHandler
    );

    convergence.addLegInstrument(
      spotInstrumentProgram.address,
      spotLegInstrumentParser
    );
  },
});

declare module '../../Convergence' {
  interface Convergence {
    spotInstrument(): SpotInstrumentClient;
  }
}

declare module '../programModule/ProgramClient' {
  interface ProgramClient {
    getSpotInstrument(programs?: Program[]): Program;
  }
}
