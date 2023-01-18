import { Buffer } from 'buffer';
import { QuoteAsset } from '@convergence-rfq/rfq';
import type { Convergence } from '@/Convergence';
import { Pda, Program, PublicKey } from '@/types';

/**
 * This client allows you to build PDAs related to the RFQ module.
 *
 * @see {@link RfqClient}
 * @group Module Pdas
 */
export class RfqPdasClient {
  constructor(protected readonly convergence: Convergence) {}

  baseAsset({ baseAssetIndexValue, programs }: BaseAssetInput): Pda {
    const programId = this.programId(programs);
    return Pda.find(programId, [
      Buffer.from('base_asset', 'utf8'),
      toLittleEndian(baseAssetIndexValue, 2),
    ]);
  }

  mintInfo({ mint }: MintInfoInput): Pda {
    const programId = this.programId();
    return Pda.find(programId, [
      Buffer.from('mint_info', 'utf8'),
      mint.toBuffer(),
    ]);
  }

  quote({ quoteAsset }: QuoteInput): Pda {
    const programId = this.programId();
    return Pda.find(programId, [
      Buffer.from('mint_info', 'utf8'),
      quoteAsset.instrumentData,
    ]);
  }

  private programId(programs?: Program[]) {
    return this.convergence.programs().getRfq(programs).address;
  }
}

function toLittleEndian(value: number, bytes: number) {
  const buf = Buffer.allocUnsafe(bytes);
  buf.writeUIntLE(value, 0, bytes);
  return buf;
}

type BaseAssetInput = {
  baseAssetIndexValue: number;
  /** An optional set of programs that override the registered ones. */
  programs?: Program[];
};

type MintInfoInput = {
  /** The address of the mint account. */
  mint: PublicKey;

  /** An optional set of programs that override the registered ones. */
  programs?: Program[];
};

type QuoteInput = {
  /** The quote asset. */
  quoteAsset: QuoteAsset;

  /** An optional set of programs that override the registered ones. */
  programs?: Program[];
};
