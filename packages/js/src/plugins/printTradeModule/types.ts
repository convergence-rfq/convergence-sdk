import { AccountMeta, PublicKey } from '@solana/web3.js';
import {
  BaseAssetIndex,
  Leg as SolitaLeg,
  QuoteAsset as SolitaQuoteAsset,
} from '@convergence-rfq/rfq';
import { InstrumentType } from '../riskEngineModule';
import { LegSide } from '../rfqModule';
import { Convergence } from '@/Convergence';

export interface PrintTrade {
  getPrintTradeProviderProgramId: () => PublicKey;
  getLegs: () => PrintTradeLeg[];
  getQuote: () => PrintTradeQuote;
  getValidationAccounts: () => Promise<AccountMeta[]>;
}

export interface PrintTradeLeg {
  legType: 'printTrade';

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

export interface PrintTradeParser {
  parsePrintTrade(
    cvg: Convergence,
    legs: SolitaLeg[],
    quote: SolitaQuoteAsset
  ): PrintTrade;
}
