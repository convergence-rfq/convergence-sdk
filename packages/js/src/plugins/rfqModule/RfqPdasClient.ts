import { Buffer } from 'buffer';
import { FixedSize, OrderType, QuoteAsset } from '@convergence-rfq/rfq';
import type { Convergence } from '@/Convergence';
import { Pda, Program, PublicKey } from '@/types';
// import { sha256 } from '@noble/hashes/sha256';
import { BN } from '@project-serum/anchor';
// import { Response, Rfq } from './models';
//@ts-ignore
import { hash } from '@project-serum/anchor/dist/cjs/utils/sha256'; //todo: is this correct?
//should be hash from solana-program?

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
  }: RfqInput): Pda {
    const programId = this.programId();

    const currentTimestamp = new BN(Math.floor(Date.now() / 1000) - 1);

    return Pda.find(programId, [
      Buffer.from('rfq', 'utf8'),
      taker.toBuffer(),
      legsHash,
      orderType,
      quoteAsset,
      fixedSize,
      toLittleEndian(activeWindow, 4),
      toLittleEndian(settlingWindow, 4),
      currentTimestamp.toBuffer('le', 8),
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

// export function calculateLegsHash(
//   legs: InstrumentController[],
//   program: Program<RfqIdl>
// ) {
//   let x = program.idl.types[12]; //AuthoritySide
//   let y = x.type;
//   const serializedLegsData = legs.map((leg) =>
//     program.coder.types.encode('Leg', leg.toLegData())
//   );
//   const lengthBuffer = Buffer.alloc(4);
//   lengthBuffer.writeInt32LE(legs.length);
//   const fullLegDataBuffer = Buffer.concat([
//     lengthBuffer,
//     ...serializedLegsData,
//   ]);
//   return sha256(fullLegDataBuffer);
// }

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

// TODO: this should pretty much only take the Rfq itself and we can extract everything else from that

//TODO: we haven't created the Rfq yet so we might have to pass these fields individually instead
//  of just passing RFQ.
type RfqInput = {
  taker: PublicKey;

  legsHash: Buffer;

  orderType: OrderType;

  quoteAsset: QuoteAsset;

  fixedSize: FixedSize;

  activeWindow: number;

  settlingWindow: number;
};

// type ResponseInput = {
//   rfq: Rfq;
// };

// new rfq pda:

// #[account(init, payer = taker, space = 8 + mem::size_of::<Rfq>() + expected_legs_size as usize, seeds = [
//   RFQ_SEED.as_bytes(), // 'rfq'
//   taker.key().as_ref(),
//   &expected_legs_hash,
//   &[order_type as u8],
//   &hash(&quote_asset.try_to_vec().unwrap()).to_bytes(),
//   &fixed_size.try_to_vec().unwrap(),
//   &active_window.to_le_bytes(),
//   &settling_window.to_le_bytes(),
//   &recent_timestamp.to_le_bytes(),
// ], bump)]
// pub rfq: Box<Account<'info, Rfq>>,

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
