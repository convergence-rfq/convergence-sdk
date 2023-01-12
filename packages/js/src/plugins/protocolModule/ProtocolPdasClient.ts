import { Buffer } from 'buffer';
import type { Convergence } from '@/Convergence';
import { Pda, Program } from '@/types';

/**
 * This client allows you to build PDAs related to the protocol module.
 *
 * @see {@link ProtocolClient}
 * @group Module Pdas
 */
export class ProtocolPdasClient {
  constructor(protected readonly convergence: Convergence) {}

  /** Finds the Protocol PDA. */
  protocol(): Pda {
    const programId = this.programId();
    return Pda.find(programId, [Buffer.from('protocol', 'utf8')]);
  }

  private programId(programs?: Program[]) {
    return this.convergence.programs().getRfq(programs).address;
  }
}
