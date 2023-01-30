import { PublicKey } from '@solana/web3.js';
import { bignum } from '@convergence-rfq/beet';
import { ConfigAccount } from '../accounts';
//import { RiskCategoryInfo, InstrumentInfo } from '../types';
import { assert } from '@/utils';

/**
 * This model captures all the relevant information about a Risk Engine Config
 * on the Solana blockchain.
 *
 * @group Models
 */
export type Config = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'config';

  /** The address of the config. */
  readonly address: PublicKey;

  readonly collateralForVariableSizeRfqCreation: bignum;

  readonly collateralForFixedQuoteAmountRfqCreation: bignum;

  readonly collateralMintDecimals: bignum;

  readonly safetyPriceShiftFactor: bignum;

  readonly overallSafetyFactor: bignum;

  //readonly riskCategoriesInfo: RiskCategoryInfo[];

  //readonly instrumentTypes: InstrumentType[];
};

/** @group Model helpers */
export const isConfig = (value: any): value is Response =>
  typeof value === 'object' && value.model === 'config';

/** @group Model helpers */
export function assertConfig(value: any): asserts value is Response {
  assert(isConfig(value), `Expected Config model`);
}

/** @group Model helpers */
export const toConfig = (account: ConfigAccount): Config => ({
  model: 'config',
  address: account.publicKey,
  collateralForFixedQuoteAmountRfqCreation:
    account.data.collateralForFixedQuoteAmountRfqCreation,
  collateralForVariableSizeRfqCreation:
    account.data.collateralForVariableSizeRfqCreation,
  collateralMintDecimals: account.data.collateralMintDecimals,
  safetyPriceShiftFactor: account.data.safetyPriceShiftFactor,
  overallSafetyFactor: account.data.overallSafetyFactor,
  //riskCategoriesInfo: account.data.riskCategoriesInfo,
  //instrumentTypes: account.data.instrumentTypes,
});
