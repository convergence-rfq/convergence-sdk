import type { PublicKey } from '@solana/web3.js';
import { spotInstrumentProgram, SpotInstrument } from '../spotInstrumentModule';
import {
  PsyoptionsEuropeanInstrument,
  psyoptionsEuropeanInstrumentProgram,
} from '../psyoptionsEuropeanInstrumentModule';
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
  return await Promise.all(
    legs.map(async (leg: Leg) => {
      if (leg.instrumentProgram.equals(spotInstrumentProgram.address)) {
        return await SpotInstrument.createFromLeg(convergence, leg);
      } else if (
        leg.instrumentProgram.equals(
          psyoptionsEuropeanInstrumentProgram.address
        )
      ) {
        return await PsyoptionsEuropeanInstrument.createFromLeg(
          convergence,
          leg
        );
      }
      throw new Error('Unsupported instrument program');
    })
  );
};
