import { PublicKey } from '@solana/web3.js';

import { RfqAccount } from '../accounts';
import { assert, convertTimestamp, removeDecimals } from '../../../utils';
import {
  SpotLegInstrument,
  SpotQuoteInstrument,
} from '../../../plugins/spotInstrumentModule';
import {
  LegInstrument,
  QuoteInstrument,
} from '../../../plugins/instrumentModule';
import { Convergence } from '../../../Convergence';
import { collateralMintCache } from '../../../plugins/collateralModule';
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

  /** The quote asset of the Rfq. */
  readonly quoteAsset: QuoteInstrument;

  /** The quote asset mint. */
  readonly quoteMint: PublicKey;

  /** The time at which this Rfq was created. */
  readonly creationTimestamp: number;

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
  readonly nonResponseTakerCollateralLocked: number;

  /** The total amount of Taker collateral locked.
   * This includes collateral added when confirming a Response. */
  readonly totalTakerCollateralLocked: number;

  /** The total number of Responses to this Rfq. */
  readonly totalResponses: number;

  /** The number of Responses to this Rfq which have been
   *  cleared during the Rfq cleanup process. */
  readonly clearedResponses: number;

  /** The number of confirmed Responses to the Rfq. */
  readonly confirmedResponses: number;

  /** The legs of the Rfq. */
  readonly legs: LegInstrument[];
};

/** @group Model Helpers */
export const isRfq = (value: any): value is Rfq =>
  typeof value === 'object' && value.model === 'rfq';

/** @group Model Helpers */
export function assertRfq(value: any): asserts value is Rfq {
  assert(isRfq(value), 'Expected Rfq model');
}

/** @group Model Helpers */
export const toRfq = async (
  convergence: Convergence,
  account: RfqAccount
): Promise<Rfq> => {
  const quoteAsset = await SpotQuoteInstrument.parseFromQuote(
    convergence,
    account.data.quoteAsset
  );
  const collateralMint = await collateralMintCache.get(convergence);
  const collateralDecimals = collateralMint.decimals;
  return {
    model: 'rfq',
    address: account.publicKey,
    taker: account.data.taker,
    orderType: fromSolitaOrderType(account.data.orderType),
    size: fromSolitaFixedSize(account.data.fixedSize, quoteAsset.getDecimals()),
    quoteAsset,
    quoteMint: SpotLegInstrument.deserializeInstrumentData(
      Buffer.from(account.data.quoteAsset.instrumentData)
    ).mintAddress,
    creationTimestamp: convertTimestamp(account.data.creationTimestamp),
    activeWindow: account.data.activeWindow,
    settlingWindow: account.data.settlingWindow,
    expectedLegsSize: account.data.expectedLegsSize,
    state: fromSolitaStoredRfqState(account.data.state),
    nonResponseTakerCollateralLocked: removeDecimals(
      account.data.nonResponseTakerCollateralLocked,
      collateralDecimals
    ),
    totalTakerCollateralLocked: removeDecimals(
      account.data.totalTakerCollateralLocked,
      collateralDecimals
    ),
    totalResponses: account.data.totalResponses,
    clearedResponses: account.data.clearedResponses,
    confirmedResponses: account.data.confirmedResponses,
    legs: await Promise.all(
      account.data.legs.map((leg) => convergence.parseLegInstrument(leg))
    ),
  };
};
