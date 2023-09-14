import { Commitment, Connection } from '@solana/web3.js';
import { PROGRAM_ID } from '@convergence-rfq/rfq';
import { v4 as uuidv4 } from 'uuid';
import { Program, web3 } from '@project-serum/anchor';
import * as anchor from '@project-serum/anchor';
import {
  Convergence,
  OrderType,
  initializeNewAmericanOption,
  toBigNumber,
  createAmericanProgram,
  Rfq,
  Response,
  getOrCreateAmericanOptionATAs,
  mintAmericanOptions,
  SpotQuoteInstrument,
  keypairIdentity,
  PublicKey,
  removeDecimals,
  useCache,
  createEuropeanProgram,
  CvgWallet,
  getOrCreateEuropeanOptionATAs,
  mintEuropeanOptions,
  // LegInstrumentInputData,
  OptionType,
  PsyoptionsAmericanInstrument,
  PsyoptionsEuropeanInstrument,
  SpotLegInstrument,
} from '../src';
import { getUserKp, RPC_ENDPOINT } from '../../validator';
import { IDL as PseudoPythIdl } from '../../validator/fixtures/programs/pseudo_pyth_idl';
import { BASE_MINT_BTC_PK, QUOTE_MINT_PK } from './constants';
const DEFAULT_COMMITMENT = 'confirmed';
const DEFAULT_SKIP_PREFLIGHT = true;

/// Convergence

export type ConvergenceTestOptions = {
  commitment?: Commitment;
  skipPreflight?: boolean;
  rpcEndpoint?: string;
  wsEndpoint?: string;
  solsToAirdrop?: number;
};

export const createCvg = (options: ConvergenceTestOptions = {}) => {
  const connection = new Connection(options.rpcEndpoint ?? RPC_ENDPOINT, {
    commitment: options.commitment ?? DEFAULT_COMMITMENT,
    wsEndpoint: options.wsEndpoint,
  });
  return Convergence.make(connection, { skipPreflight: options.skipPreflight });
};

// Default user is dao but could be maker or taker
export const createUserCvg = (user = 'dao'): Convergence => {
  const cvg = createCvg({ skipPreflight: DEFAULT_SKIP_PREFLIGHT });
  return cvg.use(keypairIdentity(getUserKp(user)));
};

/// Utils

export async function getAll<T>(
  iter: AsyncGenerator<T, void, void>
): Promise<T[]> {
  const values: T[] = [];

  for await (const value of iter) {
    values.push(value);
  }

  return values;
}

export const generatePk = async (): Promise<PublicKey> => {
  return await PublicKey.createWithSeed(PROGRAM_ID, uuidv4(), PROGRAM_ID);
};

export const sleep = (seconds: number) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

export const fetchTokenAmount = async (
  cvg: Convergence,
  mintAddress: PublicKey
) => {
  const token = await cvg.tokens().findTokenWithMintByMint({
    mint: mintAddress,
    address: cvg.identity().publicKey,
    addressType: 'owner',
  });
  return removeDecimals(
    token.amount.basisPoints,
    token.amount.currency.decimals
  );
};

export function generateTicker(): string {
  const length = 3;
  let ticker = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    ticker += characters.charAt(randomIndex);
  }

  return ticker;
}

/// Wrappers

export const createAmericanCoveredCallRfq = async (
  cvg: Convergence,
  orderType: OrderType,
  baseMint: any,
  quoteMint: any
) => {
  const randomExpiry = 3_600 + Math.random() * 1000;
  const { rfq, responses } = await cvg.rfqs().createAndFinalize({
    instruments: [
      await SpotLegInstrument.create(cvg, baseMint, 1.0, 'long'),
      await PsyoptionsAmericanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        1,
        'long',
        24_534,
        randomExpiry
      ),
    ],
    orderType,
    fixedSize: { type: 'fixed-base', amount: 1 },
    quoteAsset: await SpotQuoteInstrument.create(cvg, quoteMint),
  });

  return { rfq, responses };
};

export const createEuropeanCoveredCallRfq = async (
  cvg: Convergence,
  orderType: OrderType,
  baseMint: any,
  quoteMint: any
) => {
  const oracle = await createPythPriceFeed(
    new anchor.Program(
      PseudoPythIdl,
      new PublicKey('FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH'),
      new anchor.AnchorProvider(cvg.connection, new CvgWallet(cvg), {})
    ),
    17_000,
    quoteMint.decimals * -1
  );
  const min = 3_600;
  const randomExpiry = min + Math.random();

  const { rfq, responses } = await cvg.rfqs().createAndFinalize({
    instruments: [
      await SpotLegInstrument.create(cvg, baseMint, 1.0, 'long'),
      await PsyoptionsEuropeanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        1,
        'long',
        24_534,
        oracle,
        randomExpiry
      ),
    ],
    orderType,
    fixedSize: { type: 'fixed-base', amount: 1 },
    quoteAsset: await SpotQuoteInstrument.create(cvg, quoteMint),
  });
  return { rfq, responses };
};

