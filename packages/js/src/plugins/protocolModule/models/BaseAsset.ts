import { PublicKey } from '@solana/web3.js';
import {
  BaseAssetIndex as SolitaBaseAssetIndex,
  RiskCategory as SolitaRiskCategory,
  OracleSource as SolitaOracleSource,
} from '@convergence-rfq/rfq';
import { COption } from '@convergence-rfq/beet';

import { BaseAssetAccount } from '../accounts';
import { assert } from '../../../utils';

export type RiskCategory =
  | 'very-low'
  | 'low'
  | 'medium'
  | 'high'
  | 'very-high'
  | 'custom-1'
  | 'custom-2'
  | 'custom-3';

export type PriceOracle = {
  source: 'switchboard' | 'pyth' | 'in-place';
  address?: PublicKey;
  price?: number;
};

/**
 * This model captures all the relevant information about a Solita base asset
 * on the Solana blockchain.
 *
 * @group Models
 */
export type BaseAsset = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'baseAsset';

  /** The address of the base asset. */
  readonly address: PublicKey;

  /** The PDA bump of the base asset. */
  readonly bump: number;

  /** The base asset index. */
  readonly index: number;

  /** The risk category for the base asset */
  readonly riskCategory: RiskCategory;

  /** Is base asset enabled or disabled. */
  readonly enabled: boolean;

  /** The price oracle for the base asset. */
  readonly priceOracle: PriceOracle;

  /** The ticker for the base asset. */
  readonly ticker: string;
};

/** @group Model Helpers */
export const isBaseAsset = (value: any): value is BaseAsset =>
  typeof value === 'object' && value.model === 'baseAsset';

/** @group Model Helpers */
export function assertBaseAsset(value: any): asserts value is BaseAsset {
  assert(isBaseAsset(value), 'Expected BaseAsset model');
}

/** @group Model Helpers */
export const toBaseAssetIndex = (
  solitaBaseAssetIndex: SolitaBaseAssetIndex
): number => {
  return solitaBaseAssetIndex.value;
};

/** @group Model Helpers */
export const toRiskCategory = (
  solitaRiskCategory: SolitaRiskCategory
): RiskCategory => {
  switch (solitaRiskCategory) {
    case SolitaRiskCategory.VeryLow:
      return 'very-low';
    case SolitaRiskCategory.Low:
      return 'low';
    case SolitaRiskCategory.Medium:
      return 'medium';
    case SolitaRiskCategory.High:
      return 'high';
    case SolitaRiskCategory.VeryHigh:
      return 'very-high';
    case SolitaRiskCategory.Custom1:
      return 'custom-1';
    case SolitaRiskCategory.Custom2:
      return 'custom-2';
    case SolitaRiskCategory.Custom3:
      return 'custom-3';
  }
};

/** @group Model Helpers */
export const toPriceOracle = (
  solitaOracleSource: SolitaOracleSource,
  switchboardOracle: PublicKey,
  pythOracle: PublicKey
): PriceOracle => {
  switch (solitaOracleSource) {
    case SolitaOracleSource.Switchboard:
      return {
        source: 'switchboard',
        address: switchboardOracle,
      };
    case SolitaOracleSource.Pyth:
      return {
        source: 'pyth',
        address: pythOracle,
      };
    case SolitaOracleSource.InPlace:
      return {
        source: 'in-place',
        price: 0,
      };
    default:
      throw new Error(`Unsupported price oracle: ${solitaOracleSource}`);
  }
};

/** @group Model Helpers */
export const toSolitaPriceOracle = (
  priceOracle: PriceOracle,
  price?: number
): {
  oracleSource: SolitaOracleSource;
  pythOracle: COption<PublicKey>;
  switchboardOracle: COption<PublicKey>;
  inPlacePrice: COption<number>;
} => {
  switch (priceOracle.source) {
    case 'switchboard':
      if (!priceOracle.address) throw new Error('Missing oracle address');
      return {
        oracleSource: SolitaOracleSource.Switchboard,
        switchboardOracle: priceOracle.address,
        pythOracle: null,
        inPlacePrice: null,
      };
    case 'pyth':
      if (!priceOracle.address) throw new Error('Missing oracle address');
      return {
        oracleSource: SolitaOracleSource.Pyth,
        switchboardOracle: null,
        pythOracle: priceOracle.address,
        inPlacePrice: null,
      };
    case 'in-place':
      return {
        oracleSource: SolitaOracleSource.InPlace,
        switchboardOracle: null,
        pythOracle: null,
        inPlacePrice: price ?? 0,
      };
    default:
      console.log('crap');
      throw new Error(`Unsupported price oracle: ${priceOracle}`);
  }
};

export const toSolitaRiskCategory = (riskCategory: RiskCategory) => {
  switch (riskCategory) {
    case 'very-low':
      return SolitaRiskCategory.VeryLow;
    case 'low':
      return SolitaRiskCategory.Low;
    case 'medium':
      return SolitaRiskCategory.Medium;
    case 'high':
      return SolitaRiskCategory.High;
    case 'very-high':
      return SolitaRiskCategory.VeryHigh;
    case 'custom-1':
      return SolitaRiskCategory.Custom1;
    case 'custom-2':
      return SolitaRiskCategory.Custom2;
    case 'custom-3':
      return SolitaRiskCategory.Custom3;
    default:
      throw new Error(`Unsupported risk category: ${riskCategory}`);
  }
};

/** @group Model Helpers */
export const toBaseAsset = (account: BaseAssetAccount): BaseAsset => ({
  model: 'baseAsset',
  address: account.publicKey,
  bump: account.data.bump,
  index: toBaseAssetIndex(account.data.index),
  enabled: account.data.enabled,
  riskCategory: toRiskCategory(account.data.riskCategory),
  priceOracle: toPriceOracle(
    account.data.oracleSource,
    account.data.switchboardOracle,
    account.data.pythOracle
  ),
  ticker: account.data.ticker,
});
