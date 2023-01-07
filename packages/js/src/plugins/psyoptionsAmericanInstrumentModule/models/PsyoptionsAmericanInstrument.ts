import { PublicKey } from '@solana/web3.js';
import { Side } from '@convergence-rfq/rfq';
import { OptionType } from '@mithraic-labs/tokenized-euros';
import { Mint } from '../../tokenModule';
import { Instrument } from '../../instrumentModule/models/Instrument';
import { InstrumentClient } from '../../instrumentModule/InstrumentClient';
import { assert } from '@/utils';
import { Convergence } from '@/Convergence';
import { toBigNumber } from '@/types';
import { OptionMarket, OptionMarketWithKey } from '@mithraic-labs/psy-american';

/**
 * This model captures all the relevant information about a Psyoptions European
 * instrument on the Solana blockchain.
 *
 * @group Models
 */
export class PsyoptionsAmericanInstrument implements Instrument {
  readonly model = 'psyoptionsAmericanInstrument';

  constructor(
    readonly convergence: Convergence,
    readonly mint: Mint,
    readonly decimals: number,
    readonly optionType: OptionType,
    readonly optionMeta: OptionMarketWithKey,
    readonly optionMetaPubKey: PublicKey,
    readonly legInfo?: {
      amount: number;
      side: Side;
      baseAssetIndex: number;
    }
  ) {}

  static createForLeg(
    convergence: Convergence,
    mint: Mint,
    decimals: number,
    optionType: OptionType,
    optionMeta: OptionMarketWithKey,
    optionMetaPubkey: PublicKey,
    amount: number,
    side: Side
  ): InstrumentClient {
    const baseAssetIndex = 0;
    const instrument = new PsyoptionsAmericanInstrument(
      convergence,
      mint,
      decimals,
      optionType,
      optionMeta,
      optionMetaPubkey,
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
    const [mintInfoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('mint_info'), this.mint.address.toBuffer()],
      this.convergence.programs().getRfq().address
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

  // serializeInstrumentData(): Buffer {
  //   return Buffer.from(
  //     new Uint8Array([
  //       this.optionType == OptionType.CALL ? 0 : 1,
  //       ...toBigNumber(this.meta.underlyingAmountPerContract).toBuffer('le', 8),
  //       ...toBigNumber(this.meta.strikePrice).toBuffer('le', 8),
  //       ...toBigNumber(this.meta.expiration).toBuffer('le', 8),
  //       ...(this.optionType == OptionType.CALL
  //         ? this.meta.callOptionMint.toBytes()
  //         : this.meta.putOptionMint.toBytes()),
  //       ...this.metaKey.toBytes(),
  //     ])
  //   );
  // }

  serializeInstrumentData(): Buffer {
    const { optionMeta } = this;
    const callMint = this.optionMeta.optionMint.toBytes();
    const optionMarket = this.optionMeta.key.toBytes();

    const underlyingamountPerContract =
      optionMeta.underlyingAmountPerContract.toBuffer('le', 8);
    const expirationtime = optionMeta.expirationUnixTimestamp.toBuffer('le', 8);
    const strikeprice = optionMeta.quoteAmountPerContract.toBuffer('le', 8);
    return Buffer.from(
      new Uint8Array([
        this.optionType == OptionType.CALL ? 0 : 1,
        ...underlyingamountPerContract,
        ...strikeprice,
        ...expirationtime,
        ...callMint,
        ...optionMarket,
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
): value is PsyoptionsAmericanInstrument =>
  typeof value === 'object' && value.model === 'psyoptionsEuropeanInstrument';

/** @group Model Helpers */
export function assertPsyoptionsEuropeanInstrument(
  value: any
): asserts value is PsyoptionsAmericanInstrument {
  assert(
    isPsyoptionsEuropeanInstrument(value),
    `Expected PsyoptionsEuropeanInstrument model`
  );
}
