import { PublicKey } from '@solana/web3.js';
import { COption } from '@convergence-rfq/beet';
import {
  AuthoritySide,
  Confirmation,
  DefaultingParty,
  Quote,
  StoredResponseState,
} from '@convergence-rfq/rfq';

import { ResponseAccount } from '../accounts';
import { assert, removeDecimals } from '../../../utils';

/**
 * This model captures all the relevant information about an Response
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
  readonly bid: COption<Quote>;

  /** The ask required for buy and optionally two-way order types. */
  readonly ask: COption<Quote>;

  /** The amount of the maker collateral locked. */
  readonly makerCollateralLocked: number;

  /** The amount of the taker collateral locked. */
  readonly takerCollateralLocked: number;

  /** The current state of the response. */
  readonly state: StoredResponseState;

  /** The number of legs prepared by the taker. */
  readonly takerPreparedLegs: number;

  /** The number of legs prepared by the maker. */
  readonly makerPreparedLegs: number;

  /** The number of legs that have already been settled. */
  readonly settledLegs: number;

  /** The optional confirmation of this response. */
  readonly confirmed: COption<Confirmation>;

  /** The optional defaulting party of this response. */
  readonly defaultingParty: COption<DefaultingParty>;

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

/** @group Model Helpers */
export const toResponse = (
  account: ResponseAccount,
  collateralDecimals: number
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
  // TODO: Create new state
  state: account.data.state,
  // TODO: Remove
  takerPreparedLegs: account.data.takerPreparedLegs,
  // TODO: Remove
  makerPreparedLegs: account.data.makerPreparedLegs,
  // TODO: Remove
  settledLegs: account.data.settledLegs,
  confirmed: account.data.confirmed,
  defaultingParty: account.data.defaultingParty,
  legPreparationsInitializedBy: account.data.legPreparationsInitializedBy,
  // TODO: Convert bid and ask to add decimals
  bid: account.data.bid,
  ask: account.data.ask,
});
