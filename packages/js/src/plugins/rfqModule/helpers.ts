import type { PublicKey } from '@solana/web3.js';
import type { Rfq } from './models';
import { PublicKeyValues, toPublicKey } from '@/types';

export type HasMintAddress = Rfq | PublicKey;

export const toMintAddress = (
  value: PublicKeyValues | HasMintAddress
): PublicKey => {
  return toPublicKey(value);
};
