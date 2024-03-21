import { PROGRAM_ID } from '@convergence-rfq/vault-operator';

import { Program } from '../../types';
import { Convergence } from '../../index';
import { GpaBuilder } from '../../utils';

/** @group Programs */
export const vaultOperatorProgram: Program = {
  name: 'VaultOperatorProgram',
  address: PROGRAM_ID,
  gpaResolver: (convergence: Convergence) => {
    return new GpaBuilder(convergence, PROGRAM_ID);
  },
};
