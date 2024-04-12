import { PublicKey } from '@solana/web3.js';
import { DefaultingParty as SolitaDefaultingParty } from '@convergence-rfq/rfq';

import { ResponseAccount } from '../accounts';
import {
  convertTimestampToMilliSeconds,
  removeDecimals,
} from '../../../utils/conversions';
import { assert } from '../../../utils/assert';
import { Confirmation, fromSolitaConfirmation } from './Confirmation';
import { AuthoritySide, fromSolitaAuthoritySide } from './AuthoritySide';
import {
  StoredResponseState,
  fromSolitaStoredResponseState,
} from './StoredResponseState';
import { fromSolitaQuote, Quote } from './Quote';
import { Rfq, isSettledAsPrintTrade } from './Rfq';

/**
 * This model captures all the relevant information about a response
 * on the Solana blockchain.
 *
 * @group Models
 */
type CommonResponse = {
  /** The address of the response. */
  readonly address: PublicKey;

  /** The maker pubkey address. */
  readonly maker: PublicKey;

  /** The address of the RFQ this response corresponds to. */
  readonly rfq: PublicKey;

  /** The timestamp at which this response was created. */
  readonly creationTimestamp: number;

  /** The timestamp at which this response will expire. */
  readonly expirationTimestamp: number;

  /** The bid required for sell and optionally two-way order types. */
  readonly bid: Quote | null;

  /** The ask required for buy and optionally two-way order types. */
  readonly ask: Quote | null;

  /** The amount of the maker collateral locked. */
  readonly makerCollateralLocked: number;

  /** The amount of the taker collateral locked. */
  readonly takerCollateralLocked: number;

  /** The current state of the response. */
  readonly state: StoredResponseState;

  // TODO: Should be a ResponseSide?
  /** The optional confirmation of this response. */
  readonly confirmed: Confirmation | null;

  //
  /** The optional defaulting party of this response. */
  readonly defaultingParty: SolitaDefaultingParty | null;
};

export type EscrowResponse = CommonResponse & {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'escrowResponse';

  /** The number of legs prepared by the taker. */
  readonly takerPreparedLegs: number;

  /** The number of legs prepared by the maker. */
  readonly makerPreparedLegs: number;

  /** The number of legs that have already been settled. */
  readonly settledLegs: number;

  /** Shows whether the maker or taker initialized preparation for each prepared leg. */
  readonly legPreparationsInitializedBy: AuthoritySide[];
};

export type PrintTradeResponse = CommonResponse & {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'printTradeResponse';

  /** The number of legs prepared by the taker. */
  readonly takerPrepared: boolean;

  /** The number of legs prepared by the maker. */
  readonly makerPrepared: boolean;

  /** Shows whether the maker or taker initialized the print trade. */
  readonly printTradeInitializedBy: AuthoritySide | null;

  readonly additionalData: Uint8Array;
};

export type Response = EscrowResponse | PrintTradeResponse;

/** @group Model Helpers */
export const isResponse = (value: any): value is Response =>
  typeof value === 'object' &&
  (value.model === 'escrowResponse' || value.model === 'printTradeResponse');

/** @group Model Helpers */
export function assertResponse(value: any): asserts value is Response {
  assert(isResponse(value), 'Expected Response model');
}

/** @group Model Helpers */
export const toResponse = (
  account: ResponseAccount,
  collateralDecimals: number,
  rfq: Rfq
): Response => {
  if (!rfq.address.equals(account.data.rfq)) {
    throw new Error('Passed rfq does not match the one stored in response');
  }

  const commonResponse: CommonResponse = {
    address: account.publicKey,
    maker: account.data.maker,
    rfq: account.data.rfq,
    creationTimestamp: convertTimestampToMilliSeconds(
      account.data.creationTimestamp
    ),
    expirationTimestamp: convertTimestampToMilliSeconds(
      account.data.expirationTimestamp
    ),
    makerCollateralLocked: removeDecimals(
      account.data.makerCollateralLocked,
      collateralDecimals
    ),
    takerCollateralLocked: removeDecimals(
      account.data.takerCollateralLocked,
      collateralDecimals
    ),
    state: fromSolitaStoredResponseState(account.data.state),
    bid:
      account.data.bid &&
      fromSolitaQuote(account.data.bid, rfq.quoteAsset.getDecimals()),
    ask:
      account.data.ask &&
      fromSolitaQuote(account.data.ask, rfq.quoteAsset.getDecimals()),
    confirmed:
      account.data.confirmed && fromSolitaConfirmation(account.data.confirmed),
    defaultingParty: account.data.defaultingParty,
  };

  if (isSettledAsPrintTrade(rfq)) {
    return {
      model: 'printTradeResponse',
      ...commonResponse,
      takerPrepared: account.data.takerPreparedCounter > 0,
      makerPrepared: account.data.makerPreparedCounter > 0,
      printTradeInitializedBy:
        account.data.printTradeInitializedBy !== null
          ? fromSolitaAuthoritySide(account.data.printTradeInitializedBy)
          : null,
      additionalData: account.data.additionalData,
    };
  }

  return {
    model: 'escrowResponse',
    ...commonResponse,
    takerPreparedLegs: account.data.takerPreparedCounter,
    makerPreparedLegs: account.data.makerPreparedCounter,
    settledLegs: account.data.settledEscrowLegs,
    legPreparationsInitializedBy:
      account.data.escrowLegPreparationsInitializedBy.map(
        fromSolitaAuthoritySide
      ),
  };
};
