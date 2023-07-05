import { PublicKey } from '@solana/web3.js';
import {
  Confirmation as SolitaConfirmation,
  DefaultingParty as SolitaDefaultingParty,
  Quote as SolitaQuote,
  StoredResponseState as SolitaStoredResponseState,
} from '@convergence-rfq/rfq';
import { BN } from '@project-serum/anchor';

import { ResponseAccount } from '../accounts';
import { assert, removeDecimals, addDecimals } from '../../../utils';
import { ABSOLUTE_PRICE_DECIMALS, LEG_MULTIPLIER_DECIMALS } from '../constants';
import { AuthoritySide, fromSolitaAuthoritySide } from './AuthoritySide';

type Quote = SolitaQuote;

/**
 * This model captures all the relevant information about a response
 * on the Solana blockchain.
 *
 * @group Models
 */
export type Response = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'response';

  /** The address of the response. */
  readonly address: PublicKey;

  /** The maker pubkey address. */
  readonly maker: PublicKey;

  /** The address of the RFQ this response corresponds to. */
  readonly rfq: PublicKey;

  /** The timestamp at which this response was created. */
  readonly creationTimestamp: number;

  /** The bid required for sell and optionally two-way order types. */
  readonly bid: Quote | null;

  /** The ask required for buy and optionally two-way order types. */
  readonly ask: Quote | null;

  /** The amount of the maker collateral locked. */
  readonly makerCollateralLocked: number;

  /** The amount of the taker collateral locked. */
  readonly takerCollateralLocked: number;

  /** The current state of the response. */
  readonly state: SolitaStoredResponseState;

  /** The number of legs prepared by the taker. */
  readonly takerPreparedLegs: number;

  /** The number of legs prepared by the maker. */
  readonly makerPreparedLegs: number;

  /** The number of legs that have already been settled. */
  readonly settledLegs: number;

  /** The optional confirmation of this response. */
  readonly confirmed: SolitaConfirmation | null;

  /** The optional defaulting party of this response. */
  readonly defaultingParty: SolitaDefaultingParty | null;

  /** Shows whether the maker or taker initialized preparation for each prepared leg. */
  readonly legPreparationsInitializedBy: AuthoritySide[];
};

/** @group Model Helpers */
export const isResponse = (value: any): value is Response =>
  typeof value === 'object' && value.model === 'response';

/** @group Model Helpers */
export function assertResponse(value: any): asserts value is Response {
  assert(isResponse(value), 'Expected Response model');
}

export const toSolitaQuote = (
  quote: Quote | null,
  decimals: number
): SolitaQuote | null => {
  if (quote) {
    const priceQuoteWithDecimals = addDecimals(
      Number(quote.priceQuote.amountBps),
      decimals
    );

    // TODO: Is this correct?
    quote.priceQuote.amountBps = priceQuoteWithDecimals.mul(
      new BN(10).pow(new BN(ABSOLUTE_PRICE_DECIMALS))
    );

    if (quote.__kind === 'Standard') {
      quote.legsMultiplierBps = addDecimals(
        Number(quote.legsMultiplierBps),
        LEG_MULTIPLIER_DECIMALS
      );
    }

    return quote;
  }

  return null;
};

const fromSolitaQuote = (
  quote: SolitaQuote | null,
  decimals: number
): Quote | null => {
  if (quote) {
    const priceQuoteWithoutDecimals = removeDecimals(
      quote.priceQuote.amountBps,
      decimals
    );

    // TODO: Is this correct?
    quote.priceQuote.amountBps = removeDecimals(
      new BN(priceQuoteWithoutDecimals),
      ABSOLUTE_PRICE_DECIMALS
    );

    if (quote.__kind === 'Standard') {
      const legsMultiplierBps = removeDecimals(
        quote.legsMultiplierBps,
        LEG_MULTIPLIER_DECIMALS
      );
      quote.legsMultiplierBps = new BN(legsMultiplierBps);
    }

    return quote;
  }

  return null;
};

/** @group Model Helpers */
export const toResponse = (
  account: ResponseAccount,
  collateralDecimals: number,
  quoteDecimals: number
): Response => ({
  model: 'response',
  address: account.publicKey,
  maker: account.data.maker,
  rfq: account.data.rfq,
  creationTimestamp: Number(account.data.creationTimestamp) * 1_000,
  makerCollateralLocked: removeDecimals(
    account.data.makerCollateralLocked,
    collateralDecimals
  ),
  takerCollateralLocked: removeDecimals(
    account.data.takerCollateralLocked,
    collateralDecimals
  ),
  // TODO: Create new state for UI
  state: account.data.state,
  // TODO: Abstract with response model method
  takerPreparedLegs: account.data.takerPreparedLegs,
  // TODO: Abstract with response model method
  makerPreparedLegs: account.data.makerPreparedLegs,
  // TODO: Abstract with response model method
  settledLegs: account.data.settledLegs,
  confirmed: account.data.confirmed,
  defaultingParty: account.data.defaultingParty,
  legPreparationsInitializedBy: account.data.legPreparationsInitializedBy.map(fromSolitaAuthoritySide),
  bid: fromSolitaQuote(account.data.bid, quoteDecimals),
  ask: fromSolitaQuote(account.data.ask, quoteDecimals),
});
