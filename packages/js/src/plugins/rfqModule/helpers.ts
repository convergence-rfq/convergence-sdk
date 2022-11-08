import type { PublicKey } from '@solana/web3.js';
import type { Rfq, Leg } from './models';
import { PublicKeyValues, toPublicKey } from '@/types';

export type HasMintAddress = Rfq | Leg | PublicKey;

export const toMintAddress = (
  value: PublicKeyValues | HasMintAddress
): PublicKey => {
  return typeof value === 'object' && 'mintAddress' in value
    ? value.mintAddress
    : toPublicKey(value);
};
