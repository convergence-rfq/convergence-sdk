import { PublicKey } from '@solana/web3.js';
import {
  OrderType,
  PROGRAM_ID,
  rfqDiscriminator,
  StoredRfqState,
} from '@convergence-rfq/rfq';

import { Convergence } from '../../Convergence';
import { GpaBuilder } from '../../utils';

const TAKER = 8;
const ORDER_TYPE = TAKER + 32;
const FIXED_SIZE = ORDER_TYPE + 1;
const LEG_ASSET = FIXED_SIZE + 9; // or 16?
const QUOTE_ASSET = LEG_ASSET + 33;
const CREATION_TIMESTAMP = QUOTE_ASSET + 33;
const ACTIVE_WINDOW = CREATION_TIMESTAMP + 8;
const STATE = ACTIVE_WINDOW + 4;

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

  whereLegAsset(legAsset: PublicKey) {
    return this.where(ORDER_TYPE, legAsset);
  }

  whereQuoteAsset(quoteAsset: PublicKey) {
    return this.where(ORDER_TYPE, quoteAsset);
  }
  whereState(state: StoredRfqState) {
    return this.where(STATE, Number(state));
  }
}
