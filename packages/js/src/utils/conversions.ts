import { bignum } from '@convergence-rfq/beet';
import BN from 'bn.js';

export const removeDecimals = (value: bignum, decimals = 0): number => {
  const number = Number(value);

  if (decimals > 0) {
    return number / Math.pow(10, decimals);
  }

  return number;
};

export const addDecimals = (value: number, decimals = 0): BN => {
  const number = value * Math.pow(10, decimals);
  return new BN(number.toString());
};

/**
 * Used to convert timestamps from CPL to numbers in milliseconds.
 * @param timestamp {bignum} Solita timestamp
 * @returns the timestamp in milliseconds
 */
export function convertTimestamp(timestamp: bignum): number {
  return Number(timestamp) * 1_000;
}
