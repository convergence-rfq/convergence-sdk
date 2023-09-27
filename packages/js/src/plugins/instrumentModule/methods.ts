import { Leg, QuoteAsset, legBeet } from '@convergence-rfq/rfq';

import { AccountMeta } from '@solana/web3.js';
import { createSerializerFromFixableBeetArgsStruct } from '../../types';
import { addDecimals } from '../../utils/conversions';
import { toSolitaLegSide } from '../rfqModule/models/LegSide';
import { PsyoptionsEuropeanInstrument } from '../psyoptionsEuropeanInstrumentModule';
import { PsyoptionsAmericanInstrument } from '../psyoptionsAmericanInstrumentModule';
import { SpotLegInstrument } from '../spotInstrumentModule';
import { LegInstrument, QuoteInstrument } from './types';
import { Convergence } from '@/Convergence';

export function toLeg(legInstrument: LegInstrument): Leg {
  return {
    instrumentProgram: legInstrument.getProgramId(),
    baseAssetIndex: legInstrument.getBaseAssetIndex(),
    instrumentData: legInstrument.serializeInstrumentData(),
    instrumentAmount: addDecimals(
      legInstrument.getAmount(),
      legInstrument.getDecimals()
    ),
    instrumentDecimals: legInstrument.getDecimals(),
    side: toSolitaLegSide(legInstrument.getSide()),
  };
}

export function serializeAsLeg(legInstrument: LegInstrument) {
  const legSerializer = createSerializerFromFixableBeetArgsStruct(legBeet);
  return legSerializer.serialize(toLeg(legInstrument));
}

export function getSerializedLegLength(legInstrument: LegInstrument) {
  return serializeAsLeg(legInstrument).length;
}

export function getProgramAccount(legInstrument: LegInstrument): AccountMeta {
  return {
    pubkey: legInstrument.getProgramId(),
    isSigner: false,
    isWritable: false,
  };
}

export function getValidationAccounts(
  legInstrument: LegInstrument
): AccountMeta[] {
  return [getProgramAccount(legInstrument)].concat(
    legInstrument.getValidationAccounts()
  );
}

export function toQuote(legInstrument: QuoteInstrument): QuoteAsset {
  return {
    instrumentProgram: legInstrument.getProgramId(),
    instrumentData: legInstrument.serializeInstrumentData(),
    instrumentDecimals: legInstrument.getDecimals(),
  };
}

//TODO: refactor this method to use instrument interface in the future
export const legToBaseAssetMint = async (
  convergence: Convergence,
  leg: LegInstrument
) => {
  if (leg instanceof PsyoptionsEuropeanInstrument) {
    const euroMetaOptionMint = await convergence.tokens().findMintByAddress({
      address: leg.optionMint,
    });

    return euroMetaOptionMint;
  } else if (leg instanceof PsyoptionsAmericanInstrument) {
    const americanOptionMint = await convergence.tokens().findMintByAddress({
      address: leg.optionMint,
    });

    return americanOptionMint;
  } else if (leg instanceof SpotLegInstrument) {
    const mint = await convergence.tokens().findMintByAddress({
      address: leg.mintAddress,
    });

    return mint;
  }

  throw Error('Unsupported instrument!');
};
