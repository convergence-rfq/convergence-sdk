import type { PublicKey } from '@solana/web3.js';
import type { Mint, Token } from '../../tokenModule';
import type { Metadata } from './Metadata';
import { isSftWithToken, SftWithToken, toSft, toSftWithToken } from './Sft';
import { assert } from '@/utils';
import type { Pda } from '@/types';

/**
 * This model captures all the relevant information about an RFQ
 * in the Solana blockchain. That includes the Rfq's metadata account,
 * its mint account, its edition account and its off-chain JSON metadata.
 *
 * @group Models
 */
export type Rfq = Omit<Metadata, 'model' | 'address' | 'mintAddress'> & {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'rfq';

  /** The mint address of the Rfq. */
  readonly address: PublicKey;

  /** The metadata address of the Rfq. */
  readonly metadataAddress: Pda;

  /** The mint account of the Rfq. */
  readonly mint: Mint;
};

/** @group Model Helpers */
export const isRfq = (value: any): value is Rfq =>
  typeof value === 'object' && value.model === 'nft';

/** @group Model Helpers */
export function assertRfq(value: any): asserts value is Rfq {
  assert(isRfq(value), `Expected Rfq model`);
}

/** @group Model Helpers */
export const toRfq = (metadata: Metadata, mint: Mint): Rfq => ({
  ...toSft(metadata, mint),
  model: 'rfq',
});

/** @group Models */
export type RfqWithToken = Rfq & { token: Token };

/** @group Model Helpers */
export const isRfqWithToken = (value: any): value is RfqWithToken =>
  isRfq(value) && 'token' in value;

/** @group Model Helpers */
export function assertRfqWithToken(value: any): asserts value is RfqWithToken {
  assert(isRfqWithToken(value), `Expected Rfq model with token`);
}

/** @group Model Helpers */
export function assertRfqOrSftWithToken(
  value: any
): asserts value is RfqWithToken | SftWithToken {
  assert(
    isRfqWithToken(value) || isSftWithToken(value),
    `Expected Nft or Sft model with token`
  );
}

/** @group Model Helpers */
export const toRfqWithToken = (
  metadata: Metadata,
  mint: Mint,
  token: Token
): RfqWithToken => ({
  ...toSftWithToken(metadata, mint, token),
  model: 'rfq',
});
