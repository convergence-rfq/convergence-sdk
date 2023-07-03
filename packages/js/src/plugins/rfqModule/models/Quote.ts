import { Quote as SolitaQuote } from '@convergence-rfq/rfq';
import { ABSOLUTE_PRICE_DECIMALS, LEG_MULTIPLIER_DECIMALS } from '../constants';
import { addDecimals, removeDecimals } from '@/utils';

export interface Quote {
  readonly price: number;
  readonly legsMultiplierBps?: number;
}

export function fromSolitaQuote(quote: SolitaQuote, quoteDecimals: number): Quote {
  switch(quote.__kind) {
    case 'Standard': {
      return {
        price: removeDecimals(
          quote.priceQuote.amountBps,
          quoteDecimals + ABSOLUTE_PRICE_DECIMALS
        ),
        legsMultiplierBps: removeDecimals(quote.legsMultiplierBps, LEG_MULTIPLIER_DECIMALS)
      };
    }
    case 'FixedSize': {
      return {
        price: removeDecimals(
          quote.priceQuote.amountBps,
          quoteDecimals + ABSOLUTE_PRICE_DECIMALS
        ),
      };
    }
  }
}

export function toSolitaQuote(quote: Quote, quoteDecimals: number): SolitaQuote {
  if (quote.legsMultiplierBps) {
    return {
      __kind: 'Standard',
      legsMultiplierBps: addDecimals(quote.legsMultiplierBps, LEG_MULTIPLIER_DECIMALS),
      priceQuote: {
        __kind: 'AbsolutePrice',
        amountBps: addDecimals(quote.price, quoteDecimals + ABSOLUTE_PRICE_DECIMALS),
      },
    }
  }
  return {
    __kind: 'FixedSize',
    priceQuote: {
      __kind: 'AbsolutePrice',
      amountBps: addDecimals(quote.price, quoteDecimals + ABSOLUTE_PRICE_DECIMALS),
    },
  }
}

export function isQuoteStandard(value: Quote): value is Quote & { legsMultiplierBps: number } {
  return typeof value.legsMultiplierBps !== 'undefined';
}

export function isQuoteFixedSize(value: Quote): value is Quote & { legsMultiplierBps: never } {
  return typeof value.legsMultiplierBps === 'undefined';
}
