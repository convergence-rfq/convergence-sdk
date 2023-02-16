import { PublicKey } from '@solana/web3.js';
import { OrderType, PROGRAM_ID, rfqDiscriminator } from '@convergence-rfq/rfq';
import { Convergence } from '@/Convergence';
import { GpaBuilder } from '@/utils';

const TAKER = 8;
const ORDER_TYPE = TAKER + 32;
const FIXED_SIZE = ORDER_TYPE + 1;
const QUOTE_ASSET = FIXED_SIZE + 16;
const CREATION_TIMESTAMP = QUOTE_ASSET + 64;
const ACTIVE_WINDOW = CREATION_TIMESTAMP + 8;
const SETTLING_WINDOW = ACTIVE_WINDOW + 4;
const EXPECTED_LEGS_SIZE = SETTLING_WINDOW + 4;
const EXPECTED_LEGS_HASH = EXPECTED_LEGS_SIZE + 2;
const STATE = EXPECTED_LEGS_HASH + 32;
const NON_RESPONSE_TAKER_COLLATERAL_LOCKED = STATE + 1;
const TOTAL_TAKER_COLLATERAL_LOCKED = NON_RESPONSE_TAKER_COLLATERAL_LOCKED + 8;
const TOTAL_RESPONSES = TOTAL_TAKER_COLLATERAL_LOCKED + 8;
const CLEARED_RESPONSES = TOTAL_RESPONSES + 4;
const CONFIRMED_RESPONSES = CLEARED_RESPONSES + 4;
//@ts-ignore
const LEGS = CONFIRMED_RESPONSES + 4;

export class RfqGpaBuilder extends GpaBuilder {
  constructor(convergence: Convergence, programId?: PublicKey) {
    super(convergence, programId ?? PROGRAM_ID);
    this.where(0, Buffer.from(rfqDiscriminator));
  }

  whereTaker(taker: PublicKey) {
    return this.where(TAKER, taker);
  }

  whereOrderType(orderType: OrderType) {
    return this.where(ORDER_TYPE, orderType);
  }

  // whereInstrument(address: PublicKey) {
  //   // TODO: Finish
  //   return this.where(INSTRUMENT, address);
  // }
}
