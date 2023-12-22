import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, responseDiscriminator } from '@convergence-rfq/rfq';

import { Convergence } from '../../Convergence';
import { GpaBuilder } from '../../utils';

const CREATOR = 8;

export class WhitelistGpaBuilder extends GpaBuilder {
  constructor(convergence: Convergence, programId?: PublicKey) {
    super(convergence, programId ?? PROGRAM_ID);
    this.where(0, Buffer.from(responseDiscriminator));
  }

  whereCreator(maker: PublicKey) {
    return this.where(CREATOR, maker);
  }
}
