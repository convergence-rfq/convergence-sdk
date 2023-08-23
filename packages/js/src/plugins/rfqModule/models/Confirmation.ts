import { Confirmation as SolitaConfirmation } from '@convergence-rfq/rfq';
import { COption, bignum } from '@convergence-rfq/beet';
import { LEG_MULTIPLIER_DECIMALS } from '../constants';
import {
  ResponseSide,
  fromSolitaQuoteSide,
  toSolitaQuoteSide,
} from './ResponseSide';
import { addDecimals, removeDecimals } from '@/utils/conversions';

export interface Confirmation {
  readonly side: ResponseSide;
  readonly overrideLegMultiplier?: number;
}

export function fromSolitaConfirmation(
  confirmation: SolitaConfirmation
): Confirmation {
  if (confirmation.overrideLegMultiplierBps) {
    const overrideLegMultiplier = removeDecimals(
      confirmation.overrideLegMultiplierBps,
      LEG_MULTIPLIER_DECIMALS
    );
    return {
      side: fromSolitaQuoteSide(confirmation.side),
      overrideLegMultiplier,
    };
  }
  return {
    side: fromSolitaQuoteSide(confirmation.side),
  };
}

export function toSolitaConfirmation(confirmation: Confirmation) {
  if (confirmation.overrideLegMultiplier) {
    const overrideLegMultiplierBps = toSolitaOverrideLegMultiplierBps(
      confirmation.overrideLegMultiplier
    );
    return {
      side: toSolitaQuoteSide(confirmation.side),
      overrideLegMultiplierBps,
    };
  }
  return {
    side: toSolitaQuoteSide(confirmation.side),
  };
}

export function toSolitaOverrideLegMultiplierBps(
  oveerideLegMultiplier: number
): COption<bignum> {
  return addDecimals(oveerideLegMultiplier, LEG_MULTIPLIER_DECIMALS);
}
