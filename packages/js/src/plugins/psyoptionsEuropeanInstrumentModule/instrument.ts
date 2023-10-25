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

import { BN, Program } from '@project-serum/anchor';
import * as psyoptionsEuropean from '@mithraic-labs/tokenized-euros';
import * as anchor from '@project-serum/anchor';
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
import { CvgWallet } from '@/utils';

export const createEuropeanProgram = async (convergence: Convergence) => {
  const cvgWallet = new CvgWallet(convergence);
  return psyoptionsEuropean.createProgramFromProvider(
    new anchor.AnchorProvider(
      convergence.connection,
      cvgWallet,
      anchor.AnchorProvider.defaultOptions()
    ),
    new PublicKey(psyoptionsEuropean.programId)
  );
};

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
    readonly expirationTimestamp: number, // timestamp in seconds
    readonly optionMint: PublicKey,
    readonly optionMetaPubKey: PublicKey,
    readonly baseAssetIndex: BaseAssetIndex,
    readonly amount: number,
    readonly side: LegSide,
    readonly underlyingAssetMint?: PublicKey,
    readonly stableAssetMint?: PublicKey,
    readonly oracleAddress?: PublicKey
  ) {}

  getBaseAssetIndex = () => this.baseAssetIndex;
  getAmount = () => this.amount;
  getDecimals = () => PsyoptionsEuropeanInstrument.decimals;
  getSide = () => this.side;
  async getPreparationsBeforeRfqCreation(): Promise<CreateOptionInstrumentsResult> {
    if (!this.underlyingAssetMint) {
      throw Error('Underlying asset mint is undefined');
    }
    if (!this.stableAssetMint) {
      throw Error('Stable asset mint is undefined');
    }
    if (!this.oracleAddress) {
      throw Error('Oracle address is undefined');
    }
    const optionMarketIxs = await getPsyEuropeanMarketIxs(
      this.convergence,
      this.underlyingAssetMint,
      this.underlyingAmountPerContractDecimals,
      this.underlyingAmountPerContract,
      this.stableAssetMint,
      this.strikePriceDecimals,
      this.strikePrice,
      this.expirationTimestamp,
      this.oracleAddress
    );

    return optionMarketIxs;
  }

  getExchangeAssetMint(): PublicKey {
    return this.optionMint;
  }

  static async create(
    convergence: Convergence,
    underlyingMint: Mint,
    stableMint: Mint,
    optionType: OptionType,
    amount: number,
    side: LegSide,
    strike: number,
    underlyingAmountPerContract: number,
    oracleAddress: PublicKey,
    expirationTimestamp: number
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
    const { metaKey, optionMint } = await getEuropeanOptionKeys(
      europeanProgram,
      underlyingMint,
      stableMint,
      expirationTimestamp,
      strike,
      underlyingAmountPerContract,
      optionType
    );

    return new PsyoptionsEuropeanInstrument(
      convergence,
      optionType,
      underlyingAmountPerContract,
      underlyingMint.decimals,
      strike,
      stableMint.decimals,
      expirationTimestamp,
      optionMint,
      metaKey,
      mintInfo.mintType.baseAssetIndex,
      amount,
      side,
      underlyingMint.address,
      stableMint.address,
      oracleAddress
    );
  }

  async getOptionMeta() {
    const optionMeta = await PsyoptionsEuropeanInstrument.fetchMeta(
      this.convergence,
      this.optionMetaPubKey
    );

    return optionMeta;
  }

  /** Helper method to get validation accounts for a Psyoptions European instrument. */
  getValidationAccounts() {
    if (!this.underlyingAssetMint)
      throw Error('Underlying asset mint is undefined');
    return [
      {
        pubkey: this.getProgramId(),
        isSigner: false,
        isWritable: false,
      },
      { pubkey: this.optionMetaPubKey, isSigner: false, isWritable: false },
      {
        pubkey: this.convergence
          .rfqs()
          .pdas()
          .mintInfo({ mint: this.underlyingAssetMint }),
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
      expiration: this.expirationTimestamp,
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

export const getPsyEuropeanMarketIxs = async (
  cvg: Convergence,
  underlyingMint: PublicKey,
  underlyingMintDecimals: number,
  underlyingAmountPerContract: number,
  stableMint: PublicKey,
  stableMintDecimals: number,
  strike: number,
  expiresIn: number,
  oracleAddress: PublicKey
): Promise<CreateOptionInstrumentsResult> => {
  const europeanProgram = await createEuropeanProgram(cvg);
  const expirationTimestamp = new BN(expiresIn);
  const oracleProviderId = 0; // Switchboard = 1, Pyth = 0
  const quoteAmountPerContractBN = new BN(
    addDecimals(strike, stableMintDecimals)
  );
  const underlyingAmountPerContractBN = new BN(
    addDecimals(underlyingAmountPerContract, underlyingMintDecimals)
  );

  // Retrieve the euro meta account and a creation instruction (may or may not be required)
  const { instruction: createIx, euroMetaKey } =
    await psyoptionsEuropean.instructions.createEuroMetaInstruction(
      europeanProgram,
      underlyingMint,
      underlyingMintDecimals,
      stableMint,
      stableMintDecimals,
      expirationTimestamp,
      underlyingAmountPerContractBN,
      quoteAmountPerContractBN,
      stableMintDecimals,
      oracleAddress,
      oracleProviderId
    );

  const euroMetaKeyAccount = await cvg.rpc().getAccount(euroMetaKey);
  if (euroMetaKeyAccount.exists) {
    return [];
  }

  // Initialize all accounts for European program
  const { instructions: initializeIxs } =
    await psyoptionsEuropean.instructions.initializeAllAccountsInstructions(
      europeanProgram,
      underlyingMint,
      stableMint,
      oracleAddress,
      expirationTimestamp,
      stableMintDecimals,
      oracleProviderId
    );

  return [...initializeIxs, createIx];
};

export type GetEuropeanOptionMetaResult = {
  optionMint: PublicKey;
  metaKey: PublicKey;
};

export const getEuropeanOptionKeys = async (
  europeanProgram: Program<psyoptionsEuropean.EuroPrimitive>,
  underlyingMint: Mint,
  stableMint: Mint,
  expirationTimestamp: number,
  strike: number,
  underlyingAmountPerContract: number,
  optionType: OptionType
): Promise<GetEuropeanOptionMetaResult> => {
  const quoteAmountPerContractBN = new BN(
    addDecimals(strike, stableMint.decimals)
  );
  const underlyingAmountPerContractBN = new BN(
    addDecimals(underlyingAmountPerContract, underlyingMint.decimals)
  );

  const [metaKey] = await psyoptionsEuropean.pdas.deriveEuroMeta(
    europeanProgram,
    underlyingMint.address,
    stableMint.address,
    new BN(expirationTimestamp),
    underlyingAmountPerContractBN,
    quoteAmountPerContractBN,
    stableMint.decimals
  );

  if (optionType == OptionType.CALL) {
    const [optionMint] = await psyoptionsEuropean.pdas.deriveCallOptionMint(
      europeanProgram,
      metaKey
    );
    return { optionMint, metaKey };
  }
  const [optionMint] = await psyoptionsEuropean.pdas.derivePutOptionMint(
    europeanProgram,
    metaKey
  );
  return { optionMint, metaKey };
};
