import { bignum } from '@convergence-rfq/beet';
import BN from 'bn.js';

export const removeDecimals = (value: bignum, decimals = 0): number => {
  const number = Number(value);

  if (decimals > 0) {
    return number / Math.pow(10, decimals);
  }

  return number;
};

export const addDecimals = (value: number, decimals = 0): bignum => {
  const number = value * Math.pow(10, decimals);
  return new BN(number.toString());
};
