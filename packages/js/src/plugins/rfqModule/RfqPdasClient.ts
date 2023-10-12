import { Buffer } from 'buffer';
import {
  FixedSize as SolitaFixedSize,
  OrderType as SolitaOrderType,
  QuoteRecord,
  FixedSizeRecord,
  Quote,
  priceQuoteBeet,
} from '@convergence-rfq/rfq';
import * as anchor from '@project-serum/anchor';
import * as beet from '@convergence-rfq/beet';

import {
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

  /** Finds the PDA of an RFQ. */
  rfq({
    taker,
    legAsset,
    legAssetDecimals,
    quoteAsset,
    quoteAssetDecimals,
    orderType,
    fixedSize,
    activeWindow,
    recentTimestamp,
  }: RfqInput): Pda {
    const programId = this.programId();

    return Pda.find(programId, [
      Buffer.from('rfq', 'utf8'),
      taker.toBuffer(),
      serializeOrderTypeData(toSolitaOrderType(orderType)),
      serializeFixedSizeData(
        toSolitaFixedSize(fixedSize, legAssetDecimals, quoteAssetDecimals)
      ),
      legAsset.toBuffer(),
      quoteAsset.toBuffer(),
      toLittleEndian(activeWindow, 4),
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

  legEscrow(response: PublicKey): Pda {
    const programId = this.programId();
    return Pda.find(programId, [
      Buffer.from('leg_escrow', 'utf8'),
      response.toBuffer(),
    ]);
  }

  quoteEscrow(response: PublicKey): Pda {
    const programId = this.programId();
    return Pda.find(programId, [
      Buffer.from('quote_escrow', 'utf8'),
      response.toBuffer(),
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
  const quoteBeet = beet.dataEnum<QuoteRecord>([
    [
      'Standard',
      new beet.FixableBeetArgsStruct<QuoteRecord['Standard']>(
        [
          ['priceQuote', priceQuoteBeet],
          ['legAmount', beet.u64],
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

const serializeFixedSizeData = (fixedSize: SolitaFixedSize): Buffer => {
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
        [['legAmount', beet.u64]],
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
  ]) as beet.FixableBeet<SolitaFixedSize>;

  const fixedSizeSerializer = createSerializerFromFixableBeet(fixedSizeBeet);

  return fixedSizeSerializer.serialize(fixedSize);
};

type RfqInput = {
  /** The taker's public key address. */
  taker: PublicKey;

  /** Mint address for leg asset */
  legAsset: PublicKey;

  legAssetDecimals: number;

  /** Mint address for quote asset */
  quoteAsset: PublicKey;

  quoteAssetDecimals: number;

  /** The order type of the Rfq. */
  orderType: OrderType;

  /**
   * The type of the Rfq, specifying whether we fix the number of
   * base assets to be exchanged, the number of quote assets,
   * or neither.
   */
  fixedSize: FixedSize;

  /** The number of seconds during which this Rfq can be responded to. */
  activeWindow: number;

  /** A recent timestamp. */
  recentTimestamp: anchor.BN;
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
