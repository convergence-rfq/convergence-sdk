import {
  cusper as defaultSpotInstrumentCusper,
  PROGRAM_ID as DEFAULT_SPOT_INSTRUMENT_PROGRAM_ID,
} from '@convergence-rfq/spot-instrument';
import { assert } from '@/utils';
import { ErrorWithLogs, Program } from '@/types';

/** @group Programs */
export const spotInstrumentProgram: Program = {
  name: 'SpotInstrumentProgram',
  address: DEFAULT_SPOT_INSTRUMENT_PROGRAM_ID,
  errorResolver: (error: ErrorWithLogs) =>
    defaultSpotInstrumentCusper.errorFromProgramLogs(error.logs, false),
};

/** @group Programs */
export type SpotInstrumentProgram = Program & { availableGuards: string[] };

export const isSpotInstrumentProgram = (
  value: Program
): value is SpotInstrumentProgram =>
  typeof value === 'object' && 'availableGuards' in value;

export function assertSpotInstrumentProgram(
  value: Program
): asserts value is SpotInstrumentProgram {
  assert(
    isSpotInstrumentProgram(value),
    `Expected SpotInstrumentProgram model`
  );
}

/** @group Programs */
export const defaultSpotInstrumentProgram: SpotInstrumentProgram = {
  name: 'SpotInstrumentProgram',
  address: DEFAULT_SPOT_INSTRUMENT_PROGRAM_ID,
  errorResolver: (error: ErrorWithLogs) =>
    defaultSpotInstrumentCusper.errorFromProgramLogs(error.logs, false),
  availableGuards: [],
};
