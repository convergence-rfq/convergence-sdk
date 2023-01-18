import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, rfqDiscriminator } from '@convergence-rfq/rfq';
import { Convergence } from '@/Convergence';
import { GpaBuilder } from '@/utils';
import { toBigNumber } from '@/types';

const DISCRIMINATOR = 8;
const TAKER = DISCRIMINATOR;
const ORDER_TYPE = TAKER + 2;
const LAST_LOOK_ENABLED = ORDER_TYPE + 1;
const FIXED_SIZE = LAST_LOOK_ENABLED + 16;
const QUOTE_ASSET = FIXED_SIZE + 62;
const ACCESS_MANAGER = QUOTE_ASSET + 32;
const CREATION_TIMESTAMP = ACCESS_MANAGER + 8;
const ACTIVE_WINDOW = CREATION_TIMESTAMP + 4;
const SETTLING_WINDOW = ACTIVE_WINDOW + 4;

export class RfqGpaBuilder extends GpaBuilder {
  constructor(convergence: Convergence, programId?: PublicKey) {
    super(convergence, programId ?? PROGRAM_ID);
    this.where(0, Buffer.from(rfqDiscriminator));
  }

  whereTaker(taker: PublicKey) {
    return this.where(TAKER, taker);
  }

  whereActive(currentTime: number) {
    return this.where(SETTLING_WINDOW, toBigNumber(currentTime));
  }
}
