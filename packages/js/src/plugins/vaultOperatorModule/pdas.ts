import { Buffer } from 'buffer';

import { Pda, Program, PublicKey } from '../../types';
import type { Convergence } from '../../Convergence';

export class VaultOperatorPdasClient {
  constructor(protected readonly convergence: Convergence) {}
  /** Finds the PDA of a given mint. */
  operator(vaultParams: PublicKey): Pda {
    const programId = this.programId();
    return Pda.find(programId, [
      Buffer.from('operator', 'utf8'),
      vaultParams.toBuffer(),
    ]);
  }

  private programId(programs?: Program[]) {
    return this.convergence.programs().getVaultOperator(programs).address;
  }
}
