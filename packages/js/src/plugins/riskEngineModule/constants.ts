import { RiskCategoryInfo, Scenario } from '@convergence-rfq/risk-engine';

import { toBigNumber as tbn } from '../../types';

export const DEFAULT_MIN_COLLATERAL_REQUIREMENT = tbn(0);

export const DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ = tbn(0);

export const DEFAULT_MINT_DECIMALS = 9;

export const DEFAULT_SAFETY_PRICE_SHIFT_FACTOR = 0;

export const DEFAULT_OVERALL_SAFETY_FACTOR = 0;

export const DEFAULT_ORACLE_STALENESS = 60 * 60 * 24 * 365 * 10;

export const DEFAULT_ACCEPTED_ORACLE_CONFIDENCE_INTERVAL_POSITION = 0.1;

export const DEFAULT_ACCEPTED_ORACLE_STALENESS = 60 * 60 * 24 * 365 * 10;
export const DEFAULT_ACCEPTED_ORACLE_CONFIDENCE_INTERVAL_PORTION = 0.01;

export const SETTLEMENT_WINDOW_PEDIODS = 6;
export const SETTLEMENT_WINDOW_BREAKPOINS = [
  60 * 60,
  4 * 60 * 60,
  12 * 60 * 60,
  24 * 60 * 60,
  48 * 60 * 60,
];

export const FUTURE_UNDERLYING_AMOUNT_PER_CONTRACT_DECIMALS = 9;
export const OPTION_UNDERLYING_AMOUNT_PER_CONTRACT_DECIMALS = 9;
export const OPTION_STRIKE_PRICE_DECIMALS = 9;

export const DEFAULT_RISK_CATEGORIES_INFO = {
  veryLow: toRiskCategoryInfo(0, 0, [
    toScenario(0, 0),
    toScenario(0, 0),
    toScenario(0, 0),
    toScenario(0, 0),
    toScenario(0, 0),
    toScenario(0, 0),
  ]),
  low: toRiskCategoryInfo(0, 0, [
    toScenario(0, 0),
    toScenario(0, 0),
    toScenario(0, 0),
    toScenario(0, 0),
    toScenario(0, 0),
    toScenario(0, 0),
  ]),
  medium: toRiskCategoryInfo(0, 0, [
    toScenario(0, 0),
    toScenario(0, 0),
    toScenario(0, 0),
    toScenario(0, 0),
    toScenario(0, 0),
    toScenario(0, 0),
  ]),
  high: toRiskCategoryInfo(0, 0, [
    toScenario(0, 0),
    toScenario(0, 0),
    toScenario(0, 0),
    toScenario(0, 0),
    toScenario(0, 0),
    toScenario(0, 0),
  ]),
  veryHigh: toRiskCategoryInfo(0, 0, [
    toScenario(0, 0),
    toScenario(0, 0),
    toScenario(0, 0),
    toScenario(0, 0),
    toScenario(0, 0),
    toScenario(0, 0),
  ]),
};

export function toScenario(
  baseAssetPriceChange: number,
  volatilityChange: number
): Scenario {
  return {
    baseAssetPriceChange,
    volatilityChange,
  };
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
