import type { PublicKey } from '@solana/web3.js';
import type { Rfq, RfqWithToken } from './models';
import type { Metadata } from './models/Metadata';
import { PublicKeyValues, toPublicKey } from '@/types';

export type HasMintAddress = Rfq | RfqWithToken | Metadata | PublicKey;

export const toMintAddress = (
  value: PublicKeyValues | HasMintAddress
): PublicKey => {
  return typeof value === 'object' && 'mintAddress' in value
    ? value.mintAddress
    : toPublicKey(value);
};
