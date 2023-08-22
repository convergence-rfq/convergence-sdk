import { Leg as SolitaLeg } from '@convergence-rfq/rfq';

import { Protocol } from '../protocolModule';
import { LegInstrument, LegInstrumentParser } from './types';
import type { Convergence } from '@/Convergence';
import { ConvergencePlugin, Program, PublicKey } from '@/types';

/** @group Plugins */
export const instrumentModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    const legInstrumentParsers = new Map<PublicKey, LegInstrumentParser>();

    convergence.addLegInstrument = function (
      instrumentProgramAddress: PublicKey,
      factory: LegInstrumentParser
    ) {
      if (legInstrumentParsers.has(instrumentProgramAddress)) {
        throw new Error(
          `Instrument for program ${instrumentProgramAddress} is already added!`
        );
      }

      legInstrumentParsers.set(instrumentProgramAddress, factory);
    };

    convergence.parseLegInstrument = function (
      leg: SolitaLeg,
      protocol: Protocol
    ) {
      if (leg.settlementTypeMetadata.__kind !== 'Instrument') {
        throw new Error(
          'Leg is not settled as escrow, cannot parse as instrument'
        );
      }

      const { instrumentIndex } = leg.settlementTypeMetadata;
      const instrumentProgram =
        protocol.instruments[instrumentIndex].programKey;

      const factory = legInstrumentParsers.get(instrumentProgram);

      if (!factory) {
        throw new Error(
          `Missing leg instrument for program ${instrumentProgram}`
        );
      }

      return factory.parseFromLeg(convergence, leg, instrumentIndex);
    };
  },
});

declare module '../../Convergence' {
  interface Convergence {
    addLegInstrument(
      instrumentProgramAddress: PublicKey,
      factory: LegInstrumentParser
    ): void;
    parseLegInstrument(leg: SolitaLeg, protocol: Protocol): LegInstrument;
  }
}

declare module '../programModule/ProgramClient' {
  interface ProgramClient {
    // TODO remove
    getSpotInstrument(programs?: Program[]): Program;
  }
}
