import { PublicKey } from '@solana/web3.js';
import { Side, Leg } from '@convergence-rfq/rfq';
import { OptionMarketWithKey } from '@mithraic-labs/psy-american';
import { OptionType } from '@mithraic-labs/tokenized-euros';
import {
  FixableBeetArgsStruct,
  u8,
  u64,
  bool,
  i64,
  bignum,
} from '@convergence-rfq/beet';
import { publicKey } from '@convergence-rfq/beet-solana';
import { Mint } from '../../tokenModule';
import { Instrument } from '../../instrumentModule/models/Instrument';
import { InstrumentClient } from '../../instrumentModule/InstrumentClient';
import { assert } from '@/utils';
import { Convergence } from '@/Convergence';
import { createSerializerFromFixableBeetArgsStruct } from '@/types';

type PsyoptionsAmericanInstrumentData = {
  optionType: OptionType;
  underlyingAmountPerContract: bignum;
  underlyingAmountPerContractDecimals: number;
  strikePrice: bignum;
  strikePriceDecimals: number;
  expiration: bignum;
  optionMint: PublicKey;
  metaKey: PublicKey;
};

export const psyoptionsAmericanInstrumentDataSerializer =
  createSerializerFromFixableBeetArgsStruct(
    new FixableBeetArgsStruct<PsyoptionsAmericanInstrumentData>(
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

const optionMarketWithKeySerializer = createSerializerFromFixableBeetArgsStruct(
  new FixableBeetArgsStruct<OptionMarketWithKey>(
    [
      ['optionMint', publicKey],
      ['writerTokenMint', publicKey],
      ['underlyingAssetMint', publicKey],
      ['quoteAssetMint', publicKey],
      ['underlyingAssetPool', publicKey],
      ['quoteAssetPool', publicKey],
      ['mintFeeAccount', publicKey],
      ['exerciseFeeAccount', publicKey],
      ['underlyingAmountPerContract', u64],
      ['quoteAmountPerContract', u64],
      ['expirationUnixTimestamp', i64],
      ['expired', bool],
      ['bumpSeed', u8],
      ['key', publicKey],
    ],
    'OptionMarketWithKey'
  )
);

export class PsyoptionsAmericanInstrument implements Instrument {
  readonly model = 'psyoptionsAmericanInstrument';
  readonly decimals = 0;

  constructor(
    readonly convergence: Convergence,
    readonly mint: Mint,
    readonly quoteMint: Mint,
    readonly optionType: OptionType,
    readonly optionMeta: OptionMarketWithKey,
    readonly optionMetaPubKey: PublicKey,
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
    quoteMint: Mint,
    optionType: OptionType,
    optionMeta: OptionMarketWithKey,
    optionMetaPubkey: PublicKey,
    amount: number,
    side: Side
  ): InstrumentClient {
    const instrument = new PsyoptionsAmericanInstrument(
      convergence,
      mint,
      quoteMint,
      optionType,
      optionMeta,
      optionMetaPubkey,
      {
        amount,
        side,
      }
    );

    return new InstrumentClient(convergence, instrument, {
      amount: amount * Math.pow(10, mint.decimals),
      side,
    });
  }

  static async fetchMeta(
    convergence: Convergence,
    metaKey: PublicKey
  ): Promise<OptionMarketWithKey> {
    const account = await convergence.rpc().getAccount(metaKey);
    assert(account.exists, 'Account not found');

    const [meta] = optionMarketWithKeySerializer.deserialize(
      Buffer.from(account.data),
      8
    );
    return meta;
  }

  static async createFromLeg(
    convergence: Convergence,
    leg: Leg
  ): Promise<PsyoptionsAmericanInstrument> {
    const { side, instrumentAmount, instrumentData } = leg;
    const [{ metaKey, optionType }] =
      psyoptionsAmericanInstrumentDataSerializer.deserialize(
        Buffer.from(instrumentData)
      );

    const account = await convergence.rpc().getAccount(metaKey);
    if (!account.exists) {
      throw new Error('Account not found');
    }
    const [optionMarketWithKey] = optionMarketWithKeySerializer.deserialize(
      Buffer.from(account.data),
      8
    );

    const mint = await convergence
      .tokens()
      .findMintByAddress({ address: optionMarketWithKey.underlyingAssetMint });
    const quoteMint = await convergence
      .tokens()
      .findMintByAddress({ address: optionMarketWithKey.quoteAssetMint });
    const amount =
      typeof instrumentAmount === 'number'
        ? instrumentAmount
        : instrumentAmount.toNumber();

    return new PsyoptionsAmericanInstrument(
      convergence,
      mint,
      quoteMint,
      optionType,
      optionMarketWithKey,
      metaKey,
      {
        amount,
        side,
      }
    );
  }

  getValidationAccounts() {
    const mintInfoPda = this.convergence
      .rfqs()
      .pdas()
      .mintInfo({ mint: this.mint.address });
    const quoteAssetMintPda = this.convergence
      .rfqs()
      .pdas()
      .mintInfo({ mint: this.optionMeta.quoteAssetMint });
    return [
      { pubkey: this.optionMetaPubKey, isSigner: false, isWritable: false },
      {
        pubkey: mintInfoPda,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: quoteAssetMintPda,
        isSigner: false,
        isWritable: false,
      },
    ];
  }

  static deserializeInstrumentData(
    buffer: Buffer
  ): PsyoptionsAmericanInstrumentData {
    const [instrumentData] =
      psyoptionsAmericanInstrumentDataSerializer.deserialize(buffer);
    return instrumentData;
  }

  serializeInstrumentData(): Buffer {
    const { optionMeta } = this;
    const callMint = this.optionMeta.optionMint.toBytes();
    const optionMarket = this.optionMeta.key.toBytes();
    const underlyingamountPerContract =
      optionMeta.underlyingAmountPerContract.toArrayLike(Buffer, 'le', 8);
    const underlyingAmountPerContractDecimals = this.mint.decimals;
    const expirationtime = optionMeta.expirationUnixTimestamp.toArrayLike(
      Buffer,
      'le',
      8
    );
    const strikeprice = optionMeta.quoteAmountPerContract.toArrayLike(
      Buffer,
      'le',
      8
    );
    const strikePriceDecimals = this.quoteMint.decimals;

    return Buffer.from(
      new Uint8Array([
        this.optionType == OptionType.CALL ? 0 : 1,
        ...underlyingamountPerContract,
        underlyingAmountPerContractDecimals,
        ...strikeprice,
        strikePriceDecimals,
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
  typeof value === 'object' && value.model === 'psyoptionsAmericanInstrument';

/** @group Model Helpers */
export function assertPsyoptionsAmericanInstrument(
  value: any
): asserts value is PsyoptionsAmericanInstrument {
  assert(
    isPsyoptionsAmericanInstrument(value),
    'Expected PsyoptionsAmericanInstrument model'
  );
}
