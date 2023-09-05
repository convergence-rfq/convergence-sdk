import {
  Leg as SolitaLeg,
  QuoteAsset as SolitaQuoteAsset,
} from '@convergence-rfq/rfq';
import { PrintTrade, PrintTradeParser } from './types';
import type { Convergence } from '@/Convergence';
import { ConvergencePlugin, PublicKey } from '@/types';

/** @group Plugins */
export const printTradeModule = (): ConvergencePlugin => ({
  install(cvg: Convergence) {
    const printTradeParsers = new Map<String, PrintTradeParser>();

    cvg.addPrintTradeParser = function (
      printTradeProviderProgramId: PublicKey,
      factory: PrintTradeParser
    ) {
      if (printTradeParsers.has(printTradeProviderProgramId.toBase58())) {
        throw new Error(
          `Print trade provider for program ${printTradeProviderProgramId} is already added!`
        );
      }

      printTradeParsers.set(printTradeProviderProgramId.toBase58(), factory);
    };

    cvg.parsePrintTrade = function (
      printTradeProviderProgramId: PublicKey,
      legs: SolitaLeg[],
      quoteAsset: SolitaQuoteAsset
    ) {
      const factory = printTradeParsers.get(
        printTradeProviderProgramId.toBase58()
      );

      if (!factory) {
        throw new Error(
          `Missing print trade provider for program ${printTradeProviderProgramId}`
        );
      }

      return factory.parsePrintTrade(cvg, legs, quoteAsset);
    };
  },
});

declare module '../../Convergence' {
  interface Convergence {
    addPrintTradeParser(
      printTradeProviderProgramId: PublicKey,
      factory: PrintTradeParser
    ): void;
    parsePrintTrade(
      printTradeProviderProgramId: PublicKey,
      legs: SolitaLeg[],
      quoteAsset: SolitaQuoteAsset
    ): PrintTrade;
  }
}
