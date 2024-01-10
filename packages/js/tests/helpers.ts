import { Commitment, Connection } from '@solana/web3.js';
import { PROGRAM_ID } from '@convergence-rfq/rfq';
import { v4 as uuidv4 } from 'uuid';
import { Program, web3 } from '@project-serum/anchor';
import { OptionType } from '@mithraic-labs/tokenized-euros';
import {
  Convergence,
  OrderType,
  toBigNumber,
  Rfq,
  Response,
  prepareAmericanOptions,
  SpotQuoteInstrument,
  keypairIdentity,
  PublicKey,
  removeDecimals,
  PsyoptionsEuropeanInstrument,
  prepareEuropeanOptions,
  PsyoptionsAmericanInstrument,
  SpotLegInstrument,
  Mint,
  TRANSACTION_PRIORITY_FEE_MAP,
} from '../src';
import { getUserKp, RPC_ENDPOINT } from '../../validator';
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
  return Convergence.make(connection, {
    skipPreflight: options.skipPreflight,
    transactionPriority: 'normal',
  });
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
  baseMint: Mint,
  quoteMint: Mint
) => {
  const randomExpiry = 3_600 + Math.random() * 1000;
  const expirationTimestamp = Date.now() / 1000 + randomExpiry;
  const { rfq, response } = await cvg.rfqs().createAndFinalize({
    instruments: [
      await SpotLegInstrument.create(cvg, baseMint, 1.0, 'long'),
      await PsyoptionsAmericanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        1,
        'long',
        1,
        24_534,
        expirationTimestamp
      ),
    ],
    orderType,
    fixedSize: { type: 'fixed-base', amount: 1 },
    quoteAsset: await SpotQuoteInstrument.create(cvg, quoteMint),
  });

  return { rfq, response };
};

export const createEuropeanCoveredCallRfq = async (
  cvg: Convergence,
  orderType: OrderType,
  baseMint: Mint,
  quoteMint: Mint,
  oracle: PublicKey
) => {
  const min = 3_600;
  const randomExpiry = min + Math.random();
  const expirationTimestamp = Date.now() / 1000 + randomExpiry;
  const { rfq, response } = await cvg.rfqs().createAndFinalize({
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
        1,
        oracle,
        0,
        expirationTimestamp
      ),
    ],
    orderType,
    fixedSize: { type: 'fixed-base', amount: 1 },
    quoteAsset: await SpotQuoteInstrument.create(cvg, quoteMint),
  });
  return { rfq, response };
};

export const createEuropeanOpenSizeCallSpdOptionRfq = async (
  cvg: Convergence,
  orderType: OrderType,
  baseMint: Mint,
  quoteMint: Mint,
  oracle: PublicKey
) => {
  const min = 3_600;
  const randomExpiry = min + Math.random() * 1000;
  const expirationTimestamp = Date.now() / 1000 + randomExpiry;
  const { rfq, response } = await cvg.rfqs().createAndFinalize({
    instruments: [
      await PsyoptionsEuropeanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        1,
        'long',
        29_000,
        1,
        oracle,
        0,
        expirationTimestamp
      ),
      await PsyoptionsEuropeanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        1,
        'long',
        31_000,
        1,
        oracle,
        0,
        expirationTimestamp
      ),
    ],
    orderType,
    fixedSize: { type: 'open' },
    quoteAsset: await SpotQuoteInstrument.create(cvg, quoteMint),
  });
  return { rfq, response };
};

export const createAmericanFixedBaseStraddle = async (
  cvg: Convergence,
  orderType: OrderType,
  baseMint: Mint,
  quoteMint: Mint
) => {
  const randomExpiry = 3_600 + Math.random() * 1000;
  const expirationTimestamp = Date.now() / 1000 + randomExpiry;
  const { rfq, response } = await cvg.rfqs().createAndFinalize({
    instruments: [
      await PsyoptionsAmericanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        1,
        'long',
        1,
        27_000,
        expirationTimestamp
      ),
      await PsyoptionsAmericanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.PUT,
        1,
        'long',
        1,
        27_000,
        expirationTimestamp
      ),
    ],
    orderType,
    fixedSize: { type: 'fixed-base', amount: 1 },
    quoteAsset: await SpotQuoteInstrument.create(cvg, quoteMint),
  });

  return { rfq, response };
};

export const createEuropeanFixedBaseStraddle = async (
  cvg: Convergence,
  orderType: OrderType,
  baseMint: Mint,
  quoteMint: Mint,
  oracle: PublicKey
) => {
  const min = 3_600;
  const randomExpiry = min + Math.random() * 1000;
  const expirationTimestamp = Date.now() / 1000 + randomExpiry;
  const { rfq, response } = await cvg.rfqs().createAndFinalize({
    instruments: [
      await PsyoptionsEuropeanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        1,
        'long',
        26_334,
        1,
        oracle,
        0,
        expirationTimestamp
      ),
      await PsyoptionsEuropeanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.PUT,
        1,
        'long',
        26_334,
        1,
        oracle,
        0,
        expirationTimestamp
      ),
    ],
    orderType,
    fixedSize: { type: 'fixed-base', amount: 1 },
    quoteAsset: await SpotQuoteInstrument.create(cvg, quoteMint),
  });

  return { rfq, response };
};

