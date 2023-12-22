import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, whitelistDiscriminator } from '@convergence-rfq/rfq';

import { Convergence } from '../../Convergence';
import { GpaBuilder } from '../../utils';

const CREATOR = 8;

export class WhitelistGpaBuilder extends GpaBuilder {
  constructor(convergence: Convergence, programId?: PublicKey) {
    super(convergence, programId ?? PROGRAM_ID);
    this.where(0, Buffer.from(whitelistDiscriminator));
  }

  whereCreator(maker: PublicKey) {
    return this.where(CREATOR, maker);
  }
}
