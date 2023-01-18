import { Buffer } from 'buffer';
import { Rfq } from '../rfqModule';
import type { Convergence } from '@/Convergence';
import { Pda, PublicKey } from '@/types';

/**
 * This client allows you to build PDAs related to the Instrument module.
 *
 * @see {@link InstrumentClient}
 * @group Module Pdas
 */
export class InstrumentPdasClient {
  constructor(protected readonly convergence: Convergence) {}

  /** Finds the PDA of a given instrument escrow. */
  instrumentEscrow({ response, index, rfqModel }: InstrumentEscrowInput): Pda {
    return Pda.find(rfqModel.legs[index].instrumentProgram, [
      Buffer.from('escrow', 'utf8'),
      response.toBuffer(),
      Buffer.from([0, index]),
    ]);
  }
  /** Finds the PDA of a given quote escrow. */
  quoteEscrow({ response, program }: QuoteEscrowInput): Pda {
    // const programId = this.programId(programs);
    return Pda.find(program, [
      Buffer.from('escrow', 'utf8'),
      response.toBuffer(),
      Buffer.from([1, 0]),
    ]);
  }
}

type InstrumentEscrowInput = {
  /** The address of the Response account. */
  response: PublicKey;

  /** The leg index. */
  index: number;

  /** The Rfq Model. */
  rfqModel: Rfq;
};

type QuoteEscrowInput = {
  /** The address of the Response account. */
  response: PublicKey;

  /** The quote escrow program */
  program: PublicKey;
};
