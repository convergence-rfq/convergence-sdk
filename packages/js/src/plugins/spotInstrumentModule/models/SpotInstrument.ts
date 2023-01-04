import { PublicKey } from '@solana/web3.js';
import { Side, Leg, sideBeet, baseAssetIndexBeet } from '@convergence-rfq/rfq';
import { Mint } from '../../tokenModule';
import { Instrument } from '../../instrumentModule/models/Instrument';
import { InstrumentClient } from '../../instrumentModule/InstrumentClient';
import { assert } from '@/utils';
import { Convergence } from '@/Convergence';
import * as beet from '@metaplex-foundation/beet';
import * as beetSolana from '@metaplex-foundation/beet-solana';
import { createSerializerFromFixableBeetArgsStruct } from '@/types';

/**
 * This model captures all the relevant information about a spot
 * instrument on the Solana blockchain.
 *
 * @group Models
 */
export class SpotInstrument implements Instrument {
  readonly model = 'spotInstrument';

  constructor(
    readonly convergence: Convergence,
    readonly mint: Mint,
    readonly legInfo?: {
      amount: number;
      side: Side;
      baseAssetIndex: number;
    }
  ) {
    this.convergence = convergence;
    this.mint = mint;
    this.legInfo = legInfo;
  }

  static createForLeg(
    convergence: Convergence,
    mint: Mint,
    amount: number,
    side: Side
  ): InstrumentClient {
    // TODO: Get the base asset index from the program
    const baseAssetIndex = 0;
    const instrument = new SpotInstrument(convergence, mint, {
      amount,
      side,
      baseAssetIndex,
    });

    return new InstrumentClient(convergence, instrument, {
      amount,
      side,
      baseAssetIndex,
    });
  }

  async getValidationAccounts() {
    return [{ pubkey: PublicKey.default, isSigner: false, isWritable: false }];
  }

  //static createForQuote(
  //  context: Context,
  //  mint = context.assetToken
  //): InstrumentController {
  //  const instrument = new SpotInstrument(context, mint);
  //  mint.assertRegistered();
  //  return new InstrumentController(instrument, null, mint.decimals);
  //}

  //static async addInstrument(context: Context) {
  //  await context.addInstrument(
  //    getSpotInstrumentProgram().programId,
  //    true,
  //    1,
  //    7,
  //    3,
  //    3,
  //    4
  //  );
  //  await context.riskEngine.setInstrumentType(
  //    getSpotInstrumentProgram().programId,
  //    InstrumentType.Spot
  //  );
  //}

  serializeInstrumentData(): Buffer {
    return Buffer.from(this.mint.address.toBytes());
  }

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
    const buf = legSerializer.serialize(leg);

    return buf;
  }

  getProgramId(): PublicKey {
    return this.convergence.programs().getSpotInstrument().address;
  }

  //calculateLegSize(instrument: SpotInstrument): number {
  //  return instrument.data.length;
  //}

  //createInstrument(
  //  mint: PublicKey,
  //  decimals: number,
  //  side: Side,
  //  amount: number
  //): SpotInstrument {
  //  return {
  //    model: 'spotInstrument',
  //    mint,
  //    side,
  //    amount: toBigNumber(amount),
  //    decimals,
  //    data: mint.toBuffer(),
  //  };
  //}
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
