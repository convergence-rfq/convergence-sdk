import { PublicKey } from '@solana/web3.js';
import {
  BaseAssetIndex as SolitaBaseAssetIndex,
  RiskCategory as SolitaRiskCategory,
  PriceOracle as SolitaPriceOracle,
} from '@convergence-rfq/rfq';

import { BaseAssetAccount } from '../accounts';
import { assert } from '../../../utils';

/**
 * This model captures all the relevant information about a Solita base asset
 * on the Solana blockchain.
 *
 * @group Models
 */
export type SolitaBaseAsset = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'solitaBaseAsset';

  /** The address of the base asset. */
  readonly address: PublicKey;

  /** The PDA bump of the base asset. */
  readonly bump: number;

  /** The base asset index. */
  readonly index: SolitaBaseAssetIndex;

  /** The risk category for the base asset */
  readonly riskCategory: SolitaRiskCategory;

  /** Is base asset enabled or disabled. */
  readonly enabled: boolean;

  /** The price oracle for the base asset. */
  readonly priceOracle: SolitaPriceOracle;

  /** The ticker for the base asset. */
  readonly ticker: string;
};

/** @group Model Helpers */
export const isSolitaBaseAsset = (value: any): value is SolitaBaseAsset =>
  typeof value === 'object' && value.model === 'solitaBaseAsset';

/** @group Model Helpers */
export function assertSolitaBaseAsset(
  value: any
): asserts value is SolitaBaseAsset {
  assert(isSolitaBaseAsset(value), 'Expected SolitaBaseAsset model');
}

/** @group Model Helpers */
export const toSolitaBaseAsset = (
  account: BaseAssetAccount
): SolitaBaseAsset => ({
  model: 'solitaBaseAsset',
  address: account.publicKey,
  bump: account.data.bump,
  index: account.data.index,
  enabled: account.data.enabled,
  riskCategory: account.data.riskCategory,
  priceOracle: account.data.priceOracle,
  ticker: account.data.ticker,
});

export type RiskCategory =
  | 'very-low'
  | 'low'
  | 'medium'
  | 'high'
  | 'very-high'
  | 'custom-1'
  | 'custom-2'
  | 'custom-3';

export type PriceOracle = 'pyth' | null;

export type BaseAsset = {
  readonly model: 'baseAsset';
  readonly address: string;
  readonly index: number;
  readonly riskCategory: RiskCategory;
  readonly enabled: boolean;
  readonly priceOracle: PriceOracle;
  readonly ticker: string;
};
