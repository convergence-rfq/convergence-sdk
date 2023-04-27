import { OptionMarketWithKey } from '@mithraic-labs/psy-american';
import { Commitment, Connection, Keypair } from '@solana/web3.js';
import { Program, web3 } from '@project-serum/anchor';
import { PROGRAM_ID } from '@convergence-rfq/rfq';
import { v4 as uuidv4 } from 'uuid';

import { getUserKp, RPC_ENDPOINT, Ctx } from '../../validator';
import { Pyth } from '../../validator/fixtures/programs/pseudo_pyth_idl';

import {
  Convergence,
  keypairIdentity,
  OrderType,
  OptionType,
  PsyoptionsAmericanInstrument,
  initializeNewAmericanOption,
  toBigNumber,
  SpotInstrument,
  createAmericanProgram,
  Side,
  PublicKey,
  Rfq,
  Response,
  createAmericanAccountsAndMintOptions,
} from '../src';

// This comes from the CPL fixtures used in validator
export const CTX = new Ctx();
export const BASE_MINT_DECIMALS = 9;
export const BASE_MINT_PK = new PublicKey(CTX.baseMint);

export type ConvergenceTestOptions = {
  commitment?: Commitment;
  skipPreflight?: boolean;
  rpcEndpoint?: string;
  solsToAirdrop?: number;
};

export const createCvg = (options: ConvergenceTestOptions = {}) => {
  const connection = new Connection(options.rpcEndpoint ?? RPC_ENDPOINT, {
    commitment: options.commitment ?? 'confirmed',
  });
  return Convergence.make(connection, { skipPreflight: options.skipPreflight });
};

// Default user is dao but could be maker or taker
export const createSdk = (user = 'dao'): Convergence => {
  const cvg = createCvg({ skipPreflight: true });
  return cvg.use(keypairIdentity(getUserKp(user)));
};

export const sellCoveredCall = async (cvg: Convergence, ctx: Ctx) => {
  const baseMint = await cvg
    .tokens()
    .findMintByAddress({ address: new PublicKey(ctx.baseMint) });
  const quoteMint = await cvg
    .tokens()
    .findMintByAddress({ address: new PublicKey(ctx.quoteMint) });

  const { optionMarketKey, optionMarket } = await initializeNewAmericanOption(
    cvg,
    createAmericanProgram(cvg),
    baseMint,
    quoteMint,
    toBigNumber(27_000),
    toBigNumber(1),
    3_600
  );

  const { rfq, response } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, baseMint, {
        amount: 1.0,
        side: Side.Bid,
      }),
      new PsyoptionsAmericanInstrument(
        cvg,
        baseMint,
        quoteMint,
        OptionType.CALL,
        optionMarket,
        optionMarketKey,
        {
          amount: 1,
          side: Side.Bid,
        }
      ),
    ],
    orderType: OrderType.Sell,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 0.0000001 },
    quoteAsset: new SpotInstrument(cvg, quoteMint).toQuoteAsset(),
  });

  return { rfq, response, optionMarket };
};

export const sellSpot = async (cvg: Convergence, ctx: Ctx, amount: 1.0) => {
  const baseMint = await cvg
    .tokens()
    .findMintByAddress({ address: new PublicKey(ctx.baseMint) });
  const quoteMint = await cvg
    .tokens()
    .findMintByAddress({ address: new PublicKey(ctx.quoteMint) });
  const { rfq, response } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, baseMint, {
        amount,
        side: Side.Bid,
      }),
    ],
    orderType: OrderType.Sell,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
    quoteAsset: new SpotInstrument(cvg, quoteMint).toQuoteAsset(),
  });
  return { rfq, response };
};

export const confirmBid = async (cvg: Convergence, rfq: Rfq, response: any) => {
  return await cvg.rfqs().confirmResponse({
    taker: cvg.rpc().getDefaultFeePayer(),
    rfq: rfq.address,
    response: response.address,
    side: Side.Bid,
  });
};

export const respondWithBid = async (cvg: Convergence, rfq: Rfq) => {
  return await cvg.rfqs().respond({
    maker: cvg.rpc().getDefaultFeePayer(),
    rfq: rfq.address,
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

/**
 *  PSYOPTIONS EUROPEAN
 */
export const createPriceFeed = async (
  oracleProgram: Program<Pyth>,
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

export const generatePk = async (): Promise<PublicKey> => {
  return await PublicKey.createWithSeed(PROGRAM_ID, uuidv4(), PROGRAM_ID);
};
