import { PublicKey } from '@solana/web3.js';
import {
  AuthoritySide,
  DefaultingParty,
  StoredResponseState,
} from '@convergence-rfq/rfq';
import { solitaNumberToApi } from '../../../utils';
import { ResponseAccount } from '../accounts';
import { ApiConfirmation, ApiQuote, toApiConfirmation, toApiQuote } from '.';

type ApiDefaultingParty = DefaultingParty;
type ApiAuthoritySide = AuthoritySide;
type ApiResponseState = StoredResponseState;

/**
 * This model captures all the relevant information about an Response
 * on the Solana blockchain.
 *
 * @group Models
 */
export type ApiResponse = Readonly<{
  /** The address of the Rfq. */
  address: PublicKey;

  /** The Maker's pubkey address. */
  maker: PublicKey;

  /** The address of the Rfq this Response corresponds to. */
  rfq: PublicKey;

  /** The timestamp at which this Response was created. */
  creationTimestamp: number;

  /** The amount of the Maker's collateral locked. */
  makerCollateralLocked: number;

  /** The amount of the Taker's collateral locked. */
  takerCollateralLocked: number;

  /** The current state of the Response. */
  state: ApiResponseState;

  /** The number of legs prepared by the Taker. */
  takerPreparedLegs: number;

  /** The number of legs prepared by the Maker. */
  makerPreparedLegs: number;

  /** The number of legs that have already been settled. */
  settledLegs: number;

  /** The Confirmation of this Response, if any. */
  confirmed: ApiConfirmation | null;

  /** The defaulting party of this Response, if any. */
  defaultingParty: ApiDefaultingParty | null;

  /** An array of `AuthoritySide`s showing whether the Maker or Taker
   *  initialized leg preparation for each prepared leg */
  legPreparationsInitializedBy: ApiAuthoritySide[];

  /** The bid, if any. If the `orderType` of the RFQ is
   * OrderType.Sell then this field is required. */
  bid: ApiQuote | null;

  /** The ask, if any. If the `orderType` of the RFQ is
   * OrderType.Buy then this field is required. */
  ask: ApiQuote | null;
}>;

export function toApiResponse(
  account: ResponseAccount,
  collateralDecimals: number,
  quoteDecimals: number
): ApiResponse {
  const {
    publicKey,
    data: {
      maker,
      rfq,
      creationTimestamp,
      makerCollateralLocked,
      takerCollateralLocked,
      state,
      takerPreparedLegs,
      makerPreparedLegs,
      settledLegs,
      confirmed,
      defaultingParty,
      legPreparationsInitializedBy,
      bid,
      ask,
    },
  } = account;

  return {
    address: publicKey,
    maker,
    rfq,
    creationTimestamp: Number(creationTimestamp),
    makerCollateralLocked: solitaNumberToApi(
      makerCollateralLocked,
      collateralDecimals
    ),
    takerCollateralLocked: solitaNumberToApi(
      takerCollateralLocked,
      collateralDecimals
    ),
    state,
    takerPreparedLegs,
    makerPreparedLegs,
    settledLegs,
    confirmed: confirmed ? toApiConfirmation(confirmed) : null,
    defaultingParty,
    legPreparationsInitializedBy,
    bid: bid ? toApiQuote(bid, quoteDecimals) : null,
    ask: ask ? toApiQuote(ask, quoteDecimals) : null,
  };
}
