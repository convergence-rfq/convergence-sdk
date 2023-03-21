import { Buffer } from 'buffer';

import type { Convergence } from '../../Convergence';
import { Pda, Program, PublicKey } from '../../types';

/**
 * This client allows you to build PDAs related to the Collateral module.
 *
 * @see {@link CollateralClient}
 * @group Module Pdas
 */
export class CollateralPdasClient {
  constructor(protected readonly convergence: Convergence) {}

  /** Finds the PDA of a given user collateral token. */
  collateralToken({ user, programs }: CollateralTokenInput): Pda {
    const programId = this.programId(programs);
    return Pda.find(programId, [
      Buffer.from('collateral_token', 'utf8'),
      user.toBuffer(),
    ]);
  }

  /** Finds the PDA of a given user token info. */
  collateralInfo({ user, programs }: CollateralInfoInput): Pda {
    const programId = this.programId(programs);
    return Pda.find(programId, [
      Buffer.from('collateral_info', 'utf8'),
      user.toBuffer(),
    ]);
  }

  private programId(programs?: Program[]) {
    return this.convergence.programs().getRfq(programs).address;
  }
}

type CollateralTokenInput = {
  /** The address of the user account. */
  user: PublicKey;

  /** An optional set of programs that override the registered ones. */
  programs?: Program[];
};

type CollateralInfoInput = {
  /** The address of the user account. */
  user: PublicKey;

  /** An optional set of programs that override the registered ones. */
  programs?: Program[];
};
