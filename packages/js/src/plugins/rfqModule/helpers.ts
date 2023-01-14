import type { PublicKey } from '@solana/web3.js';
import { spotInstrumentProgram, SpotInstrument } from '../spotInstrumentModule';
import { PsyoptionsEuropeanInstrument } from '../psyoptionsEuropeanInstrumentModule';
import type { Rfq } from './models';
import type { Leg } from './types';
import { PublicKeyValues, toPublicKey } from '@/types';
import { Convergence } from '@/Convergence';

export type HasMintAddress = Rfq | PublicKey;

export const toMintAddress = (
  value: PublicKeyValues | HasMintAddress
): PublicKey => {
  return toPublicKey(value);
};

export const legsToInstruments = async (
  convergence: Convergence,
  legs: Leg[]
): Promise<(SpotInstrument | PsyoptionsEuropeanInstrument)[]> => {
  return Promise.all(
    legs
      .filter((leg) => {
        return (
          leg.instrumentProgram.toString() ===
          spotInstrumentProgram.address.toString()
        );
      })
      .map(async (leg: Leg) => {
        //if (leg.instrumentProgram == spotInstrumentProgram.address) {
        return await SpotInstrument.createFromLeg(convergence, leg);
        //}
        //else if (
        //  leg.instrumentProgram == psyoptionsEuropeanInstrumentProgram.address
        //)
        // {
        //  return await PsyoptionsEuropeanInstrument.createFromLeg(
        //    convergence,
        //    leg
        //  );
        //}
        //throw new Error('Unsupported instrument program');
        //return null;
      })
  );
};
