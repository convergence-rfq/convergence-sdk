import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, rfqDiscriminator } from '@convergence-rfq/rfq';
import { Convergence } from '@/Convergence';
import { GpaBuilder } from '@/utils';

const TAKER = 8;
const ORDER_TYPE = TAKER + 2; // size = 1, align = 1
const LAST_LOOK_ENABLED = ORDER_TYPE + 1; // size = 1
const FIXED_SIZE = LAST_LOOK_ENABLED + 16; // size = 12, align = 4
const QUOTE_ASSET = FIXED_SIZE + 62; // size = 64, align = 8
const ACCESS_MANAGER = QUOTE_ASSET + 32; // size = 32, align = 1
const CREATION_TIMESTAMP = ACCESS_MANAGER + 8; // size = 8, align = 8
const INSTRUMENT = CREATION_TIMESTAMP + 32;

export class RfqGpaBuilder extends GpaBuilder {
  constructor(convergence: Convergence, programId?: PublicKey) {
    super(convergence, programId ?? PROGRAM_ID);
    this.where(0, Buffer.from(rfqDiscriminator));
  }

  whereTaker(address: PublicKey) {
    return this.where(TAKER, address);
  }

  whereInstrument(address: PublicKey) {
    // TODO: Finish
    return this.where(INSTRUMENT, address);
  }
}
