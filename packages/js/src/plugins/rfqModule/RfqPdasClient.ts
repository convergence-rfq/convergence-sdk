import { Buffer } from 'buffer';
import {
  FixedSize,
  OrderType,
  QuoteAsset,
  QuoteRecord,
  FixedSizeRecord,
  Quote,
  priceQuoteBeet,
} from '@convergence-rfq/rfq';
import type { Convergence } from '@/Convergence';
import {
  createSerializerFromFixableBeetArgsStruct,
  createSerializerFromFixableBeet,
  createSerializerFromFixedSizeBeet,
  Pda,
  Program,
  PublicKey,
} from '@/types';
import * as anchor from '@project-serum/anchor';
import * as beet from '@convergence-rfq/beet';
import * as beetSolana from '@convergence-rfq/beet-solana';
import { Option } from '@/utils';
import { Sha256 } from '@aws-crypto/sha256-js';

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

  mintInfo({ mint }: MintInfoInput): Pda {
    const programId = this.programId();
    return Pda.find(programId, [
      Buffer.from('mint_info', 'utf8'),
      mint.toBuffer(),
    ]);
  }

  quote({ quoteAsset }: QuoteInput): Pda {
    const programId = this.programId();
    return Pda.find(programId, [
      Buffer.from('mint_info', 'utf8'),
      quoteAsset.instrumentData,
    ]);
  }

  rfq({
    taker,
    legsHash,
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
      serializeOrderTypeData(orderType),
      quoteHash,
      serializeFixedSizeData(fixedSize),
      toLittleEndian(activeWindow, 4),
      toLittleEndian(settlingWindow, 4),
      recentTimestamp.toBuffer('le', 8),
    ]);
  }

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

const serializeOrderTypeData = (orderType: OrderType): Buffer => {
  const orderTypeBeet = beet.fixedScalarEnum(OrderType) as beet.FixedSizeBeet<
    OrderType,
    OrderType
  >;
  const orderTypeSerializer = createSerializerFromFixedSizeBeet(orderTypeBeet);

  return orderTypeSerializer.serialize(orderType);
};

const serializeQuoteData = (quote: Quote): Buffer => {
  const quoteBeet = beet.dataEnum<QuoteRecord>([
    [
      'Standard',
      new beet.FixableBeetArgsStruct<QuoteRecord['Standard']>(
        [
          ['priceQuote', priceQuoteBeet],
          ['legsMultiplierBps', beet.u64],
        ],
        'QuoteRecord["Standard"]'
      ),
    ],

    [
      'FixedSize',
      new beet.FixableBeetArgsStruct<QuoteRecord['FixedSize']>(
        [['priceQuote', priceQuoteBeet]],
        'QuoteRecord["FixedSize"]'
      ),
    ],
  ]) as beet.FixableBeet<Quote>;

  const quoteSerializer = createSerializerFromFixableBeet(quoteBeet);

  return quoteSerializer.serialize(quote);
};

const serializeQuoteAssetData = (quoteAsset: QuoteAsset): Buffer => {
  const quoteAssetBeet = new beet.FixableBeetArgsStruct<QuoteAsset>(
    [
      ['instrumentProgram', beetSolana.publicKey],
      ['instrumentData', beet.bytes],
      ['instrumentDecimals', beet.u8],
    ],
    'QuoteAsset'
  );

  const quoteAssetSerializer =
    createSerializerFromFixableBeetArgsStruct(quoteAssetBeet);

  return quoteAssetSerializer.serialize(quoteAsset);
};

//@ts-ignore
const serializeFixedSizeData = (fixedSize: FixedSize): Buffer => {
  const fixedSizeBeet = beet.dataEnum<FixedSizeRecord>([
    [
      'None',
      new beet.BeetArgsStruct<FixedSizeRecord['None']>(
        [['padding', beet.u64]],
        'FixedSizeRecord["None"]'
      ),
    ],

    [
      'BaseAsset',
      new beet.BeetArgsStruct<FixedSizeRecord['BaseAsset']>(
        [['legsMultiplierBps', beet.u64]],
        'FixedSizeRecord["BaseAsset"]'
      ),
    ],

    [
      'QuoteAsset',
      new beet.BeetArgsStruct<FixedSizeRecord['QuoteAsset']>(
        [['quoteAmount', beet.u64]],
        'FixedSizeRecord["QuoteAsset"]'
      ),
    ],
  ]) as beet.FixableBeet<FixedSize>;

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

//@ts-ignore
type RfqInput = {
  /** The taker's public key address. */
  taker: PublicKey;

  /** The SHA256 hash of the serialized legs of the RFQ. */
  legsHash: Buffer;

  /** The order type of the Rfq. */
  orderType: OrderType;

  /** The quote asset of the Rfq. */
  quoteAsset: QuoteAsset;

  /** Whether this Rfq is open (no size specified), or a fixed amount of the base asset,
   * or a fixed amount of the quote asset. */
  fixedSize: FixedSize;

  /** The number of seconds during which this Rfq can be responded to. */
  activeWindow: number;

  /** The number of seconds within which this Rfq must be settled
   *  after starting the settlement process. */
  settlingWindow: number;

  /** A recent timestamp. */
  recentTimestamp: anchor.BN;
  // recentTimestamp: number;
};
//@ts-ignore
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
