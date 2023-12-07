import { ApiLeg, QuoteAsset, apiLegBeet } from '@convergence-rfq/rfq';
import { AccountMeta } from '@solana/web3.js';
import { toSolitaLegSide } from '../rfqModule/models';
import { toNumberInstrumentType } from '../riskEngineModule/models';
import { PrintTrade, PrintTradeLeg, PrintTradeQuote } from './types';
import { addDecimals } from '@/utils';
import { createSerializerFromFixableBeetArgsStruct } from '@/types';

export function printTradeToSolitaLeg(printTradeLeg: PrintTradeLeg): ApiLeg {
  return {
    settlementTypeMetadata: {
      __kind: 'PrintTrade',
      instrumentType: toNumberInstrumentType(printTradeLeg.getInstrumentType()),
    },
    baseAssetIndex: printTradeLeg.getBaseAssetIndex(),
    data: printTradeLeg.serializeInstrumentData(),
    amount: addDecimals(printTradeLeg.getAmount(), printTradeLeg.getDecimals()),
    amountDecimals: printTradeLeg.getDecimals(),
    side: toSolitaLegSide(printTradeLeg.getSide()),
  };
}

export function serializePrintTradeAsSolitaLeg(printTradeLeg: PrintTradeLeg) {
  const legSerializer = createSerializerFromFixableBeetArgsStruct(apiLegBeet);
  return legSerializer.serialize(printTradeToSolitaLeg(printTradeLeg));
}

export function printTradetoSolitaQuote(
  printTradeQuote: PrintTradeQuote
): QuoteAsset {
  return {
    settlementTypeMetadata: {
      __kind: 'PrintTrade',
      instrumentType: toNumberInstrumentType('spot'),
    },
    data: printTradeQuote.serializeInstrumentData(),
    decimals: printTradeQuote.getDecimals(),
  };
}

export function getPrintTradeProgramAccount(
  printTrade: PrintTrade
): AccountMeta {
  return {
    pubkey: printTrade.getPrintTradeProviderProgramId(),
    isSigner: false,
    isWritable: false,
  };
}

export function prependWithProviderProgram(
  printTrade: PrintTrade,
  accounts: AccountMeta[]
): AccountMeta[] {
  return [getPrintTradeProgramAccount(printTrade)].concat(accounts);
}
