import { Buffer } from 'buffer';

import type { Convergence } from '../../Convergence';
import { Pda, Program, PublicKey } from '../../types';

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

  /** Finds the PDA of a given base asset. */
  baseAsset({ index }: BaseAssetInput): Pda {
    const programId = this.programId();
    return Pda.find(programId, [
      Buffer.from('base_asset', 'utf8'),
      toLittleEndian(index, 2),
    ]);
  }

  /** Finds the PDA of a given mint. */
  mintInfo({ mint }: MintInfoInput): Pda {
    const programId = this.programId();
    return Pda.find(programId, [
      Buffer.from('mint_info', 'utf8'),
      mint.toBuffer(),
    ]);
  }

  private programId(programs?: Program[]) {
    return this.convergence.programs().getRfq(programs).address;
  }
}

type BaseAssetInput = {
  /** The base asset index. */
  index: number;
};

type MintInfoInput = {
  /** The address of the mint account. */
  mint: PublicKey;

  /** An optional set of programs that override the registered ones. */
  programs?: Program[];
};
