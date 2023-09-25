import { Leg as SolitaLeg } from '@convergence-rfq/rfq';

import { LegInstrument, LegInstrumentParser } from './types';
import type { Convergence } from '@/Convergence';
import { ConvergencePlugin, Program, PublicKey } from '@/types';

/** @group Plugins */
export const instrumentModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    const legInstrumentParsers: [PublicKey, LegInstrumentParser][] = [];

    convergence.addLegInstrument = function (
      programAddress: PublicKey,
      factory: LegInstrumentParser
    ) {
      const entry = legInstrumentParsers.find(([key]) =>
        programAddress.equals(key)
      );

      if (entry) {
        throw new Error(
          `Instrument for address ${programAddress.toString()} is already added!`
        );
      }

      legInstrumentParsers.push([programAddress, factory]);
    };

    convergence.parseLegInstrument = async function (leg: SolitaLeg) {
      const factory = legInstrumentParsers.find(([key]) =>
        leg.instrumentProgram.equals(key)
      )?.[1];

      if (!factory) {
        throw new Error(
          `Missing leg instrument for address ${leg.instrumentProgram.toString()}`
        );
      }

      return factory.parseFromLeg(convergence, leg);
    };
  },
});

declare module '../../Convergence' {
  interface Convergence {
    addLegInstrument(
      programAddress: PublicKey,
      factory: LegInstrumentParser
    ): void;
    parseLegInstrument(leg: SolitaLeg): Promise<LegInstrument>;
  }
}

declare module '../programModule/ProgramClient' {
  interface ProgramClient {
    getSpotInstrument(programs?: Program[]): Program;
  }
}
