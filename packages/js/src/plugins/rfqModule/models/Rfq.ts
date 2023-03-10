import { PublicKey } from '@solana/web3.js';
import { bignum } from '@convergence-rfq/beet';
import {
  OrderType,
  StoredRfqState,
  FixedSize,
  QuoteAsset,
  Leg,
} from '../types';
import { RfqAccount } from '../accounts';
import { assert } from '@/utils';
import { SpotInstrument } from '@/plugins/spotInstrumentModule';

/**
 * This model captures all the relevant information about an RFQ
 * on the Solana blockchain. That includes the Rfq's leg accounts.
 *
 * @group Models
 */
export type Rfq = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'rfq';

  /** The address of the Rfq. */
  readonly address: PublicKey;

  /** The Taker's pubkey address. */
  readonly taker: PublicKey;

  /** The order type of the Rfq. */
  readonly orderType: OrderType;

  /** Whether this Rfq is open (no size specified), or a fixed amount of the base asset,
   * or a fixed amount of the quote asset. */
  readonly fixedSize: FixedSize;

  /** The quote asset of the Rfq. */
  readonly quoteAsset: QuoteAsset;

  /** The quote asset mint. */
  readonly quoteMint: PublicKey;

  /** The time at which this Rfq was created. */
  readonly creationTimestamp: bignum;

  /** The number of seconds during which this Rfq can be responded to. */
  readonly activeWindow: number;

  /** The number of seconds within which this Rfq must be settled
   *  after starting the settlement process. */
  readonly settlingWindow: number;

  /** The combined size of all legs of Rfq. This must include the sizes
   *  of any legs to be added in the future. */
  readonly expectedLegsSize: number;

  /** The state of the Rfq. */
  readonly state: StoredRfqState;

  /** The amount of Taker collateral locked at the time
   *  of finalized construction of the Rfq. */
  nonResponseTakerCollateralLocked: bignum;

  /** The total amount of Taker collateral locked.
   * This includes collateral added when confirming a Response. */
  totalTakerCollateralLocked: bignum;

  /** The total number of Responses to this Rfq. */
  readonly totalResponses: number;

  /** The number of Responses to this Rfq which have been
   *  cleared during the Rfq cleanup process. */
  readonly clearedResponses: number;

  /** The number of confirmed Responses to the Rfq. */
  readonly confirmedResponses: number;

  /** The legs of the Rfq. */
  readonly legs: Leg[];
};

/** @group Model Helpers */
export const isRfq = (value: any): value is Rfq =>
  typeof value === 'object' && value.model === 'rfq';

/** @group Model Helpers */
export function assertRfq(value: any): asserts value is Rfq {
  assert(isRfq(value), `Expected Rfq model`);
}

/** @group Model Helpers */
export const toRfq = (account: RfqAccount): Rfq => ({
  model: 'rfq',
  address: account.publicKey,
  taker: account.data.taker,
  orderType: account.data.orderType,
  fixedSize: account.data.fixedSize,
  quoteAsset: account.data.quoteAsset,
  quoteMint: SpotInstrument.deserializeInstrumentData(
    Buffer.from(account.data.quoteAsset.instrumentData)
  ).mint,
  creationTimestamp: account.data.creationTimestamp,
  activeWindow: account.data.activeWindow,
  settlingWindow: account.data.settlingWindow,
  expectedLegsSize: account.data.expectedLegsSize,
  state: account.data.state,
  nonResponseTakerCollateralLocked:
    account.data.nonResponseTakerCollateralLocked,
  totalTakerCollateralLocked: account.data.totalTakerCollateralLocked,
  totalResponses: account.data.totalResponses,
  clearedResponses: account.data.clearedResponses,
  confirmedResponses: account.data.confirmedResponses,
  legs: account.data.legs,
});
