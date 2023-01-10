import { PublicKey } from '@solana/web3.js';
import { bignum, COption } from '@metaplex-foundation/beet';
import {
  OrderType,
  StoredRfqState,
  FixedSize,
  QuoteAsset,
  Leg,
} from '../types';
import { RfqAccount } from '../accounts';
import { assert } from '@/utils';

/**
 * This model captures all the relevant information about an RFQ
 * on the Solana blockchain. That includes the Rfq's leg accounts.
 *
 * @group Models
 */
export type Rfq = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'rfq';

  /** The mint address of the Rfq. */
  readonly address: PublicKey;

  readonly taker: PublicKey;

  readonly orderType: OrderType;

  readonly lastLookEnabled: boolean;

  readonly fixedSize: FixedSize;

  readonly quoteAsset: QuoteAsset;

  readonly accessManager: COption<PublicKey>;

  readonly creationTimestamp: bignum;

  readonly activeWindow: number;

  readonly settlingWindow: number;

  readonly expectedLegSize: number;

  readonly state: StoredRfqState;

  readonly nonResponseTakerCollateralLocked: bignum;

  readonly totalTakerCollateralLocked: bignum;

  readonly totalResponses: number;

  readonly clearedResponses: number;

  readonly confirmedResponses: number;

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
  lastLookEnabled: account.data.lastLookEnabled,
  fixedSize: account.data.fixedSize,
  quoteAsset: account.data.quoteAsset,
  accessManager: account.data.accessManager,
  creationTimestamp: account.data.creationTimestamp,
  activeWindow: account.data.activeWindow,
  settlingWindow: account.data.settlingWindow,
  expectedLegSize: account.data.expectedLegSize,
  state: account.data.state,
  nonResponseTakerCollateralLocked:
    account.data.nonResponseTakerCollateralLocked,
  totalTakerCollateralLocked: account.data.totalTakerCollateralLocked,
  totalResponses: account.data.totalResponses,
  clearedResponses: account.data.clearedResponses,
  confirmedResponses: account.data.confirmedResponses,
  legs: account.data.legs,
});
