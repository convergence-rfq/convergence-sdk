import { PublicKey } from '@solana/web3.js';
import { Leg, BaseAssetIndex } from '@convergence-rfq/rfq';
import { OptionMarketWithKey } from '@mithraic-labs/psy-american';
import { OptionType } from '@mithraic-labs/tokenized-euros';
import { FixableBeetArgsStruct, u8, u64, bignum } from '@convergence-rfq/beet';
import { publicKey } from '@convergence-rfq/beet-solana';

import * as psyoptionsAmerican from '@mithraic-labs/psy-american';
import BN from 'bn.js';
import { Mint } from '../tokenModule';
import { LegInstrument } from '../instrumentModule';
import { addDecimals, removeDecimals } from '../../utils';
import { Convergence } from '../../Convergence';
import { createSerializerFromFixableBeetArgsStruct } from '../../types';
import { ResponseSide, fromSolitaSide } from '../rfqModule/models/ResponseSide';
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
    readonly optionType: OptionType,
    readonly underlyingAmountPerContract: number, // without decimals
    private readonly underlyingAmountPerContractDecimals: number,
    readonly strikePrice: number, // without decimals
    private readonly strikePriceDecimals: number,
    readonly expiration: number, // timestamp in seconds
    readonly optionMint: PublicKey,
    readonly optionMetaPubKey: PublicKey,
    readonly baseAssetIndex: BaseAssetIndex,
    readonly amount: number,
    readonly side: ResponseSide,
    private optionMeta?: OptionMarketWithKey
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
    side: ResponseSide
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
      optionType,
      removeDecimals(
        optionMeta.underlyingAmountPerContract,
        underlyingMint.decimals
      ),
      underlyingMint.decimals,
      removeDecimals(optionMeta.quoteAmountPerContract, quoteMint.decimals),
      quoteMint.decimals,
      Number(optionMeta.expirationUnixTimestamp),
      optionMeta.optionMint,
      optionMetaPubkey,
      mintInfo.mintType.baseAssetIndex,
      amount,
      side,
      optionMeta
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

  async getOptionMeta() {
    if (this.optionMeta === undefined) {
      this.optionMeta = await PsyoptionsAmericanInstrument.fetchMeta(
        this.convergence,
        this.optionMetaPubKey
      );
    }

    return this.optionMeta;
  }

  async getValidationAccounts() {
    const optionMeta = await this.getOptionMeta();

    const mintInfoPda = this.convergence
      .rfqs()
      .pdas()
      .mintInfo({ mint: optionMeta.underlyingAssetMint });
    const quoteAssetMintPda = this.convergence
      .rfqs()
      .pdas()
      .mintInfo({ mint: optionMeta.quoteAssetMint });
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
    const data: PsyoptionsAmericanInstrumentData = {
      optionType: this.optionType,
      underlyingAmountPerContract: addDecimals(
        this.underlyingAmountPerContract,
        this.underlyingAmountPerContractDecimals
      ),
      underlyingAmountPerContractDecimals:
        this.underlyingAmountPerContractDecimals,
      strikePrice: addDecimals(this.strikePrice, this.strikePriceDecimals),
      strikePriceDecimals: this.strikePriceDecimals,
      expiration: new BN(this.expiration),
      optionMint: this.optionMint,
      metaKey: this.optionMetaPubKey,
    };

    const serializedData =
      psyoptionsAmericanInstrumentDataSerializer.serialize(data);

    return serializedData;
  }

  getProgramId() {
    return this.convergence.programs().getPsyoptionsAmericanInstrument()
      .address;
  }
}

export const psyoptionsAmericanInstrumentParser = {
  parseFromLeg(
    convergence: Convergence,
    leg: Leg
  ): PsyoptionsAmericanInstrument {
    const { side, instrumentAmount, instrumentData, baseAssetIndex } = leg;
    const [
      {
        optionType,
        underlyingAmountPerContract,
        underlyingAmountPerContractDecimals,
        strikePrice,
        strikePriceDecimals,
        expiration,
        optionMint,
        metaKey,
      },
    ] = psyoptionsAmericanInstrumentDataSerializer.deserialize(
      Buffer.from(instrumentData)
    );

    return new PsyoptionsAmericanInstrument(
      convergence,
      optionType,
      removeDecimals(
        underlyingAmountPerContract,
        underlyingAmountPerContractDecimals
      ),
      underlyingAmountPerContractDecimals,
      removeDecimals(strikePrice, strikePriceDecimals),
      strikePriceDecimals,
      Number(expiration),
      optionMint,
      metaKey,
      baseAssetIndex,
      removeDecimals(instrumentAmount, PsyoptionsAmericanInstrument.decimals),
      fromSolitaSide(side)
    );
  },
};
