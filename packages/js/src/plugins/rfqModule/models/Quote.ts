import { Quote as SolitaQuote } from '@convergence-rfq/rfq';
import { BN } from 'bn.js';

import { ABSOLUTE_PRICE_DECIMALS } from '../constants';
import { addDecimals, removeDecimals } from '@/utils';

export interface Quote {
  readonly price: number;
  readonly legAmount?: number;
}

export function fromSolitaQuote(
  quote: SolitaQuote,
  legAssetDecimals: number,
  quoteAssetDecimals: number
): Quote {
  const priceQuoteWithoutDecimals = removeDecimals(
    quote.priceQuote.amountBps,
    quoteAssetDecimals
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
    const legAmount = removeDecimals(quote.legAmount, legAssetDecimals);
    return {
      price,
      legAmount,
    };
  }
  return {
    price,
  };
}

export function toSolitaQuote(
  quote: Quote,
  legAssetDecimals: number,
  quoteAssetDecimals: number
): SolitaQuote {
  const priceQuoteWithDecimals = addDecimals(quote.price, quoteAssetDecimals);

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

  if (quote.legAmount) {
    const legAmount = addDecimals(Number(quote.legAmount), legAssetDecimals);
    return {
      __kind: 'Standard',
      legAmount,
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
): value is Quote & { legAmount: number } {
  return typeof value.legAmount !== 'undefined';
}

export function isQuoteFixedSize(
  value: Quote
): value is Quote & { legAmount: undefined } {
  return typeof value.legAmount === 'undefined';
}
