import { Buffer } from 'buffer';
import type { Convergence } from '@/Convergence';
import { Pda, Program } from '@/types';

function toLittleEndian(value: number, bytes: number) {
  const buf = Buffer.allocUnsafe(bytes);
  buf.writeUIntLE(value, 0, bytes);
  return buf;
}

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

  baseAsset({ index }: BaseAssetInput): Pda {
    const programId = this.programId();
    return Pda.find(programId, [
      Buffer.from('base_asset', 'utf8'),
      toLittleEndian(index.value, 2),
    ]);
  }

  private programId(programs?: Program[]) {
    return this.convergence.programs().getRfq(programs).address;
  }
}

type BaseAssetInput = {
  index: { value: number };
};
