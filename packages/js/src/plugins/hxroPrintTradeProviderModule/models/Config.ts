import { PublicKey } from '@solana/web3.js';

import { HxroPrintTradeProviderConfigAccount } from '../accounts';

export type HxroPrintTradeProviderConfig = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'hxroPrintTradeProviderConfig';

  readonly validMpg: PublicKey;
};

/** @group Model Helpers */
export const toHxroPrintTradeProviderConfig = (
  account: HxroPrintTradeProviderConfigAccount
): HxroPrintTradeProviderConfig => ({
  model: 'hxroPrintTradeProviderConfig',
  validMpg: account.data.validMpg,
});
