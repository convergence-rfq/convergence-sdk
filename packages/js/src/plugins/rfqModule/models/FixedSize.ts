import { FixedSize as SolitaFixedSize } from '@convergence-rfq/rfq';

import { addDecimals, removeDecimals } from '../../../utils/conversions';
import { LEG_MULTIPLIER_DECIMALS } from '../constants';

interface None {
  type: 'open';
}

interface BaseAsset {
  type: 'fixed-base';
  amount: number;
}

interface QuoteAsset {
  type: 'fixed-quote';
  amount: number;
}

export type FixedSize = Readonly<None | BaseAsset | QuoteAsset>;

export function fromSolitaFixedSize(
  fixedSize: SolitaFixedSize,
  quoteAssetDecimals: number
): FixedSize {
  switch (fixedSize.__kind) {
    case 'None': {
      return {
        type: 'open',
      };
    }
    case 'BaseAsset': {
      return {
        type: 'fixed-base',
        amount: removeDecimals(
          fixedSize.legsMultiplierBps,
          LEG_MULTIPLIER_DECIMALS
        ),
      };
    }
    case 'QuoteAsset': {
      return {
        type: 'fixed-quote',
        amount: removeDecimals(fixedSize.quoteAmount, quoteAssetDecimals),
      };
    }
  }
}

export function toSolitaFixedSize(
  fixedSize: FixedSize,
  quoteAssetDecimals: number
): SolitaFixedSize {
  switch (fixedSize.type) {
    case 'open': {
      return {
        __kind: 'None',
        padding: 0, //TODO: Is this required?
      };
    }
    case 'fixed-base': {
      return {
        __kind: 'BaseAsset',
        legsMultiplierBps: addDecimals(
          fixedSize.amount,
          LEG_MULTIPLIER_DECIMALS
        ),
      };
    }
    case 'fixed-quote': {
      return {
        __kind: 'QuoteAsset',
        quoteAmount: addDecimals(fixedSize.amount, quoteAssetDecimals),
      };
    }
  }
}

export const isFixedSizeOpen = (
  x: FixedSize
): x is FixedSize & { amount: undefined } => x.type === 'open';
export const isFixedSizeBaseAsset = (
  x: FixedSize
): x is FixedSize & { amount: number } => x.type === 'fixed-base';
export const isFixedSizeQuoteAsset = (
  x: FixedSize
): x is FixedSize & { amount: number } => x.type === 'fixed-quote';
