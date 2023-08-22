import { PublicKey } from '@solana/web3.js';
import { RiskCategoryChange as SolitaRiskCategoryChange } from '@convergence-rfq/risk-engine';
import { bignum } from '@convergence-rfq/beet';

import { ConfigAccount } from '../accounts';
import { RiskCategoryInfo } from '../types';
import { assert } from '../../../utils/assert';
import {
  RiskCategory,
  toSolitaRiskCategory,
} from '../../protocolModule/models';
import { InstrumentType, fromSolitaInstrumentType } from './InstrumentType';

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

  /** The amount of collateral required to create an RFQ with a variable size. */
  readonly minCollateralRequirement: bignum;

  /** The amount of collateral required to create an RFQ with a fixed size. */
  readonly collateralForFixedQuoteAmountRfqCreation: bignum;

  /** The number of decimals of the collateral mint. */
  readonly collateralMintDecimals: bignum;

  /** The safety price shift factor. */
  readonly safetyPriceShiftFactor: number;

  /** The overall safety factor. */
  readonly overallSafetyFactor: number;

  /** The risk categories info. */
  readonly riskCategoriesInfo: RiskCategoryInfo[];

  /** The instrument types info. */
  readonly instrumentTypes: (InstrumentType | null)[];
};

export type RiskCategoryChange = {
  /** The risk category index. */
  category: RiskCategory;

  /** The risk category info. */
  value: any;
};

/** @group Model helpers */
export const toSolitaRiskCategoryChange = (
  change: RiskCategoryChange
): SolitaRiskCategoryChange => {
  return {
    riskCategoryIndex: toSolitaRiskCategory(change.category),
    newValue: change.value,
  };
};

/** @group Model helpers */
export const isConfig = (value: any): value is Response =>
  typeof value === 'object' && value.model === 'config';

/** @group Model helpers */
export function assertConfig(value: any): asserts value is Response {
  assert(isConfig(value), 'Expected Config model');
}

/** @group Model helpers */
export const toConfig = (account: ConfigAccount): Config => ({
  model: 'config',
  address: account.publicKey,
  minCollateralRequirement: account.data.minCollateralRequirement,
  collateralForFixedQuoteAmountRfqCreation:
    account.data.collateralForFixedQuoteAmountRfqCreation,
  collateralMintDecimals: account.data.collateralMintDecimals,
  safetyPriceShiftFactor: account.data.safetyPriceShiftFactor,
  overallSafetyFactor: account.data.overallSafetyFactor,
  riskCategoriesInfo: account.data.riskCategoriesInfo,
  instrumentTypes: account.data.instrumentTypes.map((instrumentType) =>
    fromSolitaInstrumentType(instrumentType)
  ),
});
