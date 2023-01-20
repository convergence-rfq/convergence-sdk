import { PROGRAM_ID } from '@convergence-rfq/rfq';
import { Program } from '@/types';
import { Convergence } from '@/index';
import { GpaBuilder } from '@/utils';

/** @group Programs */
export const rfqProgram: Program = {
  name: 'RfqProgram',
  address: PROGRAM_ID,
  gpaResolver: (convergence: Convergence) => {
    return new GpaBuilder(convergence, PROGRAM_ID);
  },
};
