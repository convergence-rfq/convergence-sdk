import type { Convergence } from '@/Convergence';
import { Pda, Program, PublicKey } from '@/types';

/**
 * This client allows you to build PDAs related to the Token module.
 *
 * @see {@link TokenClient}
 * @group Module Pdas
 */
export class TokenPdasClient {
  constructor(protected readonly convergence: Convergence) {}

  /** Finds the address of the Associated Token Account. */
  associatedTokenAccount({
    mint,
    owner,
    programs,
  }: {
    /** The address of the mint account. */
    mint: PublicKey;
    /** The address of the owner account. */
    owner: PublicKey;
    /** An optional set of programs that override the registered ones. */
    programs?: Program[];
  }): Pda {
    const tokenProgram = this.convergence.programs().getToken(programs);
    const associatedTokenProgram = this.convergence
      .programs()
      .getAssociatedToken(programs);
    return Pda.find(associatedTokenProgram.address, [
      owner.toBuffer(),
      tokenProgram.address.toBuffer(),
      mint.toBuffer(),
    ]);
  }
}
