import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, responseDiscriminator } from '@convergence-rfq/rfq';

import { Convergence } from '../../Convergence';
import { GpaBuilder } from '../../utils';

const MAKER = 8;
const RFQ = MAKER + 32;

export class ResponseGpaBuilder extends GpaBuilder {
  constructor(convergence: Convergence, programId?: PublicKey) {
    super(convergence, programId ?? PROGRAM_ID);
    this.where(0, Buffer.from(responseDiscriminator));
  }

  whereMaker(taker: PublicKey) {
    return this.where(MAKER, taker);
  }

  whereRfq(address: PublicKey) {
    return this.where(RFQ, address);
  }
}
