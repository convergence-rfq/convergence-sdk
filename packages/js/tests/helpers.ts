import { OptionMarketWithKey } from '@mithraic-labs/psy-american';
import { Commitment, Connection, Keypair } from '@solana/web3.js';

import { getKeypair, RPC_ENDPOINT, Ctx } from '../../validator';
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

// Default user is dao but could be maker, taker or mint_authority
export const createSdk = async (user = 'dao'): Promise<Convergence> => {
  const cvg = createCvg();
  return cvg.use(keypairIdentity(getKeypair(user)));
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
    toBigNumber(18_000),
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
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
    quoteAsset: new SpotInstrument(cvg, quoteMint).toQuoteAsset(),
  });

  return { rfq, response, optionMarket };
};

export const sellSpot = async (cvg: Convergence, ctx: Ctx) => {
  const baseMint = await cvg
    .tokens()
    .findMintByAddress({ address: new PublicKey(ctx.baseMint) });
  const quoteMint = await cvg
    .tokens()
    .findMintByAddress({ address: new PublicKey(ctx.quoteMint) });
  const { rfq, response } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, baseMint, {
        amount: 1.0,
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
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 1 },
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
    optionMarket,
    createAmericanProgram(cvg),
    1_000_000_000
  );
};
