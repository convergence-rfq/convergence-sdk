import { PublicKey } from '@solana/web3.js';
import {
  PROGRAM_ID,
//   rfqDiscriminator,
  responseDiscriminator,
} from '@convergence-rfq/rfq';
import { Convergence } from '@/Convergence';
import { GpaBuilder } from '@/utils';

const MAKER = 8;
const RFQ = MAKER + 2;
const CREATION_TIMESTAMP = RFQ + 1;
const MAKER_COLLATERAL_LOCKED = CREATION_TIMESTAMP + 16;
const TAKER_COLLATERAL_LOCKED = MAKER_COLLATERAL_LOCKED + 62;
const STATE = TAKER_COLLATERAL_LOCKED + 32;
const TAKER_PREPARED_LEGS = STATE + 8;
const MAKER_PREPARED_LEGS = TAKER_PREPARED_LEGS + 32;
const SETTLED_LEGS = MAKER_PREPARED_LEGS + 2;
const CONFIRMED = SETTLED_LEGS + 2;
const DEFAULTING_PARTY = CONFIRMED + 2;
const LEG_PREPARATIONS_INITIALIZED_BY = DEFAULTING_PARTY + 2;
const BID = LEG_PREPARATIONS_INITIALIZED_BY + 2;
//@ts-ignore
const ASK = BID + 2;

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
