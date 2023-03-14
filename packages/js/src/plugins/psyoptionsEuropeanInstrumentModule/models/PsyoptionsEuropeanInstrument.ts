import { PublicKey } from '@solana/web3.js';
import { Side, Leg } from '@convergence-rfq/rfq';
import { EuroMeta } from '@convergence-rfq/psyoptions-european-instrument';
import { OptionType } from '@mithraic-labs/tokenized-euros';
import {
  FixableBeetArgsStruct,
  u8,
  u64,
  i64,
  bignum,
} from '@convergence-rfq/beet';
import { publicKey } from '@convergence-rfq/beet-solana';
import { Mint } from '../../tokenModule';
import { Instrument } from '../../instrumentModule/models/Instrument';
import { InstrumentClient } from '../../instrumentModule/InstrumentClient';
import { assert } from '@/utils';
import { Convergence } from '@/Convergence';
import {
  createSerializerFromFixableBeetArgsStruct,
  toBigNumber,
} from '@/types';

type PsyoptionsEuropeanInstrumentData = {
  optionType: OptionType;
  underlyingAmountPerContract: bignum;
  underlyingAmountPerContractDecimals: number;
  strikePrice: bignum;
  strikePriceDecimals: number;
  expiration: bignum;
  optionMint: PublicKey;
  metaKey: PublicKey;
};

export const psyoptionsEuropeanInstrumentDataSerializer =
  createSerializerFromFixableBeetArgsStruct(
    new FixableBeetArgsStruct<PsyoptionsEuropeanInstrumentData>(
      [
        ['optionType', u8],
        ['underlyingAmountPerContract', u64],
        ['underlyingAmountPerContractDecimals', u8],
        ['strikePrice', u64],
        ['strikePriceDecimals', u8],
        ['expiration', u64],
        ['optionMint', publicKey],
        ['metaKey', publicKey],
      ],
      'InstrumentData'
    )
  );

const euroMetaSerializer = createSerializerFromFixableBeetArgsStruct(
  new FixableBeetArgsStruct<EuroMeta>(
    [
      ['underlyingMint', publicKey],
      ['underlyingDecimals', u8],
      ['underlyingAmountPerContract', u64],
      ['stableMint', publicKey],
      ['stableDecimals', u8],
      ['stablePool', publicKey],
      ['oracle', publicKey],
      ['strikePrice', u64],
      ['priceDecimals', u8],
      ['callOptionMint', publicKey],
      ['callWriterMint', publicKey],
      ['putOptionMint', publicKey],
      ['putWriterMint', publicKey],
      ['underlyingPool', publicKey],
      ['expiration', i64],
      ['bumpSeed', u8],
      ['expirationData', publicKey],
      ['oracleProviderId', u8],
    ],
    'EuroMeta'
  )
);

/**
 * This model captures all the relevant information about a Psyoptions European
 * instrument on the Solana blockchain.
 *
 * @group Models
 */
export class PsyoptionsEuropeanInstrument implements Instrument {
  readonly model = 'psyoptionsEuropeanInstrument';
  readonly decimals = 4;

  constructor(
    readonly convergence: Convergence,
    readonly mint: Mint,
    readonly optionType: OptionType,
    readonly meta: EuroMeta,
    readonly metaKey: PublicKey,
    readonly legInfo?: {
      amount: number;
      side: Side;
    }
  ) {
    if (legInfo && this.legInfo) {
      this.legInfo.amount = legInfo.amount * Math.pow(10, this.decimals);
    }
  }

  static createForLeg(
    convergence: Convergence,
    mint: Mint,
    optionType: OptionType,
    meta: EuroMeta,
    metaKey: PublicKey,
    amount: number,
    side: Side
  ): InstrumentClient {
    const instrument = new PsyoptionsEuropeanInstrument(
      convergence,
      mint,
      optionType,
      meta,
      metaKey,
      {
        amount,
        side,
      }
    );

    return new InstrumentClient(convergence, instrument, {
      amount: amount * Math.pow(10, instrument.decimals),
      side,
    });
  }

  /** Helper method to get validation accounts for a Psyoptions European instrument. */
  getValidationAccounts() {
    return [
      { pubkey: this.metaKey, isSigner: false, isWritable: false },
      {
        pubkey: this.convergence
          .rfqs()
          .pdas()
          .mintInfo({ mint: this.mint.address }),
        isSigner: false,
        isWritable: false,
      },
    ];
  }
  static deserializeInstrumentData(
    buffer: Buffer
  ): PsyoptionsEuropeanInstrumentData {
    const [instrumentData] =
      psyoptionsEuropeanInstrumentDataSerializer.deserialize(buffer);
    return instrumentData;
  }

  static async fetchMeta(
    convergence: Convergence,
    metaKey: PublicKey
  ): Promise<EuroMeta> {
    const account = await convergence.rpc().getAccount(metaKey);
    assert(account.exists, 'Account not found');
    const [meta] = euroMetaSerializer.deserialize(Buffer.from(account.data), 8);
    return meta;
  }

  static async createFromLeg(
    convergence: Convergence,
    leg: Leg
  ): Promise<PsyoptionsEuropeanInstrument> {
    const { side, instrumentAmount, instrumentData } = leg;
    const [{ metaKey, optionType }] =
      psyoptionsEuropeanInstrumentDataSerializer.deserialize(
        Buffer.from(instrumentData)
      );

    const euroMeta = await this.fetchMeta(convergence, metaKey);

    const mint = await convergence
      .tokens()
      .findMintByAddress({ address: euroMeta.underlyingMint });
    const amount =
      typeof instrumentAmount === 'number'
        ? instrumentAmount
        : instrumentAmount.toNumber();

    return new PsyoptionsEuropeanInstrument(
      convergence,
      mint,
      optionType,
      euroMeta,
      metaKey,
      {
        amount,
        side,
      }
    );
  }

  serializeInstrumentData(): Buffer {
    return Buffer.from(
      new Uint8Array([
        this.optionType == OptionType.CALL ? 0 : 1,
        ...toBigNumber(this.meta.underlyingAmountPerContract).toArrayLike(
          Buffer,
          'le',
          8
        ),
        this.meta.underlyingDecimals,
        ...toBigNumber(this.meta.strikePrice).toArrayLike(Buffer, 'le', 8),
        this.meta.priceDecimals,
        ...toBigNumber(this.meta.expiration).toArrayLike(Buffer, 'le', 8),
        ...(this.optionType == OptionType.CALL
          ? this.meta.callOptionMint.toBytes()
          : this.meta.putOptionMint.toBytes()),
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
