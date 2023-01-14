import { PublicKey } from '@solana/web3.js';
import { bignum, COption } from '@metaplex-foundation/beet';
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

  /** The mint address of the Response. */
  readonly address: PublicKey;

  readonly maker: PublicKey;

  readonly rfq: PublicKey;

  readonly creationTimestamp: bignum;

  readonly makerCollateralLocked: bignum;

  readonly takerCollateralLocked: bignum;

  readonly state: StoredResponseState;

  readonly takerPreparedLegs: bignum;

  readonly makerPreparedLegs: bignum;

  readonly settledLegs: bignum;

  readonly confirmed: COption<Confirmation>;

  readonly defaultingParty: COption<DefaultingParty>;

  readonly legPreparationsInitializedBy: AuthoritySide[];

  readonly bid: COption<Quote>;

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
