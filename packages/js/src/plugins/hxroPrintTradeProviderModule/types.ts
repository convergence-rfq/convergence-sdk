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
};
export type HxroPerpFutureInfo = HxroCommonProductInfo & {
  instrumentType: 'perp-future';
};

export type HxroProductInfo =
  | HxroOptionInfo
  | HxroTermFutureInfo
  | HxroPerpFutureInfo;
