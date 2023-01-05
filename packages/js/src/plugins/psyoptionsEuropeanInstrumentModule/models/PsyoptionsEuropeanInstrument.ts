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
    public mint: Mint,
    public optionType: OptionType,
    public meta: EuroMeta,
    public metaKey: PublicKey,
    public underlyingMint: Mint,
    public stableMint: Mint,
    public callMint: Mint,
    public callWriterMint: Mint,
    public putMint: Mint,
    public putWriterMint: Mint,
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
    underlyingMint: Mint,
    stableMint: Mint,
    callMint: Mint,
    callWriterMint: Mint,
    putMint: Mint,
    putWriterMint: Mint,
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
      underlyingMint,
      stableMint,
      callMint,
      callWriterMint,
      putMint,
      putWriterMint,
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
    const rfqProgram = this.convergence.programs().getRfq();
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
    const { strikePrice, expiration, underlyingAmountPerContract } = this.meta;
    return Buffer.from(
      new Uint8Array([
        this.optionType == OptionType.CALL ? 0 : 1,
        ...toBigNumber(underlyingAmountPerContract).toBuffer('le', 8),
        ...toBigNumber(strikePrice).toBuffer('le', 8),
        ...toBigNumber(expiration).toBuffer('le', 8),
        ...this.mint.address.toBytes(),
        ...this.metaKey.toBytes(),
      ])
    );
  }

  getProgramId(): PublicKey {
    return this.convergence.programs().getPsyoptionsEuropeanInstrument()
      .address;
  }

  //calculateLegSize(instrument: PsyoptionsEuropeanInstrument): number {
  //  return instrument.data.length;
  //}

  //createInstrument(
  //  mint: PublicKey,
  //  decimals: number,
  //  side: Side,
  //  amount: number
  //): PsyoptionsEuropeanInstrument {
  //  return {
  //    model: 'psyoptionsEuropeanInstrument',
  //    mint,
  //    side,
  //    amount: toBigNumber(amount),
  //    decimals,
  //    data: mint.toBuffer(),
  //  };
  //}
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
