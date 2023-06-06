import { Leg, QuoteAsset, legBeet } from '@convergence-rfq/rfq';

import { AccountMeta } from '@solana/web3.js';
import { createSerializerFromFixableBeetArgsStruct } from '../../types';
import { addDecimals } from '../../utils/conversions';
import { LegInstrument, QuoteInstrument } from './models';

/**
 * This is a client for the Instrument Module.
 *
 * It enables us to manage the instruments.
 *
 * You may access this client via the `instrument()` method of your `Convergence` instance.
 *
 * ```ts
 * const instrument = new SpotInstrument({ ... });
 * const instrumentClient =
 *   convergence.instrument(instrument, { amount: 1, side: Side.Bid });
 * ```
 *
 * @example
 * ```ts
 * ```
 *
 * @group Modules
 */
// export class InstrumentClient {
//   constructor(
//     protected convergence: Convergence,
//     protected instrument: LegInstrumentInterface,
//     protected legInfo?: {
//       amount: number;
//       side: Side;
//     }
//   ) {}

//   async toLegData(): Promise<Leg> {
//     if (this.legInfo) {
//       return {
//         instrumentProgram: this.instrument.getProgramId(),
//         baseAssetIndex: await this.instrument.getBaseAssetIndex(),
//         instrumentData: this.instrument.serializeInstrumentData(),
//         instrumentAmount: toBigNumber(this.legInfo.amount),
//         instrumentDecimals: this.instrument.decimals,
//         side: this.legInfo.side,
//       };
//     }
//     throw Error('Instrument is used for leg');
//   }

//   toQuoteAsset() {
//     if (this.legInfo) {
//       throw Error('Instrument is used for quote');
//     }
//     return {
//       instrumentProgram: this.instrument.getProgramId(),
//       instrumentData: this.instrument.serializeInstrumentData(),
//       instrumentDecimals: this.instrument.mint.decimals,
//     };
//   }

//   async getLegDataSize(): Promise<number> {
//     return this.serializeLegData(await this.toLegData()).length;
//   }

//   serializeLegData(leg: Leg): Buffer {
//     const legSerializer = createSerializerFromFixableBeetArgsStruct(legBeet);
//     return legSerializer.serialize(leg);
//   }

//   getProgramAccount(): AccountMeta {
//     return {
//       pubkey: this.instrument.getProgramId(),
//       isSigner: false,
//       isWritable: false,
//     };
//   }

//   getValidationAccounts() {
//     return [this.getProgramAccount()].concat(
//       this.instrument.getValidationAccounts()
//     );
//   }
// }

export function toLeg(legInstrument: LegInstrument): Leg {
  return {
    instrumentProgram: legInstrument.getProgramId(),
    baseAssetIndex: legInstrument.getBaseAssetIndex(),
    instrumentData: legInstrument.serializeInstrumentData(),
    instrumentAmount: addDecimals(
      legInstrument.getAmount(),
      legInstrument.getDecimals()
    ),
    instrumentDecimals: legInstrument.getDecimals(),
    side: legInstrument.getSide(),
  };
}

export function serializeAsLeg(legInstrument: LegInstrument) {
  const legSerializer = createSerializerFromFixableBeetArgsStruct(legBeet);
  return legSerializer.serialize(toLeg(legInstrument));
}

export function getSerializedLegLength(legInstrument: LegInstrument) {
  return serializeAsLeg(legInstrument).length;
}

export function getProgramAccount(legInstrument: LegInstrument): AccountMeta {
  return {
    pubkey: legInstrument.getProgramId(),
    isSigner: false,
    isWritable: false,
  };
}

export function getValidationAccounts(
  legInstrument: LegInstrument
): AccountMeta[] {
  return [getProgramAccount(legInstrument)].concat(
    legInstrument.getValidationAccounts()
  );
}

export function toQuote(legInstrument: QuoteInstrument): QuoteAsset {
  return {
    instrumentProgram: legInstrument.getProgramId(),
    instrumentData: legInstrument.serializeInstrumentData(),
    instrumentDecimals: legInstrument.getDecimals(),
  };
}
