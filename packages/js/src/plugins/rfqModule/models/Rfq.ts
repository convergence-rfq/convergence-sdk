import { PublicKey } from '@solana/web3.js';
import { RfqAccount } from '../accounts';
import { assert } from '../../../utils/assert';
import { convertTimestamp } from '../../../utils/conversions';
import { FixedSize, fromSolitaFixedSize } from './FixedSize';
import { OrderType, fromSolitaOrderType } from './OrderType';
import { StoredRfqState, fromSolitaStoredRfqState } from './StoredRfqState';

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
  readonly size: FixedSize;

  /** The leg asset mint. */
  readonly legAsset: PublicKey;

  readonly legAssetDecimals: number;

  /** The quote asset mint. */
  readonly quoteAsset: PublicKey;

  readonly quoteAssetDecimals: number;

  /** The time at which this Rfq was created. */
  readonly creationTimestamp: number;

  /** The number of seconds during which this Rfq can be responded to. */
  readonly activeWindow: number;

  /** The state of the Rfq. */
  readonly state: StoredRfqState;

  /** The total number of Responses to this Rfq. */
  readonly totalResponses: number;

  /** The number of settled Responses to this Rfq. */
  readonly settledResponses: number;

  /** The number of Responses to this Rfq which have been
   *  cleared during the Rfq cleanup process. */
  readonly clearedResponses: number;
};

/** @group Model Helpers */
export const isRfq = (value: any): value is Rfq =>
  typeof value === 'object' && value.model === 'rfq';

/** @group Model Helpers */
export function assertRfq(value: any): asserts value is Rfq {
  assert(isRfq(value), 'Expected Rfq model');
}

/** @group Model Helpers */
export const toRfq = async (account: RfqAccount): Promise<Rfq> => {
  const { data, publicKey } = account;
  return {
    model: 'rfq',
    address: publicKey,
    taker: data.taker,
    orderType: fromSolitaOrderType(data.orderType),
    size: fromSolitaFixedSize(
      data.fixedSize,
      data.legAssetDecimals,
      data.quoteAssetDecimals
    ),
    legAsset: data.legAsset,
    legAssetDecimals: data.legAssetDecimals,
    quoteAsset: data.quoteAsset,
    quoteAssetDecimals: data.quoteAssetDecimals, // TODO
    creationTimestamp: convertTimestamp(data.creationTimestamp),
    activeWindow: data.activeWindow,
    state: fromSolitaStoredRfqState(data.state),
    totalResponses: data.totalResponses,
    settledResponses: data.settledResponses,
    clearedResponses: data.clearedResponses,
  };
};
