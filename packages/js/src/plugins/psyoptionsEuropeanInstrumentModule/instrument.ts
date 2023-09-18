import { PublicKey } from '@solana/web3.js';
import { Leg, BaseAssetIndex } from '@convergence-rfq/rfq';
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

import { Mint } from '../tokenModule';
import {
  CreateOptionInstrumentsResult,
  LegInstrument,
} from '../instrumentModule';
import { addDecimals, removeDecimals } from '../../utils/conversions';
import { assert } from '../../utils/assert';
import { Convergence } from '../../Convergence';
import { createSerializerFromFixableBeetArgsStruct } from '../../types';
import { LegSide, fromSolitaLegSide } from '../rfqModule/models/LegSide';
import {
  createEuropeanProgram,
  getPsyEuropeanMarketTxBuilder,
  getEuropeanOptionMeta,
} from './helpers';
import { InstructionUniquenessTracker } from '@/utils';

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
export class PsyoptionsEuropeanInstrument implements LegInstrument {
  static readonly decimals = 4;

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
    readonly side: LegSide,
    private optionMeta?: EuroMeta
  ) {}

  getBaseAssetIndex = () => this.baseAssetIndex;
  getAmount = () => this.amount;
  getDecimals = () => PsyoptionsEuropeanInstrument.decimals;
  getSide = () => this.side;
  async getPreparationsBeforeRfqCreation(
    ixTracker: InstructionUniquenessTracker
  ): Promise<CreateOptionInstrumentsResult> {
    const europeanProgram = await createEuropeanProgram(this.convergence);
    if (!this.optionMeta) {
      throw new Error('Option Meta is not defined');
    }
    const optionMarketTxBuilder = await getPsyEuropeanMarketTxBuilder(
      this.convergence,
      this.optionMeta.underlyingMint,
      this.underlyingAmountPerContractDecimals,
      this.optionMeta.stableMint,
      this.strikePriceDecimals,
      this.strikePrice,
      this.optionMeta.oracle,
      this.expiration,
      ixTracker,
      europeanProgram
    );

    return optionMarketTxBuilder;
  }

  static async create(
    convergence: Convergence,
    underlyingMint: Mint,
    stableMint: Mint,
    optionType: OptionType,
    amount: number,
    side: LegSide,
    strike: number,
    oracleAddress: PublicKey,
    expiresIn: number
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
    const europeanProgram = await createEuropeanProgram(convergence);
    const { euroMeta: meta, euroMetaKey: metaKey } =
      await getEuropeanOptionMeta(
        europeanProgram,
        underlyingMint,
        stableMint,
        expiresIn,
        1,
        strike,
        oracleAddress,
        0
      );
    return new PsyoptionsEuropeanInstrument(
      convergence,
      optionType,
      removeDecimals(meta.underlyingAmountPerContract, meta.underlyingDecimals),
      meta.underlyingDecimals,
      removeDecimals(meta.strikePrice, meta.priceDecimals),
      meta.priceDecimals,
      Number(meta.expiration),
      optionType == OptionType.CALL ? meta.callOptionMint : meta.putOptionMint,
      metaKey,
      mintInfo.mintType.baseAssetIndex,
      amount,
      side,
      meta
    );
  }

  async getOptionMeta() {
    if (this.optionMeta === undefined) {
      this.optionMeta = await PsyoptionsEuropeanInstrument.fetchMeta(
        this.convergence,
        this.optionMetaPubKey
      );
    }

    return this.optionMeta;
  }

  /** Helper method to get validation accounts for a Psyoptions European instrument. */
  async getValidationAccounts() {
    const optionMeta = await this.getOptionMeta();

    return [
      { pubkey: this.optionMetaPubKey, isSigner: false, isWritable: false },
      {
        pubkey: this.convergence
          .rfqs()
          .pdas()
          .mintInfo({ mint: optionMeta.underlyingMint }),
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

  serializeInstrumentData(): Buffer {
    const data: PsyoptionsEuropeanInstrumentData = {
      optionType: this.optionType,
      underlyingAmountPerContract: addDecimals(
        this.underlyingAmountPerContract,
        this.underlyingAmountPerContractDecimals
      ),
      underlyingAmountPerContractDecimals:
        this.underlyingAmountPerContractDecimals,
      strikePrice: addDecimals(this.strikePrice, this.strikePriceDecimals),
      strikePriceDecimals: this.strikePriceDecimals,
      expiration: this.expiration,
      optionMint: this.optionMint,
      metaKey: this.optionMetaPubKey,
    };
    const serializedData =
      psyoptionsEuropeanInstrumentDataSerializer.serialize(data);

    return serializedData;
  }

  getProgramId(): PublicKey {
    return this.convergence.programs().getPsyoptionsEuropeanInstrument()
      .address;
  }
}

export const psyoptionsEuropeanInstrumentParser = {
  parseFromLeg(
    convergence: Convergence,
    leg: Leg
  ): PsyoptionsEuropeanInstrument {
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
    ] = psyoptionsEuropeanInstrumentDataSerializer.deserialize(
      Buffer.from(instrumentData)
    );

    return new PsyoptionsEuropeanInstrument(
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
      removeDecimals(instrumentAmount, PsyoptionsEuropeanInstrument.decimals),
      fromSolitaLegSide(side)
    );
  },
};
