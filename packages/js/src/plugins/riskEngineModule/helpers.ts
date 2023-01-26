import { Scenario, RiskCategoryInfo } from './types';

export function toScenario(
  baseAssetPriceChange: number,
  volatilityChange: number
): Scenario {
  return { baseAssetPriceChange, volatilityChange };
}

export function toRiskCategoryInfo(
  interestRate: number,
  annualized30DayVolatility: number,
  scenarioPerSettlementPeriod: [
    Scenario,
    Scenario,
    Scenario,
    Scenario,
    Scenario,
    Scenario
  ]
): RiskCategoryInfo {
  return {
    interestRate,
    annualized30DayVolatility,
    scenarioPerSettlementPeriod,
  };
}
