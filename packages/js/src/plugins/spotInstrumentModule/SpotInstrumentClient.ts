import {
  Leg,
  QuoteAsset,
  Side,
  sideBeet,
  baseAssetIndexBeet,
  // BaseAssetIndex,
  // legBeet,
} from '@convergence-rfq/rfq';
import { Mint } from '../tokenModule/models/Mint';
import { SpotInstrument } from './models';
//import { EMPTY_LEG_SIZE } from './constants';
import { Convergence } from '@/Convergence';
import { PublicKey, toBigNumber } from '@/types';
import { createSerializerFromFixableBeetArgsStruct } from '@/types';
import * as beet from '@metaplex-foundation/beet';
import * as beetSolana from '@metaplex-foundation/beet-solana';
/**
 * This is a client for the spotInstrumentModule.
 *
 * It enables us to manage the spot instrument.
 *
 * You may access this client via the `spotInstrument()` method of your `Convergence` instance.
 *
 * ```ts
 * const spotInstrumentClient = convergence.spotInstrument();
 * ```
 *
 * @example
 * ```ts
 * const spotInstrument = { ... };
 * const spotInstrumentLeg = await convergence
 *   .spotInstrument()
 *   .createLeg(spotInstrument);
 * ```
 *
 * @group Modules
 */
export class SpotInstrumentClient {
  constructor(protected readonly convergence: Convergence) {}

  createQuoteAsset(mint: Mint): QuoteAsset {
    const spotInstrumentProgram = this.convergence
      .programs()
      .getSpotInstrument();
    return {
      instrumentProgram: spotInstrumentProgram.address,
      instrumentData: mint.address.toBuffer(),
      instrumentDecimals: mint.decimals,
    };
  }

  calculateLegSize(instrument: SpotInstrument): number {
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
    const leg = this.createLeg(instrument);
    const buf = legSerializer.serialize(leg);

    return buf.length + 2 + 2;
  }

  createInstrument(
    mint: PublicKey,
    decimals: number,
    side: Side,
    amount: number
  ): SpotInstrument {
    return {
      model: 'spotInstrument',
      mint,
      side,
      amount: toBigNumber(amount),
      decimals,
      data: mint.toBuffer(),
    };
  }

  createLeg(spotInstrument: SpotInstrument): Leg {
    const spotInstrumentProgram = this.convergence
      .programs()
      .getSpotInstrument();
    return {
      instrumentProgram: spotInstrumentProgram.address,
      // TODO: Do not hardcode
      baseAssetIndex: { value: 0 },
      instrumentData: spotInstrument.data,
      instrumentAmount: spotInstrument.amount,
      instrumentDecimals: spotInstrument.decimals,
      side: spotInstrument.side,
    };
  }
}
