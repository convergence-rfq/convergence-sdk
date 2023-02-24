import { PublicKey } from '@solana/web3.js';
import {
  Side,
  Leg,
  QuoteAsset,
  sideBeet,
  baseAssetIndexBeet,
} from '@convergence-rfq/rfq';
import * as beet from '@convergence-rfq/beet';
import * as beetSolana from '@convergence-rfq/beet-solana';
import { FixableBeetArgsStruct } from '@convergence-rfq/beet';
import { publicKey } from '@convergence-rfq/beet-solana';
import { Mint } from '../../tokenModule';
import { Instrument } from '../../instrumentModule/models/Instrument';
import { InstrumentClient } from '../../instrumentModule/InstrumentClient';
import { assert } from '@/utils';
import { Convergence } from '@/Convergence';
import { createSerializerFromFixableBeetArgsStruct } from '@/types';

type InstrumentData = {
  mint: PublicKey;
};

export const SpotInstrumentDataSerializer =
  createSerializerFromFixableBeetArgsStruct(
    new FixableBeetArgsStruct<InstrumentData>(
      [['mint', publicKey]],
      'InstrumentData'
    )
  );
/**
 * This model captures all the relevant information about a spot
 * instrument on the Solana blockchain.
 *
 * @group Models
 */
export class SpotInstrument implements Instrument {
  readonly model = 'spotInstrument';
  readonly decimals: number;

  constructor(
    readonly convergence: Convergence,
    readonly mint: Mint,
    readonly legInfo?: {
      amount: number;
      side: Side;
    }
  ) {
    this.convergence = convergence;
    this.mint = mint;
    this.decimals = mint.decimals;
    this.legInfo = legInfo;

    if (legInfo && this.legInfo) {
      this.legInfo.amount = legInfo.amount * Math.pow(10, mint.decimals);
    }
  }

  /** Helper */
  static createForLeg(
    convergence: Convergence,
    mint: Mint,
    amount: number,
    side: Side
  ): InstrumentClient {
    const instrument = new SpotInstrument(convergence, mint, {
      amount: amount * Math.pow(10, mint.decimals),
      side,
    });
    return new InstrumentClient(convergence, instrument, {
      amount: amount * Math.pow(10, mint.decimals),
      side,
    });
  }

  /** Helper method to get validation accounts for a spot instrument. */
  getValidationAccounts() {
    const mintInfo = this.convergence
      .rfqs()
      .pdas()
      .mintInfo({ mint: this.mint.address });
    return [{ pubkey: mintInfo, isSigner: false, isWritable: false }];
  }

  /** Helper method to get the `QuoteAsset` for this instrument. */
  toQuoteAsset(): QuoteAsset {
    return {
      instrumentProgram: this.getProgramId(),
      instrumentData: this.serializeInstrumentData(),
      instrumentDecimals: this.mint.decimals,
    };
  }

  /** Helper method to serialize the instrument data for this instrument. */
  serializeInstrumentData(): Buffer {
    return Buffer.from(this.mint.address.toBytes());
  }

  /** Helper method to deserialize the instrument data for this instrument. */
  static deserializeInstrumentData(buffer: Buffer): any {
    const [instrumentData] = SpotInstrumentDataSerializer.deserialize(buffer);
    return instrumentData;
  }

  /** Helper method to create a spot instrument from a `Leg`. */
  static async createFromLeg(
    convergence: Convergence,
    leg: Leg
  ): Promise<SpotInstrument> {
    const { side, instrumentAmount, instrumentData } = leg;
    const mint = await convergence
      .tokens()
      .findMintByAddress({ address: new PublicKey(instrumentData) });
    return new SpotInstrument(convergence, mint, {
      amount:
        typeof instrumentAmount === 'number'
          ? instrumentAmount
          : instrumentAmount.toNumber(),
      side,
    });
  }

  /** Helper method to serialize a `Leg` for this instrument. */
  serializeLegData(leg: Leg): Buffer {
    const legBeet = new beet.FixableBeetArgsStruct<Leg>(
      [
        ['instrumentProgram', beetSolana.publicKey],
        ['baseAssetIndex', baseAssetIndexBeet],
        ['instrumentData', beet.bytes],
        ['instrumentAmount', beet.u64],
        ['instrumentDecimals', beet.u8],
        ['side', sideBeet],
      ],
      'Leg'
    );

    const legSerializer = createSerializerFromFixableBeetArgsStruct(legBeet);
    return legSerializer.serialize(leg);
  }

  getProgramId(): PublicKey {
    return this.convergence.programs().getSpotInstrument().address;
  }
}

/** @group Model Helpers */
export const isSpotInstrument = (value: any): value is SpotInstrument =>
  typeof value === 'object' && value.model === 'spotInstrument';

/** @group Model Helpers */
export function assertSpotInstrument(
  value: any
): asserts value is SpotInstrument {
  assert(isSpotInstrument(value), `Expected SpotInstrument model`);
}
