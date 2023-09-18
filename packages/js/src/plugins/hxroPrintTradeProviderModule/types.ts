import { PublicKey } from '@solana/web3.js';
import { OptionType } from '@convergence-rfq/risk-engine';
import { LegSide } from '../rfqModule';
import { Fraction } from '@/types';

export type HxroLegInput = {
  amount: number;
  side: LegSide;
  productInfo: HxroProductInfo;
};

type HxroCommonProductInfo = {
  productIndex: number;
  // Can be missing in a case when parsed from a leg but the data haven't been extended with hxro product data
  productAddress?: PublicKey;
  baseAssetIndex: number;
};
export type HxroOptionInfo = HxroCommonProductInfo & {
  instrumentType: 'option';
  optionType: OptionType;
  strikePrice: Fraction;
  expirationTimestamp: number;
};
export type HxroTermFutureInfo = HxroCommonProductInfo & {
  instrumentType: 'term-future';
  // Can be missing in a case when parsed from a leg but the data haven't been extended with hxro product data
  expirationTimestamp?: number;
};
export type HxroPerpFutureInfo = HxroCommonProductInfo & {
  instrumentType: 'perp-future';
};

export type HxroProductInfo =
  | HxroOptionInfo
  | HxroTermFutureInfo
  | HxroPerpFutureInfo;
