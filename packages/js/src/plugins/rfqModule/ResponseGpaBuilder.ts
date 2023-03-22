import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, responseDiscriminator } from '@convergence-rfq/rfq';

import { Convergence } from '../../Convergence';
import { GpaBuilder } from '../../utils';

const MAKER = 8;
const RFQ = MAKER + 32;
const CREATION_TIMESTAMP = RFQ + 32;
const MAKER_COLLATERAL_LOCKED = CREATION_TIMESTAMP + 8;
const TAKER_COLLATERAL_LOCKED = MAKER_COLLATERAL_LOCKED + 8;
const STATE = TAKER_COLLATERAL_LOCKED + 8;
const TAKER_PREPARED_LEGS = STATE + 1;
const MAKER_PREPARED_LEGS = TAKER_PREPARED_LEGS + 1;
const SETTLED_LEGS = MAKER_PREPARED_LEGS + 1;
const CONFIRMED = SETTLED_LEGS + 1;
const DEFAULTING_PARTY = CONFIRMED + 24;
const LEG_PREPARATIONS_INITIALIZED_BY = DEFAULTING_PARTY + 1;
const BID = LEG_PREPARATIONS_INITIALIZED_BY + 24;
//@ts-ignore
const ASK = BID + 32;

export class ResponseGpaBuilder extends GpaBuilder {
  constructor(convergence: Convergence, programId?: PublicKey) {
    super(convergence, programId ?? PROGRAM_ID);
    this.where(0, Buffer.from(responseDiscriminator));
  }

  whereMaker(taker: PublicKey) {
    return this.where(MAKER, taker);
  }

  whereRfq(address: PublicKey) {
    // TODO: Finish
    return this.where(RFQ, address);
  }
}
