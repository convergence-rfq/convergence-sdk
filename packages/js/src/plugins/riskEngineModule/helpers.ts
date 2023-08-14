import {
  isFixedSizeBaseAsset,
  isFixedSizeNone,
  isFixedSizeQuoteAsset,
  isQuoteFixedSize,
  isQuoteStandard,
  Quote as SolitaQuote,
} from '@convergence-rfq/rfq';
import BN from 'bn.js';

import {
  ABSOLUTE_PRICE_DECIMALS,
  LEG_MULTIPLIER_DECIMALS,
} from '../rfqModule/constants';
import { Rfq, toSolitaFixedSize } from '../rfqModule/models';
import { removeDecimals } from '@/utils/conversions';

export function extractLegsMultiplier(rfq: Rfq, quote: SolitaQuote) {
  const fixedSize = toSolitaFixedSize(rfq.size, rfq.quoteAsset.getDecimals());

  if (isFixedSizeNone(fixedSize)) {
    if (isQuoteFixedSize(quote)) {
      throw Error('Fixed size quote cannot be provided to non-fixed size rfq');
    }

    return removeDecimals(quote.legsMultiplierBps, LEG_MULTIPLIER_DECIMALS);
  } else if (isFixedSizeBaseAsset(fixedSize)) {
    if (isQuoteStandard(quote)) {
      throw Error('Non fixed size quote cannot be provided to fixed size rfq');
    }

    return removeDecimals(fixedSize.legsMultiplierBps, LEG_MULTIPLIER_DECIMALS);
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
    const legsMultiplierBps = new BN(fixedSize.quoteAmount)
      .mul(
        new BN(10).pow(
          new BN(LEG_MULTIPLIER_DECIMALS + ABSOLUTE_PRICE_DECIMALS)
        )
      )
      .div(priceBps);

    return removeDecimals(legsMultiplierBps, LEG_MULTIPLIER_DECIMALS);
  }

  throw new Error('Invalid fixed size');
}
