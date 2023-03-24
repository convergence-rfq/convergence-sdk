import { Quote, isQuoteFixedSize, PriceQuote } from '@convergence-rfq/rfq';
import { apiNumberToSolita, solitaNumberToApi } from '../../../utils';
import { ABSOLUTE_PRICE_DECIMALS, LEG_MULTIPLIER_DECIMALS } from '../constants';

export type ApiQuote =
  | Readonly<{
      kind: 'Standard';
      priceQuote: number;
      quoteDecimals: number;
      legsMultiplier: number;
    }>
  | Readonly<{ kind: 'FixedSize'; priceQuote: number; quoteDecimals: number }>;

export function toApiQuote(value: Quote, quoteDecimals: number): ApiQuote {
  const priceQuote = solitaNumberToApi(
    value.priceQuote.amountBps,
    quoteDecimals + ABSOLUTE_PRICE_DECIMALS
  );
  if (isQuoteFixedSize(value)) {
    return { kind: 'FixedSize', priceQuote, quoteDecimals };
  }

  return {
    kind: 'Standard',
    priceQuote,
    quoteDecimals,
    legsMultiplier: solitaNumberToApi(
      value.legsMultiplierBps,
      LEG_MULTIPLIER_DECIMALS
    ),
  };
}

export function toSolitaQuote(value: ApiQuote): Quote {
  const priceQuote = {
    __kind: 'AbsolutePrice',
    amountBps: apiNumberToSolita(
      value.priceQuote,
      value.quoteDecimals + ABSOLUTE_PRICE_DECIMALS
    ),
  } as PriceQuote;
  if (value.kind == 'FixedSize') {
    return {
      __kind: 'FixedSize',
      priceQuote,
    };
  }

  return {
    __kind: 'Standard',
    priceQuote,
    legsMultiplierBps: apiNumberToSolita(
      value.legsMultiplier,
      LEG_MULTIPLIER_DECIMALS
    ),
  };
}
