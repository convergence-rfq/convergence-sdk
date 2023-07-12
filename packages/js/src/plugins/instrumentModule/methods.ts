import { Leg, QuoteAsset, legBeet } from '@convergence-rfq/rfq';

import { AccountMeta } from '@solana/web3.js';
import { createSerializerFromFixableBeetArgsStruct } from '../../types';
import { addDecimals } from '../../utils/conversions';
import { toSolitaLegSide } from '../rfqModule/models/LegSide';
import { LegInstrument, QuoteInstrument } from './types';

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

// TODO remove async part after option instruments refactoring
export async function getValidationAccounts(
  legInstrument: LegInstrument
): Promise<AccountMeta[]> {
  return [getProgramAccount(legInstrument)].concat(
    await legInstrument.getValidationAccounts()
  );
}

export function toQuote(legInstrument: QuoteInstrument): QuoteAsset {
  return {
    instrumentProgram: legInstrument.getProgramId(),
    instrumentData: legInstrument.serializeInstrumentData(),
    instrumentDecimals: legInstrument.getDecimals(),
  };
}
