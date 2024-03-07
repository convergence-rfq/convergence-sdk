import { PublicKey } from '@solana/web3.js';
import { removeDecimals } from '../../../utils';
import { SpotInstrumentConfigAccount } from '../accounts';
import { SPOT_QUOTE_FEE_BPS } from '../constants';

export type SpotInstrumentConfig = {
  readonly model: 'spotInstrumentConfig';
  readonly address: PublicKey;
  readonly feeBps: number;
};

/** @group Model Helpers */
export const toSpotInstrumentConfig = (
  account: SpotInstrumentConfigAccount
): SpotInstrumentConfig => ({
  model: 'spotInstrumentConfig',
  address: account.publicKey,
  feeBps: removeDecimals(account.data.feeBps, SPOT_QUOTE_FEE_BPS),
});
