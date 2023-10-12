import { Confirmation as SolitaConfirmation } from '@convergence-rfq/rfq';
import { COption, bignum } from '@convergence-rfq/beet';
import {
  ResponseSide,
  fromSolitaQuoteSide,
  toSolitaQuoteSide,
} from './ResponseSide';
import { addDecimals, removeDecimals } from '@/utils/conversions';

export interface Confirmation {
  readonly side: ResponseSide;
  readonly overrideLegAmount?: number;
}

export function fromSolitaConfirmation(
  confirmation: SolitaConfirmation,
  legAmountDecimals: number
): Confirmation {
  if (confirmation.overrideLegAmount) {
    const overrideLegAmount = removeDecimals(
      confirmation.overrideLegAmount,
      legAmountDecimals
    );
    return {
      side: fromSolitaQuoteSide(confirmation.side),
      overrideLegAmount,
    };
  }
  return {
    side: fromSolitaQuoteSide(confirmation.side),
  };
}

export function toSolitaConfirmation(
  confirmation: Confirmation,
  legAmountDecimals: number
) {
  if (confirmation.overrideLegAmount) {
    const overrideLegAmount = toSolitaOverrideLegAmount(
      confirmation.overrideLegAmount,
      legAmountDecimals
    );
    return {
      side: toSolitaQuoteSide(confirmation.side),
      overrideLegAmount,
    };
  }
  return {
    side: toSolitaQuoteSide(confirmation.side),
  };
}

export function toSolitaOverrideLegAmount(
  oveerideLegMultiplier: number,
  legAmountDecimals: number
): COption<bignum> {
  return addDecimals(oveerideLegMultiplier, legAmountDecimals);
}
