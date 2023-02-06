import { Buffer } from 'buffer';
import {
  FixedSize,
  OrderType,
  QuoteAsset,
  FixedSizeRecord,
} from '@convergence-rfq/rfq';
import type { Convergence } from '@/Convergence';
import {
  createSerializerFromBeet,
  createSerializerFromFixableBeetArgsStruct,
  createSerializerFromFixableBeet,
  Pda,
  Program,
  PublicKey,
} from '@/types';
import { sha256 } from '@noble/hashes/sha256';
import * as anchor from '@project-serum/anchor';
import * as beet from '@convergence-rfq/beet';
import * as beetSolana from '@convergence-rfq/beet-solana';
// import { Response, Rfq } from './models';
//@ts-ignore
import { hash } from '@project-serum/anchor/dist/cjs/utils/sha256'; //todo: is this correct?

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

    return Pda.find(programId, [
      Buffer.from('rfq', 'utf8'),
      taker.toBuffer(),
      legsHash,
      serializeOrderTypeData(orderType),
      sha256(serializeQuoteAssetData(quoteAsset)),
      serializeFixedSizeData(fixedSize),
      toLittleEndian(activeWindow, 4),
      toLittleEndian(settlingWindow, 4),
      recentTimestamp.toBuffer('le', 8),
    ]);
  }

  // response({ rfq, rfqResponse }: ResponseInput): Pda {
  //   const programId = this.programId();
  //   return Pda.find(programId, [
  //     Buffer.from('response', 'utf8'),
  //     rfq.address.toBuffer(),
  //     rfqResponse.maker.toBuffer(),
  //     // rfqResponse.bid.serialize(),
  //     // rfqResponse.ask.serialize(),
  //     // _pdaDistinguisher?
  //   ]);
  // }

  private programId(programs?: Program[]) {
    return this.convergence.programs().getRfq(programs).address;
  }
}

const serializeOrderTypeData = (orderType: OrderType): Buffer => {
  const orderTypeBeet = beet.fixedScalarEnum(OrderType) as beet.FixedSizeBeet<
    OrderType,
    OrderType
  >;

  const orderTypeSerializer = createSerializerFromBeet(orderTypeBeet);
  return orderTypeSerializer.serialize(orderType);
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

type RfqInput = {
  taker: PublicKey;

  legsHash: Buffer;

  orderType: OrderType;

  quoteAsset: QuoteAsset;

  fixedSize: FixedSize;

  activeWindow: number;

  settlingWindow: number;

  recentTimestamp: anchor.BN;
};

// type ResponseInput = {
//   rfq: Rfq;
// };

// new response pda:

// #[account(init, payer = maker, space = 8 + mem::size_of::<Response>() + rfq.legs.len() * 1, seeds = [
//   RESPONSE_SEED.as_bytes(),
//   rfq.key().as_ref(),
//   maker.key().as_ref(),
//   &bid.try_to_vec().unwrap(),
//   &ask.try_to_vec().unwrap(),
//   &pda_distinguisher.to_le_bytes(),
// ], bump)]
// pub response: Account<'info, Response>,
