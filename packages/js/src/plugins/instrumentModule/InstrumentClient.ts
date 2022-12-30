import { Leg, Side } from '@convergence-rfq/rfq';
import { AccountMeta } from '@solana/web3.js';
import { PsyoptionsEuropeanInstrument } from '../psyoptionsEuropeanInstrumentModule';
import { SpotInstrument } from '../spotInstrumentModule';
import type { Convergence } from '@/Convergence';
import { toBigNumber, BigNumber } from '@/types';

/**
 * This is a client for the instrumentModule.
 *
 * It enables us to manage the spot instrument.
 *
 * You may access this client via the `instrument()` method of your `Convergence` instance.
 *
 * ```ts
 * const instrument = new SpotInstrument({ ... });
 * const instrumentClient = convergence.instrument(instrument);
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
    protected instrument: PsyoptionsEuropeanInstrument | SpotInstrument,
    protected legInfo: {
      amount: BigNumber;
      side: Side;
      baseAssetIndex: number;
    } | null = null
  ) {
    this.convergence = convergence;
    this.instrument = instrument;
    this.legInfo = legInfo;
  }

  getBaseAssetIndex(): number {
    if (this.legInfo === null) {
      throw Error('Instrument is used for base asset index');
    }

    return this.legInfo.baseAssetIndex;
  }

  toLegData(): Leg {
    if (this.legInfo === null || this.instrument.decimals === null) {
      throw Error('Instrument is used for quote');
    }

    return {
      instrumentProgram: this.instrument.getProgramId(),
      baseAssetIndex: { value: this.legInfo.baseAssetIndex },
      instrumentData: this.instrument.serializeInstrumentData(),
      instrumentAmount: toBigNumber(this.legInfo.amount),
      instrumentDecimals: this.instrument.decimals,
      side: this.legInfo.side,
    };
  }

  toQuoteData() {
    if (this.legInfo !== null) {
      throw Error('Instrument is used for leg');
    }

    return {
      instrumentProgram: this.instrument.getProgramId(),
      instrumentData: this.instrument.serializeInstrumentData(),
      instrumentDecimals: this.instrument.decimals,
    };
  }

  getInstrumendDataSize(): number {
    return this.instrument.serializeInstrumentData().length;
  }

  private getProgramAccount(): AccountMeta {
    return {
      pubkey: this.instrument.getProgramId(),
      isSigner: false,
      isWritable: false,
    };
  }

  async getValidationAccounts() {
    return [this.getProgramAccount()].concat(
      await this.instrument.getValidationAccounts()
    );
  }
}
