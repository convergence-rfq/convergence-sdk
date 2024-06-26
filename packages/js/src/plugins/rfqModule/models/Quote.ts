import { Quote as SolitaQuote } from '@convergence-rfq/rfq';
import { BN } from 'bn.js';

import { ABSOLUTE_PRICE_DECIMALS, LEG_MULTIPLIER_DECIMALS } from '../constants';
import { addDecimals, removeDecimals } from '@/utils';

export interface Quote {
  readonly price: number;
  readonly legsMultiplier?: number;
}

export function fromSolitaQuote(
  quote: SolitaQuote,
  quoteDecimals: number
): Quote {
  const priceQuoteWithoutDecimals = removeDecimals(
    quote.priceQuote.amountBps,
    quoteDecimals
  );

  /**
   * TODO: Investigate why we can't combine these operations together
   *
   * The following should work, but doesn't
   * ```typescript
   * const price = removeDecimals(quote.priceQuote.amountBps, quoteDecimals + ABSOLUTE_PRICE_DECIMALS);
   * ```
   */
  const price = removeDecimals(
    priceQuoteWithoutDecimals,
    ABSOLUTE_PRICE_DECIMALS
  );

  if (quote.__kind === 'Standard') {
    const legsMultiplier = removeDecimals(
      quote.legsMultiplierBps,
      LEG_MULTIPLIER_DECIMALS
    );
    return {
      price,
      legsMultiplier,
    };
  }
  return {
    price,
  };
}

export function toSolitaQuote(
  quote: Quote,
  quoteDecimals: number
): SolitaQuote {
  const priceQuoteWithDecimals = addDecimals(quote.price, quoteDecimals);

  /**
   * TODO: Investigate why we are truncating here, without it we get "Error: Invalid character" from BN.
   *
   * Examples that don't work but probably should
   * ```typescript
   * const amountBps = addDecimals(quote.price, quoteDecimals + ABSOLUTE_PRICE_DECIMALS)
   * const amountBps = quote.price * Math.pow(10, quoteDecimals + ABSOLUTE_PRICE_DECIMALS);
   * ```
   */
  const amountBps = priceQuoteWithDecimals.mul(
    new BN(10).pow(new BN(ABSOLUTE_PRICE_DECIMALS))
  );

  if (quote.legsMultiplier) {
    const legsMultiplierBps = addDecimals(
      Number(quote.legsMultiplier),
      LEG_MULTIPLIER_DECIMALS
    );
    return {
      __kind: 'Standard',
      legsMultiplierBps,
      priceQuote: {
        __kind: 'AbsolutePrice',
        amountBps,
      },
    };
  }
  return {
    __kind: 'FixedSize',
    priceQuote: {
      __kind: 'AbsolutePrice',
      amountBps,
    },
  };
}

export function isQuoteStandard(
  value: Quote
): value is Quote & { legsMultiplier: number } {
  return typeof value.legsMultiplier !== 'undefined';
}

export function isQuoteFixedSize(
  value: Quote
): value is Quote & { legsMultiplier: undefined } {
  return typeof value.legsMultiplier === 'undefined';
}
