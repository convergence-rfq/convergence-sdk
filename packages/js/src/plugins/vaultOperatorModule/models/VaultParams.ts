import { PublicKey } from '@solana/web3.js';

import { VaultParamsAccount } from '../accounts';
import { removeDecimals } from '@/utils';
import { ABSOLUTE_PRICE_DECIMALS, Rfq } from '@/plugins/rfqModule';

export type VaultParameters = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'vaultParameters';

  readonly address: PublicKey;

  readonly creator: PublicKey;

  readonly rfq: PublicKey;

  readonly tokensWithdrawn: boolean;

  readonly acceptablePriceLimit: number;

  readonly confirmedResponse: PublicKey;
};

/** @group Model Helpers */
export const toVaultParams = (
  account: VaultParamsAccount,
  rfq: Rfq
): VaultParameters => {
  const acceptablePriceLimitTemp = removeDecimals(
    account.data.acceptablePriceLimit,
    rfq.quoteAsset.getDecimals()
  );
  const acceptablePriceLimit = removeDecimals(
    acceptablePriceLimitTemp,
    ABSOLUTE_PRICE_DECIMALS
  );

  return {
    model: 'vaultParameters',
    address: account.publicKey,
    creator: account.data.creator,
    rfq: account.data.rfq,
    tokensWithdrawn: account.data.tokensWithdrawn,
    acceptablePriceLimit,
    confirmedResponse: account.data.confirmedResponse,
  };
};