export const createAmericanOpenSizeCallSpdOptionRfq = async (
  cvg: Convergence,
  orderType: OrderType,
  baseMint: Mint,
  quoteMint: Mint
) => {
  const randomExpiry = 3_600 + Math.random() * 1000;
  const expirationTimestamp = Date.now() / 1000 + randomExpiry;
  const { rfq, response } = await cvg.rfqs().createAndFinalize({
    instruments: [
      await PsyoptionsAmericanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        1,
        'long',
        1,
        33_000,
        expirationTimestamp
      ),
      await PsyoptionsAmericanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        1,
        'short',
        1,
        31_000,
        expirationTimestamp
      ),
    ],
    orderType,
    fixedSize: { type: 'open' },
    quoteAsset: await SpotQuoteInstrument.create(cvg, quoteMint),
  });

  return { rfq, response };
};

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
  const expirationTimestamp = Date.now() / 1000 + randomExpiry;
  const { rfq } = await cvg.rfqs().createAndFinalize({
    instruments: [
      await PsyoptionsAmericanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        1,
        reversed ? 'short' : 'long',
        1,
        33_000,
        expirationTimestamp
      ),
      await PsyoptionsAmericanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        2,
        reversed ? 'long' : 'short',
        1,
        35_000,
        expirationTimestamp
      ),
      await PsyoptionsAmericanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        1,
        reversed ? 'short' : 'long',
        1,
        37_000,
        expirationTimestamp
      ),
    ],
    orderType,
    fixedSize: { type: 'fixed-base', amount: 1 },
    quoteAsset: await SpotQuoteInstrument.create(cvg, quoteMint),
    settlingWindow: 90 * 24 * 60 * 60, // 90 days
  });

  return rfq;
};

export const createRfq = async (
  cvg: Convergence,
  amount: number,
  orderType: OrderType,
  activeWindow?: number,
  whitelist?: PublicKey,
  rfqType: 'open' | 'fixed-base' | 'fixed-quote' = 'fixed-base',
  quoteMintPk = QUOTE_MINT_PK,
  baseMintPk = BASE_MINT_BTC_PK
  // 10 minutes
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
  const { rfq, response } = await cvg.rfqs().createAndFinalize({
    instruments: [
      await SpotLegInstrument.create(cvg, baseMint, instrumentAmount, 'long'),
    ],
    orderType,
    fixedSize: { type: rfqType, amount: fixedSizeAmount },
    quoteAsset: await SpotQuoteInstrument.create(cvg, quoteMint),
    activeWindow,
    whitelistAddress: whitelist,
  });
  return { rfq, response };
};

export const respondToRfq = async (
  cvg: Convergence,
  rfq: Rfq,
  bid?: number,
  ask?: number,
  responseExpirationTimestamp?: number,
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
    expirationTimestamp: responseExpirationTimestamp,
  });
};

export const prepareRfqSettlement = async (
  cvg: Convergence,
  rfq: Rfq,
  response: Response
) => {
  return await cvg.rfqs().prepareSettlement({
    caller: cvg.identity(),
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
  await prepareAmericanOptions(cvg, response.address, cvg.identity().publicKey);
};

export const setupEuropean = async (cvg: Convergence, response: Response) => {
  await prepareEuropeanOptions(
    cvg,
    response.address,
    cvg.rpc().getDefaultFeePayer().publicKey
  );
};

export const createAmericanIronCondor = async (
  cvg: Convergence,
  orderType: OrderType,
  baseMint: Mint,
  quoteMint: Mint
) => {
  const randomExpiry = 3_600 + Math.random() * 1000;
  const expirationTimestamp = Date.now() / 1000 + randomExpiry;
  const { rfq } = await cvg.rfqs().createAndFinalize({
    instruments: [
      await PsyoptionsAmericanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        4,
        'long',
        1,
        34_000,
        expirationTimestamp
      ),
      await PsyoptionsAmericanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        4,
        'short',
        1,
        35_000,
        expirationTimestamp
      ),
      await PsyoptionsAmericanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        4,
        'long',
        1,
        37_000,
        expirationTimestamp
      ),
      await PsyoptionsAmericanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        4,
        'short',
        1,
        36_000,
        expirationTimestamp
      ),
    ],
    orderType,
    fixedSize: { type: 'fixed-base', amount: 1 },
    quoteAsset: await SpotQuoteInstrument.create(cvg, quoteMint),
    settlingWindow: 90 * 24 * 60 * 60, // 90 days
  });

  return { rfq };
};

export const createEuropeanIronCondor = async (
  cvg: Convergence,
  orderType: OrderType,
  baseMint: Mint,
  quoteMint: Mint,
  oracle: PublicKey
) => {
  const randomExpiry = 3_600 + Math.random() * 1000;
  const expirationTimestamp = Date.now() / 1000 + randomExpiry;
  const { rfq } = await cvg.rfqs().createAndFinalize({
    instruments: [
      await PsyoptionsEuropeanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        3,
        'long',
        27_000,
        1,
        oracle,
        0,
        expirationTimestamp
      ),
      await PsyoptionsEuropeanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.PUT,
        3,
        'short',
        28_000,
        1,
        oracle,
        0,
        expirationTimestamp
      ),
      await PsyoptionsEuropeanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        3,
        'long',
        30_000,
        1,
        oracle,
        0,
        expirationTimestamp
      ),
      await PsyoptionsEuropeanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.PUT,
        3,
        'short',
        29_000,
        1,
        oracle,
        0,
        expirationTimestamp
      ),
    ],
    orderType,
    fixedSize: { type: 'fixed-base', amount: 1 },
    quoteAsset: await SpotQuoteInstrument.create(cvg, quoteMint),
    settlingWindow: 90 * 24 * 60 * 60, // 90 days
  });

  return { rfq };
};

export const expectError = async (promise: Promise<any>, errorText: string) => {
  try {
    await promise;
    throw new Error('No error thrown!');
  } catch (e) {
    if (
      !e?.message.includes(errorText) &&
      !e?.logs?.some((e: string) => e.includes(errorText))
    ) {
      throw e;
    }
  }
};
