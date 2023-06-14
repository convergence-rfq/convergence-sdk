import { Commitment, Connection, Keypair } from '@solana/web3.js';
import { PROGRAM_ID } from '@convergence-rfq/rfq';
import { v4 as uuidv4 } from 'uuid';
import { OptionMarketWithKey } from '@mithraic-labs/psy-american';
import { Program, web3 } from '@project-serum/anchor';

import {
  Convergence,
  OrderType,
  OptionType,
  PsyoptionsAmericanInstrument,
  initializeNewAmericanOption,
  toBigNumber,
  createAmericanProgram,
  Side,
  Rfq,
  Response,
  createAmericanAccountsAndMintOptions,
  SpotQuoteInstrument,
  SpotLegInstrument,
  keypairIdentity,
  PublicKey,
  removeDecimals,
} from '../src';
import { getUserKp, RPC_ENDPOINT } from '../../validator';
import { BASE_MINT_PK, QUOTE_MINT_PK } from './constants';

const DEFAULT_COMMITMENT = 'confirmed';
const DEFAULT_SKIP_PREFLIGHT = true;

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

export const generatePk = async (): Promise<PublicKey> => {
  return await PublicKey.createWithSeed(PROGRAM_ID, uuidv4(), PROGRAM_ID);
};

export const sleep = (seconds: number) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

export const fetchTokenAmount = async (
  cvg: Convergence,
  mintAddress: PublicKey,
  owner: PublicKey
) => {
  const takerBtcBefore = await cvg.tokens().findTokenWithMintByMint({
    mint: mintAddress,
    address: owner,
    addressType: 'owner',
  });
  return removeDecimals(
    takerBtcBefore.amount.basisPoints,
    takerBtcBefore.amount.currency.decimals
  );
};

export type HumanOrderType = 'sell' | 'buy' | 'two-way';
export type HumanSide = 'bid' | 'ask';

const fromHumanSide = (side: HumanSide) =>
  side === 'bid' ? Side.Bid : Side.Ask;

const fromHumanOrderType = (orderType: HumanOrderType): OrderType => {
  switch (orderType) {
    case 'sell':
      return OrderType.Sell;
    case 'buy':
      return OrderType.Buy;
    case 'two-way':
      return OrderType.TwoWay;
  }
};

export const createAmericanCoveredCall = async (
  cvg: Convergence,
  orderType: HumanOrderType
) => {
  const baseMint = await cvg
    .tokens()
    .findMintByAddress({ address: BASE_MINT_PK });
  const quoteMint = await cvg
    .tokens()
    .findMintByAddress({ address: QUOTE_MINT_PK });
  const min = 3_600;
  const randomExpiry = min + Math.random();
  const { optionMarketKey, optionMarket } = await initializeNewAmericanOption(
    cvg,
    createAmericanProgram(cvg),
    baseMint,
    quoteMint,
    27_000,
    1,
    randomExpiry
  );

  const { rfq, response } = await cvg.rfqs().createAndFinalize({
    instruments: [
      // await SpotLegInstrument.create(cvg, baseMint, 1.0, Side.Bid),
      await PsyoptionsAmericanInstrument.create(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        optionMarket,
        optionMarketKey,
        1,
        Side.Bid
      ),
    ],
    orderType: fromHumanOrderType(orderType),
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
    quoteAsset: await SpotQuoteInstrument.create(cvg, quoteMint),
  });

  return { rfq, response, optionMarket };
};

export const createRfq = async (
  cvg: Convergence,
  amount: 1.0,
  orderType: HumanOrderType
) => {
  const baseMint = await cvg
    .tokens()
    .findMintByAddress({ address: BASE_MINT_PK });
  const quoteMint = await cvg
    .tokens()
    .findMintByAddress({ address: QUOTE_MINT_PK });
  const { rfq, response } = await cvg.rfqs().createAndFinalize({
    instruments: [
      await SpotLegInstrument.create(cvg, baseMint, amount, Side.Bid),
    ],
    orderType: fromHumanOrderType(orderType),
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
    quoteAsset: await SpotQuoteInstrument.create(cvg, quoteMint),
  });
  return { rfq, response };
};

export const confirmResponse = async (
  cvg: Convergence,
  rfq: Rfq,
  response: Response,
  side: HumanSide
) => {
  return await cvg.rfqs().confirmResponse({
    taker: cvg.rpc().getDefaultFeePayer(),
    rfq: rfq.address,
    response: response.address,
    side: fromHumanSide(side),
  });
};

export const respond = async (
  cvg: Convergence,
  rfq: Rfq,
  orderType: HumanSide
) => {
  switch (orderType) {
    case 'bid':
    // TODO: Handle
    case 'ask':
    // TODO: Handle
  }

  return await cvg.rfqs().respond({
    maker: cvg.rpc().getDefaultFeePayer(),
    rfq: rfq.address,
    // Assumes bid
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.0000001 },
    },
  });
};

export const prepareSettlement = async (
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

export const settle = async (
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

export const createAmericanAccountsAndMint = async (
  cvg: Convergence,
  rfq: Rfq,
  optionMarket: OptionMarketWithKey
) => {
  await createAmericanAccountsAndMintOptions(
    cvg,
    cvg.rpc().getDefaultFeePayer() as Keypair,
    rfq.address,
    optionMarket
  );
};

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
