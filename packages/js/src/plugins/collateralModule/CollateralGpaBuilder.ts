import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, collateralInfoDiscriminator } from '@convergence-rfq/rfq';

import { Convergence } from '../../Convergence';
import { GpaBuilder } from '../../utils';

const BUMP = 8;
const USER = BUMP + 1;

export class CollateralGpaBuilder extends GpaBuilder {
  constructor(convergence: Convergence, programId?: PublicKey) {
    super(convergence, programId ?? PROGRAM_ID);
    this.where(0, Buffer.from(collateralInfoDiscriminator));
  }

  whereUser(user: PublicKey) {
    return this.where(USER, user);
  }
}
