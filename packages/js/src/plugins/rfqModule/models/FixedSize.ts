import {
  FixedSize,
  isFixedSizeBaseAsset,
  isFixedSizeNone,
} from '@convergence-rfq/rfq';
import { apiNumberToSolita, solitaNumberToApi } from '../../../utils';
import { LEG_MULTIPLIER_DECIMALS } from '../constants';

export type ApiFixedSize =
  | Readonly<{ kind: 'None' }>
  | Readonly<{ kind: 'BaseAsset'; legsMultiplier: number }>
  | Readonly<{
      kind: 'QuoteAsset';
      quoteAmount: number;
      quoteDecimals: number;
    }>;

export function toApiFixedSize(
  value: FixedSize,
  quoteDecimals: number
): ApiFixedSize {
  if (isFixedSizeNone(value)) {
    return { kind: 'None' };
  } else if (isFixedSizeBaseAsset(value)) {
    return {
      kind: 'BaseAsset',
      legsMultiplier: solitaNumberToApi(
        value.legsMultiplierBps,
        LEG_MULTIPLIER_DECIMALS
      ),
    };
  }

  return {
    kind: 'QuoteAsset',
    quoteAmount: solitaNumberToApi(value.quoteAmount, quoteDecimals),
    quoteDecimals,
  };
}

export function toSolitaFixedSize(value: ApiFixedSize): FixedSize {
  if (value.kind == 'None') {
    return { __kind: 'None', padding: 0 };
  } else if (value.kind == 'BaseAsset') {
    return {
      __kind: 'BaseAsset',
      legsMultiplierBps: apiNumberToSolita(
        value.legsMultiplier,
        LEG_MULTIPLIER_DECIMALS
      ),
    };
  }

  return {
    __kind: 'QuoteAsset',
    quoteAmount: apiNumberToSolita(value.quoteAmount, value.quoteDecimals),
  };
}
