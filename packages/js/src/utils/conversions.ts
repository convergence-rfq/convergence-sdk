import { bignum } from '@convergence-rfq/beet';
import BN from 'bn.js';

/**
 * Take bignum and convert it to a UI number while taking into account
 * token mint decimals.
 *
 * ```
 * const value = 9_500_000_000
 * const decimals = 9
 * removeDecimals(value, decimals) // 9.5
 * ```
 *
 * @param value {number} BN number
 * @param decimals {number} amount of decimals to remove
 * @returns {number} UI representation of the number
 */
// eslint-disable-next-line @typescript-eslint/no-inferrable-types
export const removeDecimals = (value: bignum, decimals: number = 0): number => {
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
 * addDecimals(value, decimals) // 9_500_000_000
 * ```
 *
 * @param value {number} UI number
 * @param decimals {number} amount of decimals to add
 * @returns {BN} BN representation of the number
 */
// eslint-disable-next-line @typescript-eslint/no-inferrable-types
export const addDecimals = (value: number, decimals: number = 0): BN => {
  const number = value * Math.pow(10, decimals);
  if (number !== Math.floor(number)) {
    throw new Error('Precision lost when converting number to BN');
  }
  return new BN(number.toString());
};

/**
 * Used to convert timestamps from CPL to numbers in milliseconds.
 *
 * @param timestamp {bignum} Solita timestamp
 * @returns {number} timestamp in milliseconds
 */
export function convertTimestamp(timestamp: bignum): number {
  return Number(timestamp) * 1_000;
}
