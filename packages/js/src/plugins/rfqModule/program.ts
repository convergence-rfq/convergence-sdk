import { PROGRAM_ID, cusper } from '@convergence-rfq/rfq';
import { Program, ErrorWithLogs } from '@/types';
import { Convergence } from '@/index';
import { GpaBuilder } from '@/utils';

/** @group Programs */
export const rfqProgram: Program = {
  name: 'RfqProgram',
  address: PROGRAM_ID,
  gpaResolver: (convergence: Convergence) => {
    return new GpaBuilder(convergence, PROGRAM_ID);
  },
  errorResolver: (error: ErrorWithLogs) =>
    cusper.errorFromProgramLogs(error.logs, false),
};
