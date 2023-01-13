import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from '@convergence-rfq/rfq';
import { Convergence } from '@/Convergence';
import { GpaBuilder } from '@/utils';

const RFQ_ACCOUNT_DISCRIMINATOR = [106, 19, 109, 78, 169, 13, 234, 58];
const TAKER = 8;
const INSTRUMENT = TAKER + 32;

export class RfqGpaBuilder extends GpaBuilder {
  constructor(convergence: Convergence, programId?: PublicKey) {
    super(convergence, programId ?? PROGRAM_ID);
    this.where(0, Buffer.from(RFQ_ACCOUNT_DISCRIMINATOR));
  }

  whereTaker(address: PublicKey) {
    return this.where(TAKER, address);
  }

  whereInstrument(address: PublicKey) {
    // TODO: Finish
    return this.where(INSTRUMENT, address);
  }
}
