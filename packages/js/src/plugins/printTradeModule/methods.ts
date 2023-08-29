import { Leg, QuoteAsset, legBeet } from '@convergence-rfq/rfq';
import { AccountMeta } from '@solana/web3.js';
import { toSolitaLegSide } from '../rfqModule';
import { toNumberInstrumentType } from '../riskEngineModule';
import { PrintTrade, PrintTradeLeg, PrintTradeQuote } from './types';
import { addDecimals } from '@/utils';
import { createSerializerFromFixableBeetArgsStruct } from '@/types';

export function printTradeToSolitaLeg(printTradeLeg: PrintTradeLeg): Leg {
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
  const legSerializer = createSerializerFromFixableBeetArgsStruct(legBeet);
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

export function getPrintTradeValidationAccounts(
  printTrade: PrintTrade
): AccountMeta[] {
  return [getPrintTradeProgramAccount(printTrade)].concat(
    printTrade.getValidationAccounts()
  );
}
