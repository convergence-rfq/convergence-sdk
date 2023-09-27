import { QuoteAsset, legBeet } from '@convergence-rfq/rfq';

import { AccountMeta, PublicKey } from '@solana/web3.js';
import { createSerializerFromFixableBeetArgsStruct } from '../../types';
import { toSolitaLegSide } from '../rfqModule/models';
import { LegInstrument, QuoteInstrument } from './types';
import { addDecimals } from '@/utils/conversions';
import { Convergence } from '@/Convergence';

export function serializeAsLeg(legInstrument: LegInstrument) {
  const legSerializer = createSerializerFromFixableBeetArgsStruct(legBeet);
  return legSerializer.serialize(toLeg(legInstrument));
}

export function toLeg(legInstrument: LegInstrument) {
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

export function getBaseAssetAccount(
  legInstrument: LegInstrument,
  cvg: Convergence
): AccountMeta {
  const baseAsset = cvg
    .protocol()
    .pdas()
    .baseAsset({ index: legInstrument.getBaseAssetIndex().value });

  const baseAssetAccount: AccountMeta = {
    pubkey: baseAsset,
    isSigner: false,
    isWritable: false,
  };

  return baseAssetAccount;
}

export async function getOracleAccount(
  baseAsset: PublicKey,
  cvg: Convergence
): Promise<AccountMeta> {
  const baseAssetModel = await cvg
    .protocol()
    .findBaseAssetByAddress({ address: baseAsset });

  if (!baseAssetModel.priceOracle.address) {
    throw Error('Base asset does not have a price oracle!');
  }
  const oracleAccount = {
    pubkey: baseAssetModel.priceOracle.address,
    isSigner: false,
    isWritable: false,
  };
  return oracleAccount;
}

export function getSerializedLegLength(legInstrument: LegInstrument) {
  return serializeAsLeg(legInstrument).length;
}

export function toQuote(legInstrument: QuoteInstrument): QuoteAsset {
  return {
    instrumentProgram: legInstrument.getProgramId(),
    instrumentData: legInstrument.serializeInstrumentData(),
    instrumentDecimals: legInstrument.getDecimals(),
  };
}
