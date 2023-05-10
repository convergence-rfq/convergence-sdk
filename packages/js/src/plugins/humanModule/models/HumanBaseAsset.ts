import { RiskCategory } from '@convergence-rfq/rfq';
import { BaseAsset } from '../../protocolModule/models/BaseAsset';

export type HumanOracle = {
  readonly address: string;
  readonly name: 'Switchboard';
};

export type HumanRiskCategory = 'low' | 'medium' | 'high';

export const toHumanRiskCategory = (
  riskCategory: RiskCategory
): HumanRiskCategory => {
  switch (riskCategory) {
    case RiskCategory.Low:
      return 'low';
    case RiskCategory.Medium:
      return 'medium';
    case RiskCategory.High:
      return 'high';
    default:
      throw new Error('Unknown risk category');
  }
};

export type HumanBaseAsset = {
  readonly model: 'humanBaseAsset';
  readonly address: string;
  readonly index: number | null;
  readonly riskCategory: HumanRiskCategory;
  readonly enabled: boolean;
  readonly oracle: HumanOracle;
  readonly ticker: string;
};

export const toHumanBaseAsset = (baseAsset: BaseAsset): HumanBaseAsset => {
  return {
    model: 'humanBaseAsset',
    address: baseAsset.address.toBase58(),
    index: baseAsset.index?.value ?? null,
    riskCategory: toHumanRiskCategory(baseAsset.riskCategory),
    enabled: baseAsset.enabled,
    oracle: {
      address: baseAsset.priceOracle.address.toBase58(),
      name: baseAsset.priceOracle.__kind,
    },
    ticker: baseAsset.ticker,
  };
};
