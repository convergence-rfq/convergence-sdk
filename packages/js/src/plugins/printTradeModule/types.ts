import { AccountMeta, PublicKey } from '@solana/web3.js';
import { BaseAssetIndex } from '@convergence-rfq/rfq';
import { InstrumentType } from '../riskEngineModule';
import { LegSide } from '../rfqModule';

export interface PrintTrade {
  getPrintTradeProviderProgramId: () => PublicKey;
  getLegs: () => PrintTradeLeg[];
  getQuote: () => PrintTradeQuote;
  getValidationAccounts: () => AccountMeta[];
}

export interface PrintTradeLeg {
  getInstrumentType: () => InstrumentType;
  getBaseAssetIndex: () => BaseAssetIndex;
  getAmount: () => number;
  getDecimals: () => number;
  getSide: () => LegSide;
  serializeInstrumentData: () => Buffer;
}

export interface PrintTradeQuote {
  getDecimals: () => number;
  serializeInstrumentData: () => Buffer;
}
