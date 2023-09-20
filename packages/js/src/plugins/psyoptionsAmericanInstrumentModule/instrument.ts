import {
  AccountMeta,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import { Leg, BaseAssetIndex } from '@convergence-rfq/rfq';
import { OptionMarketWithKey } from '@mithraic-labs/psy-american';
import { OptionType } from '@mithraic-labs/tokenized-euros';
import { FixableBeetArgsStruct, u8, u64, bignum } from '@convergence-rfq/beet';
import { publicKey } from '@convergence-rfq/beet-solana';
import * as anchor from '@project-serum/anchor';
import * as psyoptionsAmerican from '@mithraic-labs/psy-american';
import BN from 'bn.js';
import { Mint } from '../tokenModule';
import {
  CreateOptionInstrumentsResult,
  LegInstrument,
} from '../instrumentModule';
import { addDecimals, removeDecimals } from '../../utils/conversions';
import { Convergence } from '../../Convergence';
import { createSerializerFromFixableBeetArgsStruct } from '../../types';
import { LegSide, fromSolitaLegSide } from '../rfqModule/models/LegSide';
import { CvgWallet, NoopWallet } from '../../utils/Wallets';
import {
  GetOrCreateATAtxBuilderReturnType,
  getOrCreateATAtxBuilder,
} from '@/utils';

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
    readonly side: LegSide,
    readonly underlyingAssetMint?: PublicKey,
    readonly stableAssetMint?: PublicKey
  ) {}

  getBaseAssetIndex = () => this.baseAssetIndex;
  getAmount = () => this.amount;
  getDecimals = () => PsyoptionsAmericanInstrument.decimals;
  getSide = () => this.side;
  async getPreparationsBeforeRfqCreation(): Promise<CreateOptionInstrumentsResult> {
    if (!this.underlyingAssetMint) {
      throw new Error('Missing underlying asset mint');
    }
    if (!this.stableAssetMint) {
      throw new Error('Missing stable asset mint');
    }

    const optionMarketIxs = await getPsyAmericanMarketIxs(
      this.convergence,
      this.underlyingAssetMint,
      this.underlyingAmountPerContractDecimals,
      this.underlyingAmountPerContract,
      this.stableAssetMint,
      this.strikePriceDecimals,
      this.strikePrice,
      this.expiration
    );
    return optionMarketIxs;
  }
  getBaseAssetAccount(): AccountMeta {
    const baseAsset = this.convergence
      .protocol()
      .pdas()
      .baseAsset({ index: this.baseAssetIndex.value });

    const baseAssetAccount: AccountMeta = {
      pubkey: baseAsset,
      isSigner: false,
      isWritable: false,
    };

    return baseAssetAccount;
  }
  getBaseAssetMint(): PublicKey {
    if (!this.underlyingAssetMint) {
      throw new Error('Missing underlying asset mint');
    }
    return this.underlyingAssetMint;
  }

  async getOracleAccount(): Promise<AccountMeta> {
    const baseAsset = this.convergence
      .protocol()
      .pdas()
      .baseAsset({ index: this.baseAssetIndex.value });

    const baseAssetModel = await this.convergence
      .protocol()
      .findBaseAssetByAddress({ address: baseAsset });

    if (!baseAssetModel.priceOracle.address) {
      throw Error('Base asset does not have a price oracle!');
    }
    const oracleAccount = {
      pubkey: baseAssetModel.priceOracle.address,
      isSigner: false,
      isWritable: false,
    };
    return oracleAccount;
  }

  static async create(
    convergence: Convergence,
    underlyingMint: Mint,
    stableMint: Mint,
    optionType: OptionType,
    amount: number,
    side: LegSide,
    underlyingAmountPerContract: number,
    strike: number,
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

    const expirationUnixTimestamp = Date.now() / 1_000 + expiresIn;

    const cvgWallet = new CvgWallet(convergence);
    const americanProgram = await createAmericanProgram(convergence, cvgWallet);
    const { optionMint, metaKey } = await getAmericanOptionkeys(
      americanProgram,
      underlyingMint,
      stableMint,
      expiresIn,
      strike,
      underlyingAmountPerContract
    );

    return new PsyoptionsAmericanInstrument(
      convergence,
      optionType,
      underlyingAmountPerContract,
      underlyingMint.decimals,
      strike,
      stableMint.decimals,
      expirationUnixTimestamp,
      optionMint,
      metaKey,
      mintInfo.mintType.baseAssetIndex,
      amount,
      side,
      underlyingMint.address,
      stableMint.address
    );
  }

  static async fetchMeta(
    convergence: Convergence,
    metaKey: PublicKey
  ): Promise<OptionMarketWithKey> {
    const cvgWallet = new CvgWallet(convergence);
    const americanProgram = createAmericanProgram(convergence, cvgWallet);
    const optionMarket = (await psyoptionsAmerican.getOptionByKey(
      americanProgram,
      metaKey
    )) as OptionMarketWithKey;

    return optionMarket;
  }

  async getOptionMeta() {
    const optionMeta = await PsyoptionsAmericanInstrument.fetchMeta(
      this.convergence,
      this.optionMetaPubKey
    );

    return optionMeta;
  }

  getValidationAccounts() {
    if (!this.underlyingAssetMint) {
      throw new Error('Missing underlying asset mint');
    }
    if (!this.stableAssetMint) {
      throw new Error('Missing stable asset mint');
    }
    const mintInfoPda = this.convergence
      .rfqs()
      .pdas()
      .mintInfo({ mint: this.underlyingAssetMint });
    const quoteAssetMintPda = this.convergence
      .rfqs()
      .pdas()
      .mintInfo({ mint: this.stableAssetMint });
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
      fromSolitaLegSide(side)
    );
  },
};

