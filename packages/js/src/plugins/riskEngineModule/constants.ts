import { toRiskCategoryInfo, toScenario } from './helpers';

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
