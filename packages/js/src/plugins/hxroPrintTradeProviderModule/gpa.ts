import { PublicKey } from '@solana/web3.js';
import {
  PROGRAM_ID,
  lockedCollateralRecordDiscriminator,
} from '@convergence-rfq/hxro-print-trade-provider';

import { Convergence } from '../../Convergence';
import { GpaBuilder } from '../../utils';

const USER = 8;
const RESPONSE = USER + 32;
const TRG = RESPONSE + 32;
const IS_IN_USE = TRG + 32;

export class LockCollateralRecordGpaBuilder extends GpaBuilder {
  constructor(convergence: Convergence, programId?: PublicKey) {
    super(convergence, programId ?? PROGRAM_ID);
    this.where(0, Buffer.from(lockedCollateralRecordDiscriminator));
  }

  whereUser(user: PublicKey) {
    return this.where(USER, user);
  }

  whereInUse(isInUse: boolean) {
    return this.where(IS_IN_USE, isInUse ? 1 : 0);
  }
}
