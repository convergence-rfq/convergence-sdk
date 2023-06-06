import {
  Convergence,
  Leg,
  LegInstrument,
  LegInstrumentParser,
  PublicKey,
} from '@/index';
import { ConvergencePlugin, Program } from '@/types';

/** @group Plugins */
export const instrumentModule = (): ConvergencePlugin => ({
  install(convergence: Convergence) {
    const legInstrumentFactories: [PublicKey, LegInstrumentParser][] = [];

    convergence.addLegInstrument = function (
      programAddress: PublicKey,
      factory: LegInstrumentParser
    ) {
      const entry = legInstrumentFactories.find(([key]) =>
        programAddress.equals(key)
      );

      if (entry) {
        throw new Error(
          `Instrument for address ${programAddress.toString()} is already added!`
        );
      }

      legInstrumentFactories.push([programAddress, factory]);
    };

    convergence.parseLegInstrument = function (leg: Leg) {
      const factory = legInstrumentFactories.find(([key]) =>
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
    parseLegInstrument(leg: Leg): Promise<LegInstrument>;
  }
}

declare module '../programModule/ProgramClient' {
  interface ProgramClient {
    getSpotInstrument(programs?: Program[]): Program;
  }
}
