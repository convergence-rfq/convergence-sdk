import { AccountMeta, PublicKey } from '@solana/web3.js';
import {
  BaseAssetIndex,
  Leg as SolitaLeg,
  QuoteAsset as SolitaQuoteAsset,
} from '@convergence-rfq/rfq';
import { InstrumentType } from '../riskEngineModule';
import {
  LegSide,
  AuthoritySide,
  PrintTradeResponse,
  PrintTradeRfq,
} from '../rfqModule';
import { Convergence } from '@/Convergence';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

export interface PrintTrade {
  getPrintTradeProviderProgramId: () => PublicKey;
  getLegs: () => PrintTradeLeg[];
  getQuote: () => PrintTradeQuote;
  getValidationAccounts: () => Promise<AccountMeta[]>;
  getSettlementPreparations: (
    rfq: PrintTradeRfq,
    response: PrintTradeResponse,
    side: AuthoritySide,
    options: TransactionBuilderOptions
  ) => Promise<{ accounts: AccountMeta[]; builders: TransactionBuilder[] }>;
  getSettlementAccounts: (
    rfq: PrintTradeRfq,
    response: PrintTradeResponse
  ) => Promise<AccountMeta[]>;
  getRevertPreparationAccounts: (
    rfq: PrintTradeRfq,
    response: PrintTradeResponse,
    side: AuthoritySide
  ) => Promise<AccountMeta[]>;
  getCleanUpAccounts: (
    rfq: PrintTradeRfq,
    response: PrintTradeResponse
  ) => Promise<AccountMeta[]>;
  getValidateResponseAccounts: (
    additionalData: AdditionalResponseData | undefined
  ) => Promise<AccountMeta[]>;
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

export abstract class AdditionalResponseData {
  abstract serialize(): Buffer;
}
