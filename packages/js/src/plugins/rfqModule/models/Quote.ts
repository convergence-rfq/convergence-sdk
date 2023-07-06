import { Quote as SolitaQuote } from '@convergence-rfq/rfq';
import { ABSOLUTE_PRICE_DECIMALS, LEG_MULTIPLIER_DECIMALS } from '../constants';
import { addDecimals, removeDecimals } from '@/utils';
import { BN } from "bn.js";

export interface Quote {
  readonly price: number;
  readonly legsMultiplierBps?: number;
}

export function fromSolitaQuote(quote: SolitaQuote, quoteDecimals: number): Quote {
  const priceQuoteWithoutDecimals = removeDecimals(
    quote.priceQuote.amountBps,
    quoteDecimals
  );

  const price = removeDecimals(
    priceQuoteWithoutDecimals,
    ABSOLUTE_PRICE_DECIMALS
  );

  if (quote.__kind === 'Standard') {
    const legsMultiplierBps = removeDecimals(
      quote.legsMultiplierBps,
      LEG_MULTIPLIER_DECIMALS
    );
    return {
      price,
      legsMultiplierBps,
    }; 
  }
  return {
    price,
  };
}

export function toSolitaQuote(quote: Quote, quoteDecimals: number): SolitaQuote {
  const priceQuoteWithDecimals = addDecimals(
    quote.price,
    quoteDecimals
  );

  const amountBps = priceQuoteWithDecimals.mul(
    new BN(10).pow(new BN(ABSOLUTE_PRICE_DECIMALS))
  );

  if (quote.legsMultiplierBps) {
    const legsMultiplierBps = addDecimals(
      Number(quote.legsMultiplierBps),
      LEG_MULTIPLIER_DECIMALS
    );
    return {
      __kind: 'Standard',
      legsMultiplierBps,
      priceQuote:{
        __kind: 'AbsolutePrice',
        amountBps,
      }
    }
  }
  return {
    __kind: 'FixedSize',
    priceQuote: {
      __kind: 'AbsolutePrice',
      amountBps,
    },
  }
}

export function isQuoteStandard(value: Quote): value is Quote & { legsMultiplierBps: number } {
  return typeof value.legsMultiplierBps !== 'undefined';
}

export function isQuoteFixedSize(value: Quote): value is Quote & { legsMultiplierBps: undefined } {
  return typeof value.legsMultiplierBps === 'undefined';
}
