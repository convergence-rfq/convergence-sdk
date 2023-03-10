import { RiskCategoryInfo, Scenario } from '@convergence-rfq/risk-engine';
import { toBigNumber } from '@/types';

export const DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ =
  toBigNumber(1_000_000_000);

export const DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ =
  toBigNumber(2_000_000_000);

export const DEFAULT_MINT_DECIMALS = 6;

export const DEFAULT_SAFETY_PRICE_SHIFT_FACTOR = 0.01;

export const DEFAULT_OVERALL_SAFETY_FACTOR = 0.1;

export const DEFAULT_ORACLE_STALENESS = 300;

export const DEFAULT_ACCEPTED_ORACLE_CONFIDENCE_INTERVAL_POSITION = 0.1;

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
  veryLow: toRiskCategoryInfo(0.05, 0.5, [
    toScenario(0.02, 0.2),
    toScenario(0.04, 0.3),
    toScenario(0.08, 0.4),
    toScenario(0.12, 0.5),
    toScenario(0.2, 0.6),
    toScenario(0.3, 0.7),
  ]),
  low: toRiskCategoryInfo(0.05, 0.8, [
    toScenario(0.04, 0.4),
    toScenario(0.08, 0.6),
    toScenario(0.16, 0.8),
    toScenario(0.24, 1),
    toScenario(0.4, 1.2),
    toScenario(0.6, 1.4),
  ]),
  medium: toRiskCategoryInfo(0.05, 1.2, [
    toScenario(0.06, 0.6),
    toScenario(0.12, 0.9),
    toScenario(0.24, 1.2),
    toScenario(0.36, 1.5),
    toScenario(0.6, 1.8),
    toScenario(0.9, 2.1),
  ]),
  high: toRiskCategoryInfo(0.05, 2.4, [
    toScenario(0.08, 0.8),
    toScenario(0.16, 1.2),
    toScenario(0.32, 1.6),
    toScenario(0.48, 2),
    toScenario(0.8, 2.4),
    toScenario(1.2, 2.8),
  ]),
  veryHigh: toRiskCategoryInfo(0.05, 5, [
    toScenario(0.1, 1),
    toScenario(0.2, 1.5),
    toScenario(0.4, 2),
    toScenario(0.6, 2.5),
    toScenario(1, 3),
    toScenario(1.5, 3.5),
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
