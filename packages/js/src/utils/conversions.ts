import { bignum } from '@convergence-rfq/beet';
import BN from 'bn.js';

export const solitaNumberToApi = (value: bignum, decimals = 0): number => {
  const number = Number(value);

  if (decimals > 0) {
    return number / Math.pow(10, decimals);
  }

  return number;
};

export const apiNumberToSolita = (value: number, decimals = 0): bignum => {
  const number = new BN(value.toString());

  if (decimals > 0) {
    return number.mul(new BN(10).pow(new BN(decimals)));
  }

  return number;
};
