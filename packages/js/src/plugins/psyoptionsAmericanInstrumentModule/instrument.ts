import { PublicKey } from '@solana/web3.js';
import { Side, Leg, BaseAssetIndex } from '@convergence-rfq/rfq';
import { OptionMarketWithKey } from '@mithraic-labs/psy-american';
import { OptionType } from '@mithraic-labs/tokenized-euros';
import { FixableBeetArgsStruct, u8, u64, bignum } from '@convergence-rfq/beet';
import { publicKey } from '@convergence-rfq/beet-solana';

import * as psyoptionsAmerican from '@mithraic-labs/psy-american';
import { Mint } from '../tokenModule';
import { LegInstrument } from '../instrumentModule';
import { removeDecimals } from '../../utils';
import { Convergence } from '../../Convergence';
import { createSerializerFromFixableBeetArgsStruct } from '../../types';
import { createAmericanProgram } from './helpers';

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

export class PsyoptionsAmericanInstrument implements LegInstrument {
  static readonly decimals = 0;

  constructor(
    readonly convergence: Convergence,
    readonly underlyingMintAddress: PublicKey,
    readonly underlyingMintDecimals: number,
    readonly baseAssetIndex: BaseAssetIndex,
    readonly quoteMint: Mint,
    readonly optionType: OptionType,
    readonly optionMeta: OptionMarketWithKey,
    readonly optionMetaPubKey: PublicKey,
    readonly amount: number,
    readonly side: Side
  ) {}

  getBaseAssetIndex = () => this.baseAssetIndex;
  getAmount = () => this.amount;
  getDecimals = () => PsyoptionsAmericanInstrument.decimals;
  getSide = () => this.side;

  static async create(
    convergence: Convergence,
    underlyingMint: Mint,
    quoteMint: Mint,
    optionType: OptionType,
    optionMeta: OptionMarketWithKey,
    optionMetaPubkey: PublicKey,
    amount: number,
    side: Side
  ) {
    const mintInfoAddress = convergence
      .rfqs()
      .pdas()
      .mintInfo({ mint: underlyingMint.address });
    const mintInfo = await convergence
      .protocol()
      .findRegisteredMintByAddress({ address: mintInfoAddress });

    if (mintInfo.mintType.__kind === 'Stablecoin') {
      throw Error('Stablecoin mint cannot be used in a leg!');
    }

    return new PsyoptionsAmericanInstrument(
      convergence,
      underlyingMint.address,
      underlyingMint.decimals,
      mintInfo.mintType.baseAssetIndex,
      quoteMint,
      optionType,
      optionMeta,
      optionMetaPubkey,
      amount,
      side
    );
  }

  static async fetchMeta(
    convergence: Convergence,
    metaKey: PublicKey
  ): Promise<OptionMarketWithKey> {
    const americanProgram = createAmericanProgram(convergence);
    const optionMarket = (await psyoptionsAmerican.getOptionByKey(
      americanProgram,
      metaKey
    )) as OptionMarketWithKey;

    return optionMarket;
  }

  getValidationAccounts() {
    const mintInfoPda = this.convergence
      .rfqs()
      .pdas()
      .mintInfo({ mint: this.underlyingMintAddress });
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
    const underlyingAmountPerContractDecimals = this.underlyingMintDecimals;
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

  getProgramId() {
    return this.convergence.programs().getPsyoptionsAmericanInstrument()
      .address;
  }
}

export const psyoptionsAmericanInstrumentParser = {
  async parseFromLeg(
    convergence: Convergence,
    leg: Leg
  ): Promise<PsyoptionsAmericanInstrument> {
    const { side, instrumentAmount, instrumentData, baseAssetIndex } = leg;
    const [{ metaKey, optionType, underlyingAmountPerContractDecimals }] =
      psyoptionsAmericanInstrumentDataSerializer.deserialize(
        Buffer.from(instrumentData)
      );

    const optionMarketWithKey = await PsyoptionsAmericanInstrument.fetchMeta(
      convergence,
      metaKey
    );

    const quoteMint = await convergence
      .tokens()
      .findMintByAddress({ address: optionMarketWithKey.quoteAssetMint });

    return new PsyoptionsAmericanInstrument(
      convergence,
      optionMarketWithKey.underlyingAssetMint,
      underlyingAmountPerContractDecimals,
      baseAssetIndex,
      quoteMint,
      optionType,
      optionMarketWithKey,
      metaKey,
      removeDecimals(instrumentAmount, PsyoptionsAmericanInstrument.decimals),
      side
    );
  },
};
