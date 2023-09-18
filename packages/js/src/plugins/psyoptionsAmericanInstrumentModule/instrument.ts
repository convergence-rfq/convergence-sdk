import { Keypair, PublicKey } from '@solana/web3.js';
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
import { InstructionUniquenessTracker } from '@/utils/classes';
import { TransactionBuilder, getOrCreateATAtxBuilder } from '@/utils';

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
    private optionMeta?: OptionMarketWithKey
  ) {}

  getBaseAssetIndex = () => this.baseAssetIndex;
  getAmount = () => this.amount;
  getDecimals = () => PsyoptionsAmericanInstrument.decimals;
  getSide = () => this.side;
  async getPreparationsBeforeRfqCreation(
    ixTracker: InstructionUniquenessTracker
  ): Promise<CreateOptionInstrumentsResult> {
    if (!this.optionMeta) {
      throw new Error('Option Meta is not defined');
    }
    const optionMarketTxBuilder = await getPsyAmericanMarketTxBuilder(
      this.convergence,
      this.optionMeta.underlyingAssetMint,
      this.underlyingAmountPerContractDecimals,
      this.optionMeta.quoteAssetMint,
      this.strikePriceDecimals,
      this.strikePrice,
      this.expiration,
      ixTracker
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

    const cvgWallet = new CvgWallet(convergence);
    const americanProgram = await createAmericanProgram(convergence, cvgWallet);
    const { americanMeta: meta, americanMetaKey: metaKey } =
      await getAmericanOptionMeta(
        convergence,
        americanProgram,
        underlyingMint,
        stableMint,
        expiresIn,
        1,
        strike
      );

    return new PsyoptionsAmericanInstrument(
      convergence,
      optionType,
      removeDecimals(meta.underlyingAmountPerContract, underlyingMint.decimals),
      underlyingMint.decimals,
      removeDecimals(meta.quoteAmountPerContract, stableMint.decimals),
      stableMint.decimals,
      Number(meta.expirationUnixTimestamp),
      meta.optionMint,
      metaKey,
      mintInfo.mintType.baseAssetIndex,
      amount,
      side,
      meta
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

export const getPsyAmericanMarketTxBuilder = async (
  cvg: Convergence,
  underlyingMint: PublicKey,
  underlyingMintDecimals: number,
  stableMint: PublicKey,
  stableMintDecimals: number,
  strike: number,
  expiresIn: number,
  ixTracker: InstructionUniquenessTracker
): Promise<CreateOptionInstrumentsResult> => {
  const cvgWallet = new CvgWallet(cvg);
  const americanProgram = createAmericanProgram(cvg, cvgWallet);

  const optionMarketTxBuilder = TransactionBuilder.make().setFeePayer(
    cvg.identity()
  );

  let quoteAmountPerContract = new BN(strike);
  let underlyingAmountPerContract = new BN('1');

  // Initialize the options meta the long way
  const expirationUnixTimestamp = new BN(expiresIn);
  quoteAmountPerContract = new BN(
    Number(quoteAmountPerContract) * Math.pow(10, stableMintDecimals)
  );
  underlyingAmountPerContract = new BN(
    Number(underlyingAmountPerContract) * Math.pow(10, underlyingMintDecimals)
  );

  let optionMarket: psyoptionsAmerican.OptionMarketWithKey | null = null;
  const [optionMarketKey, bump] =
    await psyoptionsAmerican.deriveOptionKeyFromParams({
      expirationUnixTimestamp,
      programId: americanProgram.programId,
      quoteAmountPerContract,
      quoteMint: stableMint,
      underlyingAmountPerContract,
      underlyingMint,
    });
  optionMarket = await psyoptionsAmerican.getOptionByKey(
    americanProgram,
    optionMarketKey
  );

  // If there is no existing market, derive the optionMarket from inputs
  if (optionMarket == null) {
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
    const { ataPubKey: mintFeePubkey, txBuilder: mintFeeTxBuilder } =
      await getOrCreateATAtxBuilder(cvg, underlyingMint, feeOwner);
    if (mintFeeTxBuilder && ixTracker.checkedAdd(mintFeeTxBuilder)) {
      optionMarketTxBuilder.add(mintFeeTxBuilder);
    }
    const { ataPubKey: exerciseFeePubkey, txBuilder: exerciseFeeTxBuilder } =
      await getOrCreateATAtxBuilder(cvg, stableMint, feeOwner);
    if (exerciseFeeTxBuilder && ixTracker.checkedAdd(exerciseFeeTxBuilder)) {
      optionMarketTxBuilder.add(exerciseFeeTxBuilder);
    }
    optionMarket = {
      optionMint: optionMarketIx.optionMintKey,
      writerTokenMint: optionMarketIx.writerMintKey,
      underlyingAssetMint: underlyingMint,
      quoteAssetMint: stableMint,
      underlyingAmountPerContract,
      quoteAmountPerContract,
      expirationUnixTimestamp,
      underlyingAssetPool: optionMarketIx.underlyingAssetPoolKey,
      quoteAssetPool: optionMarketIx.quoteAssetPoolKey,
      mintFeeAccount: mintFeePubkey,
      exerciseFeeAccount: exerciseFeePubkey,
      expired: false,
      bumpSeed: bump,
      key: optionMarketKey,
    };

    if (ixTracker.checkedAdd(optionMarketIx.tx)) {
      optionMarketTxBuilder.add({
        instruction: optionMarketIx.tx,
        signers: [cvg.identity()],
      });
    }
  }

  if (optionMarketTxBuilder.getInstructionCount() > 0) {
    return optionMarketTxBuilder;
  }
  return null;
};

export type GetAmericanOptionMetaResult = {
  americanMeta: psyoptionsAmerican.OptionMarketWithKey;
  americanMetaKey: PublicKey;
};
export const getAmericanOptionMeta = async (
  cvg: Convergence,
  americanProgram: any,
  underlyingMint: Mint,
  stableMint: Mint,
  expiresIn: number,
  underlyingAmountPerContract: number,
  quoteAmountPerContract: number
): Promise<GetAmericanOptionMetaResult> => {
  const expirationUnixTimestamp = new BN(Date.now() / 1_000 + expiresIn);
  const quoteAmountPerContractBN = new BN(
    Number(quoteAmountPerContract) * Math.pow(10, stableMint.decimals)
  );
  const underlyingAmountPerContractBN = new BN(
    Number(underlyingAmountPerContract) * Math.pow(10, underlyingMint.decimals)
  );
  const optionMarketIx =
    await psyoptionsAmerican.instructions.initializeOptionInstruction(
      americanProgram,
      {
        /** The option market expiration timestamp in seconds */
        expirationUnixTimestamp,
        quoteAmountPerContract: quoteAmountPerContractBN,
        quoteMint: stableMint.address,
        underlyingAmountPerContract: underlyingAmountPerContractBN,
        underlyingMint: underlyingMint.address,
      }
    );
  const feeOwner = psyoptionsAmerican.FEE_OWNER_KEY;
  const mintFeeAccount = cvg.tokens().pdas().associatedTokenAccount({
    mint: underlyingMint.address,
    owner: feeOwner,
  });
  const exerciseFeeAccount = cvg.tokens().pdas().associatedTokenAccount({
    mint: stableMint.address,
    owner: feeOwner,
  });
  const [americanMetaKey, bump] =
    await psyoptionsAmerican.deriveOptionKeyFromParams({
      expirationUnixTimestamp,
      programId: americanProgram.programId,
      quoteAmountPerContract: quoteAmountPerContractBN,
      quoteMint: stableMint.address,
      underlyingAmountPerContract: underlyingAmountPerContractBN,
      underlyingMint: underlyingMint.address,
    });
  const americanMeta: psyoptionsAmerican.OptionMarketWithKey = {
    optionMint: optionMarketIx.optionMintKey,
    writerTokenMint: optionMarketIx.writerMintKey,
    underlyingAssetMint: underlyingMint.address,
    quoteAssetMint: stableMint.address,
    underlyingAmountPerContract: underlyingAmountPerContractBN,
    quoteAmountPerContract: quoteAmountPerContractBN,
    expirationUnixTimestamp,
    underlyingAssetPool: optionMarketIx.underlyingAssetPoolKey,
    quoteAssetPool: optionMarketIx.quoteAssetPoolKey,
    mintFeeAccount,
    exerciseFeeAccount,
    expired: false,
    bumpSeed: bump,
    key: americanMetaKey,
  };

  return { americanMeta, americanMetaKey };
};
