import { PublicKey } from '@solana/web3.js';
import { Side } from '@convergence-rfq/rfq';
import { EuroMeta } from '@convergence-rfq/psyoptions-european-instrument';
import { OptionType } from '@mithraic-labs/tokenized-euros';
import { Mint } from '../../tokenModule';
import { Instrument } from '../../instrumentModule/models/Instrument';
import { InstrumentClient } from '../../instrumentModule/InstrumentClient';
import { assert } from '@/utils';
import { Convergence } from '@/Convergence';
import { toBigNumber } from '@/types';

/**
 * This model captures all the relevant information about a Psyoptions European
 * instrument on the Solana blockchain.
 *
 * @group Models
 */
export class PsyoptionsEuropeanInstrument implements Instrument {
  readonly model = 'psyoptionsEuropeanInstrument';

  constructor(
    readonly convergence: Convergence,
    readonly mint: Mint,
    readonly optionType: OptionType,
    readonly meta: EuroMeta,
    readonly metaKey: PublicKey,
    readonly legInfo?: {
      amount: number;
      side: Side;
      baseAssetIndex: number;
    }
  ) {}

  static createForLeg(
    convergence: Convergence,
    mint: Mint,
    optionType: OptionType,
    meta: EuroMeta,
    metaKey: PublicKey,
    amount: number,
    side: Side
  ): InstrumentClient {
    const baseAssetIndex = 0;
    const instrument = new PsyoptionsEuropeanInstrument(
      convergence,
      mint,
      optionType,
      meta,
      metaKey,
      {
        amount,
        side,
        baseAssetIndex,
      }
    );
    return new InstrumentClient(convergence, instrument, {
      amount,
      side,
      baseAssetIndex,
    });
  }

  getValidationAccounts() {
    const programs = this.convergence.programs().all();
    const rfqProgram = this.convergence.programs().getRfq(programs);
    const [mintInfoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('mint_info'), this.mint.address.toBuffer()],
      rfqProgram.address
    );
    return [
      { pubkey: this.metaKey, isSigner: false, isWritable: false },
      {
        pubkey: mintInfoPda,
        isSigner: false,
        isWritable: false,
      },
    ];
  }

  serializeInstrumentData(): Buffer {
    const optionMint =
      this.optionType == OptionType.CALL
        ? this.meta.callOptionMint.toBytes()
        : this.meta.putOptionMint.toBytes();

    return Buffer.from(
      new Uint8Array([
        this.optionType == OptionType.CALL ? 0 : 1,
        ...toBigNumber(this.meta.underlyingAmountPerContract).toBuffer('le', 8),
        ...toBigNumber(this.meta.strikePrice).toBuffer('le', 8),
        ...toBigNumber(this.meta.expiration).toBuffer('le', 8),
        ...optionMint,
        ...this.metaKey.toBytes(),
      ])
    );
  }

  getProgramId(): PublicKey {
    return this.convergence.programs().getPsyoptionsEuropeanInstrument()
      .address;
  }
}

/** @group Model Helpers */
export const isPsyoptionsEuropeanInstrument = (
  value: any
): value is PsyoptionsEuropeanInstrument =>
  typeof value === 'object' && value.model === 'psyoptionsEuropeanInstrument';

/** @group Model Helpers */
export function assertPsyoptionsEuropeanInstrument(
  value: any
): asserts value is PsyoptionsEuropeanInstrument {
  assert(
    isPsyoptionsEuropeanInstrument(value),
    `Expected PsyoptionsEuropeanInstrument model`
  );
}
