import { PROGRAM_ID as DEFAULT_RISK_ENGINE_PROGRAM_ID } from '@convergence-rfq/risk-engine';

import { assert } from '../../utils';
import { Program } from '../../types';

/** @group Programs */
export const riskEngineProgram: Program = {
  name: 'RiskEngineProgram',
  address: DEFAULT_RISK_ENGINE_PROGRAM_ID,
};

/** @group Programs */
export type RiskEngineProgram = Program & { availableGuards: string[] };

/**@group Helpers */
export const isRiskEngineProgram = (
  value: Program
): value is RiskEngineProgram =>
  typeof value === 'object' && 'availableGuards' in value;

/**@group Helpers */
export function assertRiskEngineProgram(
  value: Program
): asserts value is RiskEngineProgram {
  assert(isRiskEngineProgram(value), `Expected RiskEngineProgram model`);
}

/** @group Programs */
export const defaultRiskEngineProgram: RiskEngineProgram = {
  name: 'RiskEngineProgram',
  address: DEFAULT_RISK_ENGINE_PROGRAM_ID,
  availableGuards: [],
};
