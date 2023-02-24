import { PublicKey } from '@solana/web3.js';
import { bignum, COption } from '@convergence-rfq/beet';
import {
  AuthoritySide,
  Confirmation,
  DefaultingParty,
  Quote,
  StoredResponseState,
} from '@convergence-rfq/rfq';
import { ResponseAccount } from '../accounts';
import { assert } from '@/utils';

/**
 * This model captures all the relevant information about an Response
 * on the Solana blockchain.
 *
 * @group Models
 */
export type Response = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'response';

  /** The address of the Response. */
  readonly address: PublicKey;

  /** The Maker's pubkey address. */
  readonly maker: PublicKey;

  /** The address of the Rfq this Response corresponds to. */
  readonly rfq: PublicKey;

  /** The timestamp at which this Response was created. */
  readonly creationTimestamp: bignum;

  /** The amount of the Maker's collateral locked. */
  readonly makerCollateralLocked: bignum;

  /** The amount of the Taker's collateral locked. */
  readonly takerCollateralLocked: bignum;

  /** The current state of the Response. */
  readonly state: StoredResponseState;

  /** The number of legs prepared by the Taker. */
  readonly takerPreparedLegs: number;

  /** The number of legs prepared by the Maker. */
  readonly makerPreparedLegs: number;

  /** The number of legs that have already been settled. */
  readonly settledLegs: number;

  /** The Confirmation of this Response, if any. */
  readonly confirmed: COption<Confirmation>;

  /** The defaulting party of this Response, if any. */
  readonly defaultingParty: COption<DefaultingParty>;

  /** An array of `AuthoritySide`s showing whether the Maker or Taker
   *  initialized leg preparation for each prepared leg */
  readonly legPreparationsInitializedBy: AuthoritySide[];

  /** The bid, if any. If the `orderType` of the RFQ is 
   * OrderType.Sell then this field is required. */
  readonly bid: COption<Quote>;

  /** The ask, if any. If the `orderType` of the RFQ is 
   * OrderType.Buy then this field is required. */
  readonly ask: COption<Quote>;
};

/** @group Model Helpers */
export const isResponse = (value: any): value is Response =>
  typeof value === 'object' && value.model === 'response';

/** @group Model Helpers */
export function assertResponse(value: any): asserts value is Response {
  assert(isResponse(value), `Expected Response model`);
}

/** @group Model Helpers */
export const toResponse = (account: ResponseAccount): Response => ({
  model: 'response',
  address: account.publicKey,
  maker: account.data.maker,
  rfq: account.data.rfq,
  creationTimestamp: account.data.creationTimestamp,
  makerCollateralLocked: account.data.makerCollateralLocked,
  takerCollateralLocked: account.data.takerCollateralLocked,
  state: account.data.state,
  takerPreparedLegs: account.data.takerPreparedLegs,
  makerPreparedLegs: account.data.makerPreparedLegs,
  settledLegs: account.data.settledLegs,
  confirmed: account.data.confirmed,
  defaultingParty: account.data.defaultingParty,
  legPreparationsInitializedBy: account.data.legPreparationsInitializedBy,
  bid: account.data.bid,
  ask: account.data.ask,
});
