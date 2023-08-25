import { Buffer } from 'buffer';
import { Sha256 } from '@aws-crypto/sha256-js';
import {
  FixedSize as SolitaFixedSize,
  OrderType as SolitaOrderType,
  QuoteAsset,
  Quote,
  quoteBeet,
  quoteAssetBeet,
  fixedSizeBeet,
} from '@convergence-rfq/rfq';
import * as anchor from '@project-serum/anchor';
import * as beet from '@convergence-rfq/beet';

import {
  createSerializerFromFixableBeetArgsStruct,
  createSerializerFromFixableBeet,
  createSerializerFromFixedSizeBeet,
  Pda,
  Program,
  PublicKey,
} from '../../types';
import type { Convergence } from '../../Convergence';
import { Option } from '../../utils';
import { FixedSize, toSolitaFixedSize } from './models';
import { OrderType, toSolitaOrderType } from './models/OrderType';

function toLittleEndian(value: number, bytes: number) {
  const buf = Buffer.allocUnsafe(bytes);
  buf.writeUIntLE(value, 0, bytes);
  return buf;
}

/**
 * This client allows you to build PDAs related to the RFQ module.
 *
 * @see {@link RfqClient}
 * @group Module Pdas
 */
export class RfqPdasClient {
  constructor(protected readonly convergence: Convergence) {}
  /** Finds the PDA of a given mint. */
  mintInfo({ mint }: MintInfoInput): Pda {
    const programId = this.programId();
    return Pda.find(programId, [
      Buffer.from('mint_info', 'utf8'),
      mint.toBuffer(),
    ]);
  }

  /** Finds the PDA of a given quote asset. */
  quote({ quoteAsset }: QuoteInput): Pda {
    const programId = this.programId();
    return Pda.find(programId, [
      Buffer.from('mint_info', 'utf8'),
      quoteAsset.data,
    ]);
  }

  /** Finds the PDA of an RFQ. */
  rfq({
    taker,
    legsHash,
    printTradeProvider,
    orderType,
    quoteAsset,
    fixedSize,
    activeWindow,
    settlingWindow,
    recentTimestamp,
  }: RfqInput): Pda {
    const programId = this.programId();

    const hash = new Sha256();
    hash.update(serializeQuoteAssetData(quoteAsset));
    const quoteHash = hash.digestSync();

    return Pda.find(programId, [
      Buffer.from('rfq', 'utf8'),
      taker.toBuffer(),
      legsHash,
      (printTradeProvider || PublicKey.default).toBuffer(),
      serializeOrderTypeData(toSolitaOrderType(orderType)),
      quoteHash,
      serializeFixedSizeData(toSolitaFixedSize(fixedSize, quoteAsset.decimals)),
      toLittleEndian(activeWindow, 4),
      toLittleEndian(settlingWindow, 4),
      recentTimestamp.toArrayLike(Buffer, 'le', 8),
    ]);
  }

  /** Finds the PDA of a Response. */
  response({ rfq, maker, bid, ask, pdaDistinguisher }: ResponseInput): Pda {
    const programId = this.programId();
    return Pda.find(programId, [
      Buffer.from('response', 'utf8'),
      rfq.toBuffer(),
      maker.toBuffer(),
      serializeOptionQuote(bid),
      serializeOptionQuote(ask),
      toLittleEndian(pdaDistinguisher, 2),
    ]);
  }

  private programId(programs?: Program[]) {
    return this.convergence.programs().getRfq(programs).address;
  }
}

const serializeOptionQuote = (quote: Option<Quote>) => {
  if (quote === null) {
    return Buffer.from([0]);
  }

  const serializedQuote = serializeQuoteData(quote);
  return Buffer.concat([Buffer.from([1]), serializedQuote]);
};

const serializeOrderTypeData = (orderType: SolitaOrderType): Buffer => {
  const orderTypeBeet = beet.fixedScalarEnum(
    SolitaOrderType
  ) as beet.FixedSizeBeet<SolitaOrderType, SolitaOrderType>;
  const orderTypeSerializer = createSerializerFromFixedSizeBeet(orderTypeBeet);

  return orderTypeSerializer.serialize(orderType);
};

const serializeQuoteData = (quote: Quote): Buffer => {
  const quoteSerializer = createSerializerFromFixableBeet(quoteBeet);

  return quoteSerializer.serialize(quote);
};

const serializeQuoteAssetData = (quoteAsset: QuoteAsset): Buffer => {
  const quoteAssetSerializer =
    createSerializerFromFixableBeetArgsStruct(quoteAssetBeet);

  return quoteAssetSerializer.serialize(quoteAsset);
};

const serializeFixedSizeData = (fixedSize: SolitaFixedSize): Buffer => {
  const fixedSizeSerializer = createSerializerFromFixableBeet(fixedSizeBeet);

  return fixedSizeSerializer.serialize(fixedSize);
};

type MintInfoInput = {
  /** The address of the mint account. */
  mint: PublicKey;

  /** An optional set of programs that override the registered ones. */
  programs?: Program[];
};

type QuoteInput = {
  /** The quote asset. */
  quoteAsset: QuoteAsset;

  /** An optional set of programs that override the registered ones. */
  programs?: Program[];
};

type RfqInput = {
  /** The taker's public key address. */
  taker: PublicKey;

  /** The SHA256 hash of the serialized legs of the RFQ. */
  legsHash: Buffer;

  printTradeProvider: PublicKey | null;

  /** The order type of the Rfq. */
  orderType: OrderType;

  /** The quote asset of the Rfq. */
  quoteAsset: QuoteAsset;

  /**
   * The type of the Rfq, specifying whether we fix the number of
   * base assets to be exchanged, the number of quote assets,
   * or neither.
   */
  fixedSize: FixedSize;

  /** The number of seconds during which this Rfq can be responded to. */
  activeWindow: number;

  /**
   * The number of seconds within which this Rfq must be settled
   *  after starting the settlement process.
   * */
  settlingWindow: number;

  /** A recent timestamp. */
  recentTimestamp: anchor.BN;
  // recentTimestamp: number;
};

type ResponseInput = {
  /** The Rfq public key. */
  rfq: PublicKey;

  /** The maker's public key address. */
  maker: PublicKey;

  /** Optional `bid` quote. */
  bid: Option<Quote>;

  /** Optional `ask` quote. */
  ask: Option<Quote>;

  /** A number to distinguish this response from other responses,
   * in the case that the maker responds to the same RFQ multiple
   * times with the same response. Otherwise it will always be 0. */
  pdaDistinguisher: number;
};
