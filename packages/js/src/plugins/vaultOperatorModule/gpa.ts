import { PublicKey } from '@solana/web3.js';
import {
  // OrderType,
  PROGRAM_ID,
  vaultParamsDiscriminator,
  // StoredRfqState,
} from '@convergence-rfq/vault-operator';

import { Convergence } from '../../Convergence';
import { GpaBuilder } from '../../utils';

const CREATOR = 8;
const RFQ = CREATOR + 32;
const ACTIVE_WINDOW_EXPIRATION = RFQ + 32;
const TOKENS_WITHDRAWN = ACTIVE_WINDOW_EXPIRATION + 8;

export class VaultGpaBuilder extends GpaBuilder {
  constructor(convergence: Convergence, programId?: PublicKey) {
    super(convergence, programId ?? PROGRAM_ID);
    this.where(0, Buffer.from(vaultParamsDiscriminator));
  }

  whereCreator(creator: PublicKey) {
    return this.where(CREATOR, creator);
  }

  whereTokensWithdrawn(tokensWithdrawn: boolean) {
    return this.where(TOKENS_WITHDRAWN, tokensWithdrawn ? 1 : 0);
  }
}
