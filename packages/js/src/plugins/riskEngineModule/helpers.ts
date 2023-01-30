import { Scenario, RiskCategoryInfo, InstrumentType } from './types';

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

export function instrumentTypeToObject(value: InstrumentType) {
  const stringValue = InstrumentType[value];
  const uncapitalizedValue =
    stringValue.charAt(0).toLowerCase() + stringValue.slice(1);
  return {
    [uncapitalizedValue]: {},
  };
}
