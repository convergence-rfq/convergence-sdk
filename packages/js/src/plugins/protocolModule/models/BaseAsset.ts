import { PublicKey } from '@solana/web3.js';
import {
  BaseAssetIndex as SolitaBaseAssetIndex,
  RiskCategory as SolitaRiskCategory,
  OracleSource as SolitaOracleSource,
} from '@convergence-rfq/rfq';
import { COption } from '@convergence-rfq/beet';

import { BaseAssetAccount } from '../accounts';
import { assert } from '../../../utils/assert';

export type RiskCategory =
  | 'very-low'
  | 'low'
  | 'medium'
  | 'high'
  | 'very-high'
  | 'custom-1'
  | 'custom-2'
  | 'custom-3';

export type OracleSource = 'switchboard' | 'pyth' | 'in-place';

export type PriceOracle = {
  source: OracleSource;
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

  /** The price oracle source for the base asset. */
  readonly oracleSource: OracleSource;

  /** The switchboard oracle. */
  readonly switchboardOracle?: PublicKey;

  /** The pyth oracle. */
  readonly pythOracle?: PublicKey;

  /** The in-place price. */
  readonly inPlacePrice?: number;

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

export const toOracleSource = (
  oracleSource: SolitaOracleSource
): OracleSource => {
  switch (oracleSource) {
    case SolitaOracleSource.Switchboard:
      return 'switchboard';
    case SolitaOracleSource.Pyth:
      return 'pyth';
    case SolitaOracleSource.InPlace:
      return 'in-place';
    default:
      throw new Error(`Unsupported oracle source: ${oracleSource}`);
  }
};

/** @group Model Helpers */
export const toPriceOracle = (baseAsset: BaseAsset): PriceOracle => {
  switch (baseAsset.oracleSource) {
    case 'switchboard':
      return {
        source: 'switchboard',
        address: baseAsset.switchboardOracle,
      };
    case 'pyth':
      return {
        source: 'pyth',
        address: baseAsset.pythOracle,
      };
    case 'in-place':
      return {
        source: 'in-place',
        price: baseAsset.inPlacePrice,
      };
    default:
      throw new Error(`Unsupported price oracle: ${baseAsset.oracleSource}`);
  }
};

/** @group Model Helpers */
export const toSolitaPriceOracle = (
  priceOracle: PriceOracle
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
      if (!priceOracle.price) throw new Error('Missing oracle price');
      return {
        oracleSource: SolitaOracleSource.InPlace,
        switchboardOracle: null,
        pythOracle: null,
        inPlacePrice: priceOracle.price,
      };
    default:
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
  oracleSource: toOracleSource(account.data.oracleSource),
  switchboardOracle: !account.data.switchboardOracle.equals(PublicKey.default)
    ? account.data.switchboardOracle
    : undefined,
  pythOracle: !account.data.pythOracle.equals(PublicKey.default)
    ? account.data.pythOracle
    : undefined,
  inPlacePrice:
    account.data.inPlacePrice !== 0 ? account.data.inPlacePrice : undefined,
  ticker: account.data.ticker,
});
