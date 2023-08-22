import { Leg, QuoteAsset, legBeet } from '@convergence-rfq/rfq';

import { AccountMeta, PublicKey } from '@solana/web3.js';
import { createSerializerFromFixableBeetArgsStruct } from '../../types';
import { addDecimals } from '../../utils/conversions';
import { toSolitaLegSide } from '../rfqModule/models/LegSide';
import { Protocol } from '../protocolModule';
import { LegInstrument, QuoteInstrument } from './types';
import { Convergence } from '@/Convergence';

export function toLeg(legInstrument: LegInstrument): Leg {
  return {
    settlementTypeMetadata: {
      __kind: 'Instrument',
      instrumentIndex: legInstrument.getInstrumentIndex(),
    },
    baseAssetIndex: legInstrument.getBaseAssetIndex(),
    data: legInstrument.serializeInstrumentData(),
    amount: addDecimals(legInstrument.getAmount(), legInstrument.getDecimals()),
    amountDecimals: legInstrument.getDecimals(),
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
    settlementTypeMetadata: {
      __kind: 'Instrument',
      instrumentIndex: legInstrument.getInstrumentIndex(),
    },
    data: legInstrument.serializeInstrumentData(),
    decimals: legInstrument.getDecimals(),
  };
}

export const legToBaseAssetMint = (
  convergence: Convergence,
  leg: LegInstrument
) => {
  return convergence.tokens().findMintByAddress({
    address: leg.getAssetMint(),
  });
};

export const getInstrumentProgramIndex = (
  protocol: Protocol,
  programAddress: PublicKey
) => {
  const instrumentIndex = protocol.instruments.findIndex((instrument) =>
    instrument.programKey.equals(programAddress)
  );

  if (instrumentIndex === -1) {
    throw Error('Cannot find spot instrument program in protocol!');
  }

  return instrumentIndex;
};
