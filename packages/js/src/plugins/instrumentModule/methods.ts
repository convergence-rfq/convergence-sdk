import { Leg, QuoteAsset, legBeet } from '@convergence-rfq/rfq';
import { AccountMeta } from '@solana/web3.js';

import { createSerializerFromFixableBeetArgsStruct } from '../../types';
import { addDecimals } from '../../utils/conversions';
import { Convergence } from '../../Convergence';
import { Rfq, toSolitaSide } from '../rfqModule/models';
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
    side: toSolitaSide(legInstrument.getSide()),
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

export const getRemainingAccounts = async (
  convergence: Convergence,
  rfqModel: Rfq
): Promise<AccountMeta[]> => {
  const baseAssetIndexValues = [
    ...new Set(rfqModel.legs.map((leg) => leg.getBaseAssetIndex().value)),
  ];

  const accounts = await Promise.all(
    baseAssetIndexValues.map(async (index) => {
      const baseAsset = convergence.protocol().pdas().baseAsset({ index });
      const baseAssetModel = await convergence
        .protocol()
        .findBaseAssetByAddress({ address: baseAsset });

      const baseAssetAccount: AccountMeta = {
        pubkey: baseAsset,
        isSigner: false,
        isWritable: false,
      };

      let oracleAccount: AccountMeta | null = null;
      if (baseAssetModel.priceOracle.address) {
        oracleAccount = {
          pubkey: baseAssetModel.priceOracle.address,
          isSigner: false,
          isWritable: false,
        };
      }

      return { baseAssetAccount, oracleAccount };
    })
  );

  const baseAssetAccounts = accounts.map((account) => account.baseAssetAccount);
  const oracleAccounts = accounts
    .filter((account) => account.oracleAccount !== null)
    .map((account) => account.oracleAccount as AccountMeta);

  const riskEngineAccount: AccountMeta = {
    pubkey: convergence.riskEngine().pdas().config(),
    isSigner: false,
    isWritable: false,
  };

  return [riskEngineAccount, ...baseAssetAccounts, ...oracleAccounts];
};
