import {
  isFixedSizeBaseAsset,
  isFixedSizeNone,
  isFixedSizeQuoteAsset,
  isQuoteFixedSize,
  isQuoteStandard,
  Quote,
} from '@convergence-rfq/rfq';
import BN from 'bn.js';

import {
  ABSOLUTE_PRICE_DECIMALS,
  LEG_MULTIPLIER_DECIMALS,
} from '../rfqModule/constants';
import { Rfq, toSolitaFixedSize } from '../rfqModule/models';

export function extractLegsMultiplierBps(rfq: Rfq, quote: Quote) {
  const fixedSize = toSolitaFixedSize(rfq.size, rfq.quoteAsset.getDecimals());

  if (isFixedSizeNone(fixedSize)) {
    if (isQuoteFixedSize(quote)) {
      throw Error('Fixed size quote cannot be provided to non-fixed size rfq');
    }

    return quote.legsMultiplierBps;
  } else if (isFixedSizeBaseAsset(fixedSize)) {
    if (isQuoteStandard(quote)) {
      throw Error('Non fixed size quote cannot be provided to fixed size rfq');
    }

    return fixedSize.legsMultiplierBps;
  } else if (isFixedSizeQuoteAsset(fixedSize)) {
    if (isQuoteStandard(quote)) {
      throw Error('Non fixed size quote cannot be provided to fixed size rfq');
    }

    const priceBps = new BN(quote.priceQuote.amountBps);
    if (priceBps.ltn(0)) {
      throw Error('Negative prices are not allowed for fixed quote amount rfq');
    }

    // Note that the leg multiplier and absolute price decimals are hardcoded in the
    // protocol. The number is currently 9 which is somewhat arbitrary.
    return new BN(fixedSize.quoteAmount)
      .mul(new BN(10).pow(new BN(LEG_MULTIPLIER_DECIMALS + ABSOLUTE_PRICE_DECIMALS)))
      .div(priceBps);
  }

  throw new Error('Invalid fixed size');
}
