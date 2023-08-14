import {
  QuoteSide,
  Confirmation as SolitaConfirmation,
} from '@convergence-rfq/rfq';
import { COption, bignum } from '@convergence-rfq/beet';
import { LEG_MULTIPLIER_DECIMALS } from '../constants';
import { addDecimals, removeDecimals } from '@/utils/conversions';

export interface Confirmation {
  readonly side: QuoteSide;
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
      side: confirmation.side,
      overrideLegMultiplier,
    };
  }
  return {
    side: confirmation.side,
  };
}

export function toSolitaConfirmation(confirmation: Confirmation) {
  if (confirmation.overrideLegMultiplier) {
    const overrideLegMultiplierBps = toSolitaOverrideLegMultiplierBps(
      confirmation.overrideLegMultiplier
    );
    return {
      side: confirmation.side,
      overrideLegMultiplierBps,
    };
  }
  return {
    side: confirmation.side,
  };
}

export function toSolitaOverrideLegMultiplierBps(
  oveerideLegMultiplier: number
): COption<bignum> {
  return addDecimals(oveerideLegMultiplier, LEG_MULTIPLIER_DECIMALS);
}