export const createEuropeanOpenSizeCallSpdOptionRfq = async (
  cvg: Convergence,
  orderType: OrderType,
  baseMint: any,
  quoteMint: any
) => {
  const oracle = await createPythPriceFeed(
    new anchor.Program(
      PseudoPythIdl,
      new PublicKey('FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH'),
      new anchor.AnchorProvider(cvg.connection, new CvgWallet(cvg), {})
    ),
    17_000,
    quoteMint.decimals * -1
  );
  const min = 3_600;
  const randomExpiry = min + Math.random() * 1000;

  const { rfq, responses } = await cvg.rfqs().createAndFinalize({
    instruments: [
      await PsyoptionsEuropeanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        1,
        'long',
        29_000,
        oracle,
        randomExpiry
      ),
      await PsyoptionsEuropeanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        1,
        'long',
        31_000,
        oracle,
        randomExpiry
      ),
    ],
    orderType,
    fixedSize: { type: 'open' },
    quoteAsset: await SpotQuoteInstrument.create(cvg, quoteMint),
  });
  return { rfq, responses };
};

export const createAmericanFixedBaseStraddle = async (
  cvg: Convergence,
  orderType: OrderType,
  baseMint: any,
  quoteMint: any
) => {
  const randomExpiry = 3_600 + Math.random() * 1000;

  const { rfq, responses } = await cvg.rfqs().createAndFinalize({
    instruments: [
      await PsyoptionsAmericanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        1,
        'long',
        27_000,
        randomExpiry
      ),
      await PsyoptionsAmericanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        1,
        'long',
        29_000,
        randomExpiry
      ),
    ],
    orderType,
    fixedSize: { type: 'fixed-base', amount: 1 },
    quoteAsset: await SpotQuoteInstrument.create(cvg, quoteMint),
  });

  return { rfq, responses };
};

export const createEuropeanFixedBaseStraddle = async (
  cvg: Convergence,
  orderType: OrderType,
  baseMint: any,
  quoteMint: any
) => {
  const oracle = await createPythPriceFeed(
    new anchor.Program(
      PseudoPythIdl,
      new PublicKey('FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH'),
      new anchor.AnchorProvider(cvg.connection, new CvgWallet(cvg), {})
    ),
    17_000,
    quoteMint.decimals * -1
  );
  const min = 3_600;
  const randomExpiry = min + Math.random() * 1000;

  const { rfq, responses } = await cvg.rfqs().createAndFinalize({
    instruments: [
      await PsyoptionsEuropeanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        1,
        'long',
        26_334,
        oracle,
        randomExpiry
      ),
      await PsyoptionsEuropeanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.PUT,
        1,
        'long',
        26_334,
        oracle,
        randomExpiry
      ),
    ],
    orderType,
    fixedSize: { type: 'fixed-base', amount: 1 },
    quoteAsset: await SpotQuoteInstrument.create(cvg, quoteMint),
  });

  return { rfq, responses };
};

export const createAmericanOpenSizeCallSpdOptionRfq = async (
  cvg: Convergence,
  orderType: OrderType,
  baseMint: any,
  quoteMint: any
) => {
  const randomExpiry = 3_600 + Math.random() * 1000;

  const { rfq, responses } = await cvg.rfqs().createAndFinalize({
    instruments: [
      await PsyoptionsAmericanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        1,
        'long',
        33_000,
        randomExpiry
      ),
      await PsyoptionsAmericanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        1,
        'short',
        31_000,
        randomExpiry
      ),
    ],
    orderType,
    fixedSize: { type: 'open' },
    quoteAsset: await SpotQuoteInstrument.create(cvg, quoteMint),
  });

  return { rfq, responses };
};

const cFlyMarketsCache = useCache(async (cvg, baseMint, quoteMint) => {
  const [
    { optionMarket: low, optionMarketKey: lowKey },
    { optionMarket: medium, optionMarketKey: mediumKey },
    { optionMarket: high, optionMarketKey: highKey },
  ] = await Promise.all([
    initializeNewAmericanOption(
      cvg,
      baseMint,
      quoteMint,
      18_000,
      1,
      90 * 24 * 60 * 60 // 90 days
    ),
    initializeNewAmericanOption(
      cvg,
      baseMint,
      quoteMint,
      20_000,
      1,
      90 * 24 * 60 * 60 // 90 days
    ),
    initializeNewAmericanOption(
      cvg,
      baseMint,
      quoteMint,
      22_000,
      1,
      90 * 24 * 60 * 60 // 90 days
    ),
  ]);

  return {
    low,
    lowKey,

    medium,
    mediumKey,

    high,
    highKey,
  };
}, 300);

