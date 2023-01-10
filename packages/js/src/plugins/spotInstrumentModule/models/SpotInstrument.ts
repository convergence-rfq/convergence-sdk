import { PublicKey } from '@solana/web3.js';
import { Side, Leg, sideBeet, baseAssetIndexBeet } from '@convergence-rfq/rfq';
import * as beet from '@metaplex-foundation/beet';
import * as beetSolana from '@metaplex-foundation/beet-solana';
import { Mint } from '../../tokenModule';
import { Instrument } from '../../instrumentModule/models/Instrument';
import { InstrumentClient } from '../../instrumentModule/InstrumentClient';
import { assert } from '@/utils';
import { Convergence } from '@/Convergence';
import { createSerializerFromFixableBeetArgsStruct } from '@/types';

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
  }

  static createForLeg(
    convergence: Convergence,
    mint: Mint,
    amount: number,
    side: Side
  ): InstrumentClient {
    const instrument = new SpotInstrument(convergence, mint, {
      amount,
      side,
    });
    return new InstrumentClient(convergence, instrument, {
      amount,
      side,
    });
  }

  getValidationAccounts() {
    const programs = this.convergence.programs().all();
    const rfqProgram = this.convergence.programs().getRfq(programs);
    const [mintInfoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('mint_info'), this.mint.address.toBuffer()],
      rfqProgram.address
    );
    return [{ pubkey: mintInfoPda, isSigner: false, isWritable: false }];
  }

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
