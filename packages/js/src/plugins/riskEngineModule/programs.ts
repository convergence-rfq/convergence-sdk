import { PROGRAM_ID as DEFAULT_RISK_ENGINE_PROGRAM_ID } from '@convergence-rfq/risk-engine';
import { assert } from '@/utils';
import { Program, PublicKey } from '@/types';

/** @group Programs */
export const riskEngineProgram: Program = {
  name: 'RiskEngineProgram',
  address: DEFAULT_RISK_ENGINE_PROGRAM_ID,
  //errorResolver: (error: ErrorWithLogs) =>
  //  defaultRiskEngineCusper.errorFromProgramLogs(error.logs, false),
};

/** @group Programs */
export type RiskEngineProgram = Program & { availableGuards: string[] };

export const isRiskEngineProgram = (
  value: Program
): value is RiskEngineProgram =>
  typeof value === 'object' && 'availableGuards' in value;

export function assertRiskEngineProgram(
  value: Program
): asserts value is RiskEngineProgram {
  assert(isRiskEngineProgram(value), `Expected RiskEngineProgram model`);
}

/** @group Programs */
export const defaultRiskEngineProgram: RiskEngineProgram = {
  name: 'RiskEngineProgram',
  address: DEFAULT_RISK_ENGINE_PROGRAM_ID,
  //errorResolver: (error: ErrorWithLogs) =>
  //  defaultRiskEngineCusper.errorFromProgramLogs(error.logs, false),
  availableGuards: [],
};

/** @group Programs */
export const gatewayProgram: Program = {
  name: 'GatewayProgram',
  address: new PublicKey('gatem74V238djXdzWnJf94Wo1DcnuGkfijbf3AuBhfs'),
};
