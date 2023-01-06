import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from '@convergence-rfq/rfq';
import { Convergence } from '@/Convergence';
import { GpaBuilder } from '@/utils';

const RFQ_ACCOUNT_DISCRIMINATOR = Buffer.from([
  106, 19, 109, 78, 169, 13, 234, 58,
]);

export class RfqGpaBuilder extends GpaBuilder {
  constructor(convergence: Convergence, programId?: PublicKey) {
    super(convergence, programId ?? PROGRAM_ID);
    this.where(0, RFQ_ACCOUNT_DISCRIMINATOR);
  }
}
