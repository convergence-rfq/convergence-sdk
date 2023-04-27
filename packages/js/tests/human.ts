import { OptionMarketWithKey } from '@mithraic-labs/psy-american';
import { Keypair } from '@solana/web3.js';
import { Program, web3 } from '@project-serum/anchor';

import { Pyth } from '../../validator/fixtures/programs/pseudo_pyth_idl';
import {
  Convergence,
  OrderType,
  OptionType,
  PsyoptionsAmericanInstrument,
  initializeNewAmericanOption,
  toBigNumber,
  SpotInstrument,
  createAmericanProgram,
  Side,
  Rfq,
  Response,
  createAmericanAccountsAndMintOptions,
} from '../src';
import { BASE_MINT_PK, QUOTE_MINT_PK } from './constants';

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
    orderType: fromHumanOrderType(orderType),
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 0.0000001 },
    quoteAsset: new SpotInstrument(cvg, quoteMint).toQuoteAsset(),
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
      new SpotInstrument(cvg, baseMint, {
        amount,
        side: Side.Bid,
      }),
    ],
    orderType: fromHumanOrderType(orderType),
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
    quoteAsset: new SpotInstrument(cvg, quoteMint).toQuoteAsset(),
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
