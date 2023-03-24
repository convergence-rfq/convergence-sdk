import { PublicKey } from '@solana/web3.js';

import { OrderType, StoredRfqState, QuoteAsset, Leg } from '../types';
import { RfqAccount } from '../accounts';
import { ApiFixedSize, toApiFixedSize } from '.';
import { solitaNumberToApi } from '@/utils';

export type ApiRfqState = StoredRfqState;
export type ApiOrderType = OrderType;

/**
 * This model captures all the relevant information about an RFQ
 * on the Solana blockchain. That includes the Rfq's leg accounts.
 *
 * @group Models
 */
export type ApiRfq = Readonly<{
  /** The address of the Rfq. */
  address: PublicKey;

  /** The Taker's pubkey address. */
  taker: PublicKey;

  /** The order type of the Rfq. */
  orderType: ApiOrderType;

  /** Whether this Rfq is open (no size specified), or a fixed amount of the base asset,
   * or a fixed amount of the quote asset. */
  fixedSize: ApiFixedSize;

  /** The quote asset of the Rfq. */
  quoteAsset: QuoteAsset; // TODO PARSE

  /** The time at which this Rfq was created. */
  creationTimestamp: number;

  /** The number of seconds during which this Rfq can be responded to. */
  activeWindow: number;

  /** The number of seconds within which this Rfq must be settled
   *  after starting the settlement process. */
  settlingWindow: number;

  /** The combined size of all legs of Rfq. This must include the sizes
   *  of any legs to be added in the future. */
  expectedLegsSize: number;

  /** The state of the Rfq. */
  state: ApiRfqState;

  /** The amount of Taker collateral locked at the time
   *  of finalized construction of the Rfq. */
  nonResponseTakerCollateralLocked: number;

  /** The total amount of Taker collateral locked.
   * This includes collateral added when confirming a Response. */
  totalTakerCollateralLocked: number;

  /** The total number of Responses to this Rfq. */
  totalResponses: number;

  /** The number of Responses to this Rfq which have been
   *  cleared during the Rfq cleanup process. */
  clearedResponses: number;

  /** The number of confirmed Responses to the Rfq. */
  confirmedResponses: number;

  /** The legs of the Rfq. */
  legs: Leg[]; // TODO PARSE
}>;

export function toApiRfq(
  account: RfqAccount,
  collateralDecimals: number,
  quoteDecimals: number
): ApiRfq {
  const {
    publicKey,
    data: {
      taker,
      orderType,
      fixedSize,
      quoteAsset,
      creationTimestamp,
      activeWindow,
      settlingWindow,
      expectedLegsSize,
      state,
      nonResponseTakerCollateralLocked,
      totalTakerCollateralLocked,
      totalResponses,
      clearedResponses,
      confirmedResponses,
      legs,
    },
  } = account;

  return {
    address: publicKey,
    taker,
    orderType,
    fixedSize: toApiFixedSize(fixedSize, quoteDecimals),
    quoteAsset,
    creationTimestamp: Number(creationTimestamp),
    activeWindow,
    settlingWindow,
    expectedLegsSize,
    state,
    nonResponseTakerCollateralLocked: solitaNumberToApi(
      nonResponseTakerCollateralLocked,
      collateralDecimals
    ),
    totalTakerCollateralLocked: solitaNumberToApi(
      totalTakerCollateralLocked,
      collateralDecimals
    ),
    totalResponses,
    clearedResponses,
    confirmedResponses,
    legs,
  };
}