export const createAmericanProgram = (
  convergence: Convergence,
  wallet?: CvgWallet
): any => {
  const provider = new anchor.AnchorProvider(
    convergence.connection,
    wallet ?? new NoopWallet(Keypair.generate()),
    {}
  );

  const americanProgram = psyoptionsAmerican.createProgram(
    new PublicKey('R2y9ip6mxmWUj4pt54jP2hz2dgvMozy9VTSwMWE7evs'),
    provider
  );

  return americanProgram;
};

export const getPsyAmericanMarketIxs = async (
  cvg: Convergence,
  underlyingMint: PublicKey,
  underlyingMintDecimals: number,
  underlyingAmountPerContract: number,
  stableMint: PublicKey,
  stableMintDecimals: number,
  strike: number,
  expiresIn: number
): Promise<CreateOptionInstrumentsResult> => {
  const cvgWallet = new CvgWallet(cvg);
  const americanProgram = createAmericanProgram(cvg, cvgWallet);

  const optionMarketIxs: TransactionInstruction[] = [];

  const expirationUnixTimestamp = new BN(expiresIn);
  const quoteAmountPerContractBN = new BN(
    addDecimals(strike, stableMintDecimals)
  );
  const underlyingAmountPerContractBN = new BN(
    addDecimals(underlyingAmountPerContract, underlyingMintDecimals)
  );

  let optionMarket: psyoptionsAmerican.OptionMarketWithKey | null = null;
  const [optionMarketKey] = await psyoptionsAmerican.deriveOptionKeyFromParams({
    expirationUnixTimestamp,
    programId: americanProgram.programId,
    quoteAmountPerContract: quoteAmountPerContractBN,
    quoteMint: stableMint,
    underlyingAmountPerContract: underlyingAmountPerContractBN,
    underlyingMint,
  });
  optionMarket = await psyoptionsAmerican.getOptionByKey(
    americanProgram,
    optionMarketKey
  );

  // If there is no existing market, derive the optionMarket from inputs
  if (!optionMarket) {
    const { optionMarketIx, mintFeeAccount, exerciseFeeAccount } =
      await getPsyAmericanOptionMarketAccounts(
        cvg,
        americanProgram,
        expirationUnixTimestamp,
        quoteAmountPerContractBN,
        stableMint,
        underlyingAmountPerContractBN,
        underlyingMint
      );
    if (mintFeeAccount.txBuilder) {
      optionMarketIxs.push(...mintFeeAccount.txBuilder.getInstructions());
    }

    if (exerciseFeeAccount.txBuilder) {
      optionMarketIxs.push(...exerciseFeeAccount.txBuilder.getInstructions());
    }

    optionMarketIxs.push(optionMarketIx.tx);
  }

  return optionMarketIxs;
};

export type GetAmericanOptionMetaResult = {
  optionMint: PublicKey;
  metaKey: PublicKey;
};
export const getAmericanOptionkeys = async (
  americanProgram: any,
  underlyingMint: Mint,
  stableMint: Mint,
  expiresIn: number,
  strike: number,
  underlyingAmountPerContract: number
): Promise<GetAmericanOptionMetaResult> => {
  const expirationUnixTimestamp = new BN(Date.now() / 1_000 + expiresIn);
  const quoteAmountPerContractBN = new BN(
    addDecimals(strike, stableMint.decimals)
  );
  const underlyingAmountPerContractBN = new BN(
    addDecimals(underlyingAmountPerContract, underlyingMint.decimals)
  );

  const [metaKey] = await psyoptionsAmerican.deriveOptionKeyFromParams({
    expirationUnixTimestamp,
    programId: americanProgram.programId,
    quoteAmountPerContract: quoteAmountPerContractBN,
    quoteMint: stableMint.address,
    underlyingAmountPerContract: underlyingAmountPerContractBN,
    underlyingMint: underlyingMint.address,
  });

  const [optionMint] = PublicKey.findProgramAddressSync(
    [metaKey.toBuffer(), Buffer.from('optionToken')],
    americanProgram.programId
  );

  return { optionMint, metaKey };
};

export type GetPsyAmericanOptionMarketAccounts = {
  optionMarketIx: {
    optionMarketKey: PublicKey;
    optionMintKey: PublicKey;
    quoteAssetPoolKey: PublicKey;
    tx: TransactionInstruction;
    underlyingAssetPoolKey: PublicKey;
    writerMintKey: PublicKey;
  };
  mintFeeAccount: GetOrCreateATAtxBuilderReturnType;
  exerciseFeeAccount: GetOrCreateATAtxBuilderReturnType;
};

const getPsyAmericanOptionMarketAccounts = async (
  cvg: Convergence,
  americanProgram: any,
  expirationUnixTimestamp: BN,
  quoteAmountPerContract: BN,
  stableMint: PublicKey,
  underlyingAmountPerContract: BN,
  underlyingMint: PublicKey
): Promise<GetPsyAmericanOptionMarketAccounts> => {
  const optionMarketIx =
    await psyoptionsAmerican.instructions.initializeOptionInstruction(
      americanProgram,
      {
        /** The option market expiration timestamp in seconds */
        expirationUnixTimestamp,
        quoteAmountPerContract,
        quoteMint: stableMint,
        underlyingAmountPerContract,
        underlyingMint,
      }
    );
  const feeOwner = psyoptionsAmerican.FEE_OWNER_KEY;
  const mintFeeAccount = await getOrCreateATAtxBuilder(
    cvg,
    underlyingMint,
    feeOwner
  );

  const exerciseFeeAccount = await getOrCreateATAtxBuilder(
    cvg,
    stableMint,
    feeOwner
  );

  return {
    optionMarketIx,
    mintFeeAccount,
    exerciseFeeAccount,
  };
};
