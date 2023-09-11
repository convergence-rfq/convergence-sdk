import { Leg, QuoteAsset, legBeet } from '@convergence-rfq/rfq';
import { AccountMeta } from '@solana/web3.js';
import {
  Rfq,
  Response,
  AuthoritySide,
  toSolitaLegSide,
} from '../rfqModule/models';
import { toNumberInstrumentType } from '../riskEngineModule/models';
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

export async function getPrintTradeValidationAccounts(
  printTrade: PrintTrade
): Promise<AccountMeta[]> {
  return [getPrintTradeProgramAccount(printTrade)].concat(
    await printTrade.getValidationAccounts()
  );
}

export async function getSettlementPreparationAccounts(
  printTrade: PrintTrade,
  rfq: Rfq,
  response: Response,
  side: AuthoritySide,
  additionalInfo: any
): Promise<AccountMeta[]> {
  return [getPrintTradeProgramAccount(printTrade)].concat(
    await printTrade.getSettlementPreparationAccounts(
      rfq,
      response,
      side,
      additionalInfo
    )
  );
}
