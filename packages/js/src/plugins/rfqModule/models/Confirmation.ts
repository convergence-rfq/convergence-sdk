import { Confirmation, Side } from '@convergence-rfq/rfq';
import BN from 'bn.js';
import { LEG_MULTIPLIER_DECIMALS } from '../constants';

export type ApiSide = Side;

export type ApiConfirmation = Readonly<{
  side: ApiSide;
  overrideLegMultiplier: number | null;
}>;

export function toApiConfirmation(value: Confirmation): ApiConfirmation {
  const overrideLegMultiplier = value.overrideLegMultiplierBps
    ? Number(value.overrideLegMultiplierBps) /
      Math.pow(10, LEG_MULTIPLIER_DECIMALS)
    : null;
  return { side: value.side, overrideLegMultiplier };
}

export function toSolitaConfirmation(value: ApiConfirmation): Confirmation {
  const decimalsMultiplier = new BN(10).pow(new BN(LEG_MULTIPLIER_DECIMALS));
  const overrideLegMultiplierBps = value.overrideLegMultiplier
    ? new BN(value.overrideLegMultiplier.toString()).mul(decimalsMultiplier)
    : null;

  return { side: value.side, overrideLegMultiplierBps };
}
