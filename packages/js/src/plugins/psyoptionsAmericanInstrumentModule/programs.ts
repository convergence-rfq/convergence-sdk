import { PROGRAM_ID as PSYOPTIONS_AMERICAN_INSTRUMENT_PROGRAM_ID } from '@convergence-rfq/psyoptions-american-instrument';

import { assert } from '../../utils';
import { Program } from '../../types';

/** @group Programs */
export const psyoptionsAmericanInstrumentProgram: Program = {
  name: 'PsyoptionsAmericanInstrumentProgram',
  address: PSYOPTIONS_AMERICAN_INSTRUMENT_PROGRAM_ID,
};

/** @group Programs */
export type PsyoptionsAmericanInstrumentProgram = Program & {
  availableGuards: string[];
};

/** @group Helpers */
export const isPsyoptionsAmericanInstrumentProgram = (
  value: Program
): value is PsyoptionsAmericanInstrumentProgram =>
  typeof value === 'object' && 'availableGuards' in value;

export function assertpsyoptionsAmericanInstrumentProgram(
  value: Program
): asserts value is PsyoptionsAmericanInstrumentProgram {
  assert(
    isPsyoptionsAmericanInstrumentProgram(value),
    'Expected psyoptionsAmericanInstrumentProgram model'
  );
}

/** @group Programs */
export const defaultpsyoptionsAmericanInstrumentProgram: PsyoptionsAmericanInstrumentProgram =
  {
    name: 'psyoptionsAmericanInstrumentProgram',
    address: PSYOPTIONS_AMERICAN_INSTRUMENT_PROGRAM_ID,
    availableGuards: [],
  };
