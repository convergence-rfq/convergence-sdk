import { PublicKey } from '@solana/web3.js';
import {
  BaseAssetIndex,
  RiskCategory,
  PriceOracle,
} from '@convergence-rfq/rfq';
import { BaseAssetAccount } from '../accounts';
import { assert } from '@/utils';

/**
 * This model captures all the relevant information about a base asset
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
  readonly index: BaseAssetIndex;

  /** The risk category for the base asset */
  readonly riskCategory: RiskCategory;

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
  assert(isBaseAsset(value), `Expected BaseAsset model`);
}

/** @group Model Helpers */
export const toBaseAsset = (account: BaseAssetAccount): BaseAsset => ({
  model: 'baseAsset',
  address: account.publicKey,
  bump: account.data.bump,
  index: account.data.index,
  riskCategory: account.data.riskCategory,
  priceOracle: account.data.priceOracle,
  ticker: account.data.ticker,
});
