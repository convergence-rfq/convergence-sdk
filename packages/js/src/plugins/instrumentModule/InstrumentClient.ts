import { Leg, Side, sideBeet, baseAssetIndexBeet } from '@convergence-rfq/rfq';
import { AccountMeta } from '@solana/web3.js';
import * as beet from '@metaplex-foundation/beet';
import * as beetSolana from '@metaplex-foundation/beet-solana';
import { PsyoptionsEuropeanInstrument } from '../psyoptionsEuropeanInstrumentModule';
import { PsyoptionsAmericanInstrument } from '../psyoptionsAmericanInstrumentModule';
import { SpotInstrument } from '../spotInstrumentModule';
import type { Convergence } from '@/Convergence';
import {
  toBigNumber,
  createSerializerFromFixableBeetArgsStruct,
} from '@/types';
//@ts-ignore
import { InstrumentPdasClient } from './InstrumentPdasClient';

/**
 * This is a client for the instrumentModule.
 *
 * It enables us to manage the instruments.
 *
 * You may access this client via the `instrument()` method of your `Convergence` instance.
 *
 * ```ts
 * const instrument = new SpotInstrument({ ... });
 * const instrumentClient = convergence.instrument(instrument, { amount: 1, side: Side.Bid });
 * ```
 *
 * @example
 * ```ts
 * ```
 *
 * @group Modules
 */
export class InstrumentClient {
  constructor(
    protected convergence: Convergence,
    protected instrument:
      | PsyoptionsEuropeanInstrument
      | SpotInstrument
      | PsyoptionsAmericanInstrument,
    protected legInfo?: {
      amount: number;
      side: Side;
    }
  ) {}

  // pdas() {
  //   return new InstrumentPdasClient(this.convergence);
  // }

  async getBaseAssetIndex(): Promise<number> {
    if (this.legInfo) {
      const mintInfo = await this.convergence
        .protocol()
        .findRegisteredMintByAddress({
          address: this.convergence
            .rfqs()
            .pdas()
            .mintInfo({ mint: this.instrument.mint.address }),
        });
      if (mintInfo.mintType.__kind === 'AssetWithRisk')
        return mintInfo.mintType.baseAssetIndex.value;
    }
    throw Error('Instrument is used for base asset index');
  }

  async toLegData(): Promise<Leg> {
    if (this.legInfo) {
      return {
        instrumentProgram: this.instrument.getProgramId(),
        baseAssetIndex: { value: await this.getBaseAssetIndex() },
        instrumentData: this.instrument.serializeInstrumentData(),
        instrumentAmount: toBigNumber(this.legInfo.amount),
        instrumentDecimals: this.instrument.decimals,
        side: this.legInfo.side,
      };
    }
    throw Error('Instrument is used for leg');
  }

  toQuoteData() {
    if (this.legInfo) {
      throw Error('Instrument is used for quote');
    }
    return {
      instrumentProgram: this.instrument.getProgramId(),
      instrumentData: this.instrument.serializeInstrumentData(),
      instrumentDecimals: this.instrument.mint.decimals,
    };
  }

  getInstrumentDataSize(): number {
    return this.instrument.serializeInstrumentData().length;
  }

  async getLegDataSize(): Promise<number> {
    return this.serializeLegData(await this.toLegData()).length;
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

  getProgramAccount(): AccountMeta {
    return {
      pubkey: this.instrument.getProgramId(),
      isSigner: false,
      isWritable: false,
    };
  }

  getValidationAccounts() {
    return [this.getProgramAccount()].concat(
      this.instrument.getValidationAccounts()
    );
  }
}