export const createCFlyRfq = async (
  cvg: Convergence,
  orderType: OrderType,
  reversed: Boolean
) => {
  const baseMint = await cvg
    .tokens()
    .findMintByAddress({ address: BASE_MINT_BTC_PK });
  const quoteMint = await cvg
    .tokens()
    .findMintByAddress({ address: QUOTE_MINT_PK });

  const randomExpiry = 3_600 + Math.random() * 1000;
  const {
    rfq: { address: rfqAddress },
  } = await cvg.rfqs().create({
    instruments: [
      await PsyoptionsAmericanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        1,
        reversed ? 'short' : 'long',
        33_000,
        randomExpiry
      ),
      await PsyoptionsAmericanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        2,
        reversed ? 'long' : 'short',
        35_000,
        randomExpiry
      ),
      await PsyoptionsAmericanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        1,
        reversed ? 'short' : 'long',
        37_000,
        randomExpiry
      ),
    ],
    orderType,
    fixedSize: { type: 'fixed-base', amount: 1 },
    quoteAsset: await SpotQuoteInstrument.create(cvg, quoteMint),
    settlingWindow: 90 * 24 * 60 * 60, // 90 days
  });
  const { rfq } = await cvg.rfqs().finalizeRfqConstruction({ rfq: rfqAddress });

  return rfq;
};

export const createRfq = async (
  cvg: Convergence,
  amount: number,
  orderType: OrderType,
  rfqType: 'open' | 'fixed-base' | 'fixed-quote' = 'fixed-base',
  quoteMintPk = QUOTE_MINT_PK,
  baseMintPk = BASE_MINT_BTC_PK
) => {
  let instrumentAmount = 1;
  let fixedSizeAmount = 1;
  if (rfqType === 'fixed-base') {
    instrumentAmount = amount;
  }
  if (rfqType === 'fixed-quote') {
    fixedSizeAmount = amount;
  }
  const baseMint = await cvg
    .tokens()
    .findMintByAddress({ address: baseMintPk });
  const quoteMint = await cvg
    .tokens()
    .findMintByAddress({ address: quoteMintPk });
  const { rfq, responses } = await cvg.rfqs().createAndFinalize({
    instruments: [
      await SpotLegInstrument.create(cvg, baseMint, instrumentAmount, 'long'),
    ],
    orderType,
    fixedSize: { type: rfqType, amount: fixedSizeAmount },
    quoteAsset: await SpotQuoteInstrument.create(cvg, quoteMint),
  });
  return { rfq, responses };
};

export const respondToRfq = async (
  cvg: Convergence,
  rfq: Rfq,
  bid?: number,
  ask?: number,
  legsMultiplier?: number
) => {
  if (!bid && !ask) {
    throw new Error('Must provide bid and/or ask');
  }
  return await cvg.rfqs().respond({
    maker: cvg.identity(),
    rfq: rfq.address,
    bid: bid ? { price: bid, legsMultiplier } : undefined,
    ask: ask ? { price: ask, legsMultiplier } : undefined,
  });
};

export const prepareRfqSettlement = async (
  cvg: Convergence,
  rfq: Rfq,
  response: Response
) => {
  return await cvg.rfqs().prepareSettlement({
    caller: cvg.rpc().getDefaultFeePayer(),
    rfq: rfq.address,
    response: response.address,
    legAmountToPrepare: rfq.legs.length,
  });
};

export const settleRfq = async (
  cvg: Convergence,
  rfq: Rfq,
  response: Response
) => {
  return await cvg.rfqs().settle({
    rfq: rfq.address,
    response: response.address,
    maker: response.maker,
    taker: rfq.taker,
  });
};

/// Options

export const createPythPriceFeed = async (
  oracleProgram: Program<any>,
  initPrice: number,
  expo: number
) => {
  const conf = toBigNumber((initPrice / 10) * 10 ** -expo);
  const collateralTokenFeed = new web3.Account();

  if (!oracleProgram?.provider?.publicKey) {
    throw new Error('oracleProgram not initialized');
  }

  await oracleProgram.rpc.initialize(
    toBigNumber(initPrice * 10 ** -expo),
    expo,
    conf,
    {
      accounts: { price: collateralTokenFeed.publicKey },
      signers: [collateralTokenFeed],
      instructions: [
        web3.SystemProgram.createAccount({
          fromPubkey: oracleProgram.provider.publicKey,
          newAccountPubkey: collateralTokenFeed.publicKey,
          space: 3312,
          lamports:
            await oracleProgram.provider.connection.getMinimumBalanceForRentExemption(
              3312
            ),
          programId: oracleProgram.programId,
        }),
      ],
    }
  );
  return collateralTokenFeed.publicKey;
};

export const setupAmerican = async (cvg: Convergence, response: Response) => {
  const americanProgram = createAmericanProgram(cvg);
  await getOrCreateAmericanOptionATAs(
    cvg,
    response.address,
    cvg.identity().publicKey,
    americanProgram
  );
  await mintAmericanOptions(
    cvg,
    response.address,
    cvg.identity().publicKey,
    americanProgram
  );
};

export const setupEuropean = async (cvg: Convergence, response: Response) => {
  const europeanProgram = await createEuropeanProgram(cvg);

  await getOrCreateEuropeanOptionATAs(
    cvg,
    response.address,
    cvg.rpc().getDefaultFeePayer().publicKey
  );
  await mintEuropeanOptions(
    cvg,
    response.address,
    cvg.rpc().getDefaultFeePayer().publicKey,
    europeanProgram
  );
};
