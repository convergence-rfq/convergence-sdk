import { Buffer } from 'buffer';
import type { Convergence } from '@/Convergence';
import { Pda, Program } from '@/types';


/**
 * This client allows you to build PDAs related to the protocol module.
 *
 * @see {@link RiskEnginePdasClient}
 * @group Module Pdas
 */
export class RiskEnginePdasClient {
  constructor(protected readonly convergence: Convergence) {}

  /** Finds the Protocol PDA. */
  config(): Pda {
    const programId = this.programId();
    return Pda.find(programId, [Buffer.from('config', 'utf8')]);
  }

  private programId(programs?: Program[]) {
    return this.convergence.programs().getRiskEngine(programs).address;
  }
}
