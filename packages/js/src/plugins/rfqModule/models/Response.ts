import { PublicKey } from '@solana/web3.js';

import { ResponseAccount } from '../accounts';
import { assert } from '../../../utils/assert';
import { Confirmation, fromSolitaConfirmation } from './Confirmation';
import {
  StoredResponseState,
  fromSolitaStoredResponseState,
} from './StoredResponseState';
import { fromSolitaQuote, Quote } from './Quote';
import { Rfq } from './Rfq';

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

  /** The current state of the response. */
  readonly state: StoredResponseState;

  // TODO: Should be a ResponseSide?
  /** The optional confirmation of this response. */
  readonly confirmed: Confirmation | null;
};

/** @group Model Helpers */
export const isResponse = (value: any): value is Response =>
  typeof value === 'object' && value.model === 'response';

/** @group Model Helpers */
export function assertResponse(value: any): asserts value is Response {
  assert(isResponse(value), 'Expected Response model');
}

/** @group Model Helpers */
export const toResponse = (account: ResponseAccount, rfq: Rfq): Response => ({
  model: 'response',
  address: account.publicKey,
  maker: account.data.maker,
  rfq: account.data.rfq,
  creationTimestamp: Number(account.data.creationTimestamp) * 1_000,
  state: fromSolitaStoredResponseState(account.data.state),
  confirmed:
    account.data.confirmed &&
    fromSolitaConfirmation(account.data.confirmed, rfq.legAssetDecimals),
  bid:
    account.data.bid &&
    fromSolitaQuote(
      account.data.bid,
      rfq.legAssetDecimals,
      rfq.quoteAssetDecimals
    ),
  ask:
    account.data.ask &&
    fromSolitaQuote(
      account.data.ask,
      rfq.legAssetDecimals,
      rfq.quoteAssetDecimals
    ),
});
