import { PROGRAM_ID } from '@convergence-rfq/rfq';
import { cusper } from '@metaplex-foundation/mpl-token-metadata';
import { ErrorWithLogs, Program } from '@/types';
import { Convergence } from '@/index';
import { GpaBuilder } from '@/utils'

/** @group Programs */
export const rfqProgram: Program = {
  name: 'RfqProgram',
  address: PROGRAM_ID,
  errorResolver: (error: ErrorWithLogs) =>
    cusper.errorFromProgramLogs(error.logs, false),
  gpaResolver: (convergence: Convergence) => {
    return new GpaBuilder(convergence, PROGRAM_ID);
  },
};
