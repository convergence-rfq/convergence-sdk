import { PROGRAM_ID as PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ID } from '@convergence-rfq/psyoptions-european-instrument';

import { assert } from '../../utils';
import { Program } from '../../types';

/** @group Programs */
export const psyoptionsEuropeanInstrumentProgram: Program = {
  name: 'PsyoptionsEuropeanInstrumentProgram',
  address: PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ID,
};

/** @group Programs */
export type PsyoptionsEuropeanInstrumentProgram = Program & {
  availableGuards: string[];
};

export const isPsyoptionsEuropeanInstrumentProgram = (
  value: Program
): value is PsyoptionsEuropeanInstrumentProgram =>
  typeof value === 'object' && 'availableGuards' in value;

export function assertpsyoptionsEuropeanInstrumentProgram(
  value: Program
): asserts value is PsyoptionsEuropeanInstrumentProgram {
  assert(
    isPsyoptionsEuropeanInstrumentProgram(value),
    'Expected psyoptionsEuropeanInstrumentProgram model'
  );
}

/** @group Programs */
export const defaultpsyoptionsEuropeanInstrumentProgram: PsyoptionsEuropeanInstrumentProgram =
  {
    name: 'psyoptionsEuropeanInstrumentProgram',
    address: PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ID,
    availableGuards: [],
  };
