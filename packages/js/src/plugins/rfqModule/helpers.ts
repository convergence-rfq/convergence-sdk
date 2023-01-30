import type { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID as SPOT_INSTRUMENT_PROGRAM_ID } from '@convergence-rfq/spot-instrument';
import { PROGRAM_ID as PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ID } from '@convergence-rfq/psyoptions-european-instrument';
import { spotInstrumentProgram, SpotInstrument } from '../spotInstrumentModule';
import {
  PsyoptionsEuropeanInstrument,
  psyoptionsEuropeanInstrumentProgram,
} from '../psyoptionsEuropeanInstrumentModule';
import type { Rfq } from './models';
import type { Leg, QuoteAsset } from './types';
import { PublicKeyValues, toPublicKey } from '@/types';
import { Convergence } from '@/Convergence';
import { PsyoptionsAmericanInstrument } from '../psyoptionsAmericanInstrumentModule/models/PsyoptionsAmericanInstrument';
import { psyoptionsAmericanInstrumentProgram } from '../psyoptionsAmericanInstrumentModule/programs';

export type HasMintAddress = Rfq | PublicKey;

export const toMintAddress = (
  value: PublicKeyValues | HasMintAddress
): PublicKey => {
  return toPublicKey(value);
};

export const legsToInstruments = async (
  convergence: Convergence,
  legs: Leg[]
): Promise<
  (
    | SpotInstrument
    | PsyoptionsEuropeanInstrument
    | PsyoptionsAmericanInstrument
  )[]
> => {
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
      } else if (
        leg.instrumentProgram.equals(
          psyoptionsAmericanInstrumentProgram.address
        )
      ) {
        return await PsyoptionsAmericanInstrument.createFromLeg(
          convergence,
          leg
        );
      }

      throw new Error('Unsupported instrument program');
    })
  );
};

export const quoteAssetToInstrument = async (
  convergence: Convergence,
  quoteAsset: QuoteAsset
): Promise<SpotInstrument | PsyoptionsEuropeanInstrument> => {
  if (quoteAsset.instrumentProgram.equals(SPOT_INSTRUMENT_PROGRAM_ID)) {
    const { mint: mintPublicKey } = SpotInstrument.deserializeInstrumentData(
      Buffer.from(quoteAsset.instrumentData)
    );
    const mint = await convergence
      .tokens()
      .findMintByAddress({ address: mintPublicKey });
    return new SpotInstrument(convergence, mint);
  } else if (
    quoteAsset.instrumentProgram.equals(
      PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ID
    )
  ) {
    const { optionType, metaKey } =
      PsyoptionsEuropeanInstrument.deserializeInstrumentData(
        Buffer.from(quoteAsset.instrumentData)
      );
    const meta = await PsyoptionsEuropeanInstrument.fetchMeta(
      convergence,
      metaKey
    );
    const mint = await convergence
      .tokens()
      .findMintByAddress({ address: meta.underlyingMint });
    return new PsyoptionsEuropeanInstrument(
      convergence,
      mint,
      optionType,
      meta,
      metaKey
    );
  }
  throw new Error("Instrument doesn't exist");
};
