import { bignum } from '@convergence-rfq/beet';
import BN from 'bn.js';

/**
 * Take bignum and convert it to a UI number while taking into account
 * token mint decimals.
 *
 * ```
 * const value = 9_500_000_000
 * const decimals = 9
 * const ui = removeDecimals(value, decimals) // 9.5
 * ```
 *
 * @param value
 * @param decimals
 * @returns
 */
export const removeDecimals = (value: bignum, decimals = 0): number => {
  const number = Number(value);

  if (decimals > 0) {
    return number / Math.pow(10, decimals);
  }

  return number;
};

/**
 * Take UI number and convert it to a BN while taking into account
 * token mint decimals.
 *
 * ```
 * const value = 9.5
 * const decimals = 9
 * const ui = addDecimals(value, decimals) // 9_500_000_000
 * ```
 *
 * @param value
 * @param decimals
 * @returns
 */
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
