import { PublicKey } from '@solana/web3.js';
import { Side } from '@convergence-rfq/rfq';
import { OptionMarketWithKey } from '@mithraic-labs/psy-american';
import { OptionType } from '@mithraic-labs/tokenized-euros';
import { Mint } from '../../tokenModule';
import { Instrument } from '../../instrumentModule/models/Instrument';
import { InstrumentClient } from '../../instrumentModule/InstrumentClient';
import { assert } from '@/utils';
import { Convergence } from '@/Convergence';

/**
 * This model captures all the relevant information about a Psyoptions European
 * instrument on the Solana blockchain.
 *
 * @group Models
 */
export class PsyoptionsAmericanInstrument implements Instrument {
  readonly model = 'psyoptionsAmericanInstrument';
  readonly decimals = 0;

  constructor(
    readonly convergence: Convergence,
    readonly mint: Mint,
    readonly optionType: OptionType,
    readonly optionMeta: OptionMarketWithKey,
    readonly optionMetaPubKey: PublicKey,
    readonly legInfo?: {
      amount: number;
      side: Side;
    }
  ) {}

  static createForLeg(
    convergence: Convergence,
    mint: Mint,
    optionType: OptionType,
    optionMeta: OptionMarketWithKey,
    optionMetaPubkey: PublicKey,
    amount: number,
    side: Side
  ): InstrumentClient {
    const instrument = new PsyoptionsAmericanInstrument(
      convergence,
      mint,
      optionType,
      optionMeta,
      optionMetaPubkey,
      {
        amount,
        side,
      }
    );
    return new InstrumentClient(convergence, instrument, {
      amount,
      side,
    });
  }

  getValidationAccounts() {
    const mintInfoPda = this.convergence
      .rfqs()
      .pdas()
      .mintInfo({ mint: this.mint.address });
    return [
      { pubkey: this.optionMetaPubKey, isSigner: false, isWritable: false },
      {
        pubkey: mintInfoPda,
        isSigner: false,
        isWritable: false,
      },
    ];
  }

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
    return this.convergence.programs().getPsyoptionsAmericanInstrument()
      .address;
  }
}

/** @group Model Helpers */
export const isPsyoptionsAmericanInstrument = (
  value: any
): value is PsyoptionsAmericanInstrument =>
  typeof value === 'object' && value.model === 'psyoptionsAmeicanInstrument';

/** @group Model Helpers */
export function assertPsyoptionsAmericanInstrument(
  value: any
): asserts value is PsyoptionsAmericanInstrument {
  assert(
    isPsyoptionsAmericanInstrument(value),
    `Expected PsyoptionsAmericanInstrument model`
  );
}
