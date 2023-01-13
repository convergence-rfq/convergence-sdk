import test, { Test } from 'tape';
import spok from 'spok';
import { PublicKey, Keypair } from '@solana/web3.js';
import {
  SWITCHBOARD_BTC_ORACLE,
  SKIP_PREFLIGHT,
  convergenceCli,
  killStuckProcess,
  spokSamePubkey,
  initializeNewOptionMeta,
  setupAccounts,
} from '../helpers';
import { Convergence } from '@/Convergence';

import {
  Mint,
  token,
  Side,
  RiskCategory,
  SpotInstrument,
  OrderType,
  PsyoptionsEuropeanInstrument,
  OptionType,
  InstrumentType,
  Token,
  Signer,
  Rfq,
} from '@/index';

killStuckProcess();

let cvg: Convergence;

let usdcMint: Mint;
let btcMint: Mint;

let dao: Signer;
let finalisedRfq: Rfq;
// LxnEKWoRhZizxg4nZJG8zhjQhCLYxcTjvLp9ATDUqNS
let maker: Keypair;
// BDiiVDF1aLJsxV6BDnP3sSVkCEm9rBt7n1T1Auq1r4Ux
let taker: Keypair;

let makerUSDCWallet: Token;
let makerBTCWallet: Token;

let takerUSDCWallet: Token;
let takerBTCWallet: Token;

const WALLET_AMOUNT = 9_000_000_000_000;
const COLLATERAL_AMOUNT = 100_000_000_000;

test('[setup] it can create Convergence instance', async (t: Test) => {
  cvg = await convergenceCli(SKIP_PREFLIGHT);

  const context = await setupAccounts(cvg, WALLET_AMOUNT);
  maker = context.maker;
  taker = context.taker;
  usdcMint = context.usdcMint;
  btcMint = context.btcMint;
  makerUSDCWallet = context.makerUSDCWallet;
  makerBTCWallet = context.makerBTCWallet;
  takerUSDCWallet = context.takerUSDCWallet;
  takerBTCWallet = context.takerBTCWallet;

  dao = cvg.rpc().getDefaultFeePayer();

  spok(t, makerBTCWallet, {
    $topic: 'Wallet',
    model: 'token',
    ownerAddress: spokSamePubkey(maker.publicKey),
  });
  spok(t, takerBTCWallet, {
    $topic: 'Wallet',
    model: 'token',
    ownerAddress: spokSamePubkey(taker.publicKey),
  });
});

test('[protocolModule] it can initialize the protocol', async (t: Test) => {
  const { protocol } = await cvg.protocol().initialize({
    collateralMint: usdcMint.address,
  });
  const [protocolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('protocol')],
    cvg.programs().getRfq().address
  );
  spok(t, protocol, {
    $topic: 'Initialize Protocol',
    model: 'protocol',
    address: spokSamePubkey(protocolPda),
  });
});

test('[protocolModule] it can add the spot instrument', async () => {
  const validateDataAccountAmount = 1;
  const prepareToSettleAccountAmount = 7;
  const settleAccountAmount = 3;
  const revertPreparationAccountAmount = 3;
  const cleanUpAccountAmount = 4;
  const canBeUsedAsQuote = true;

  await cvg.protocol().addInstrument({
    authority: dao,
    instrumentProgram: cvg.programs().getSpotInstrument().address,
    canBeUsedAsQuote,
    validateDataAccountAmount,
    prepareToSettleAccountAmount,
    settleAccountAmount,
    revertPreparationAccountAmount,
    cleanUpAccountAmount,
  });
});

test('[protocolModule] it can add the PsyOptions European instrument', async () => {
  const validateDataAccountAmount = 2;
  const prepareToSettleAccountAmount = 7;
  const settleAccountAmount = 3;
  const revertPreparationAccountAmount = 3;
  const cleanUpAccountAmount = 4;
  const canBeUsedAsQuote = true;

  await cvg.protocol().addInstrument({
    authority: dao,
    instrumentProgram: cvg.programs().getPsyoptionsEuropeanInstrument().address,
    canBeUsedAsQuote,
    validateDataAccountAmount,
    prepareToSettleAccountAmount,
    settleAccountAmount,
    revertPreparationAccountAmount,
    cleanUpAccountAmount,
  });
});

test('[protocolModule] it can add the PsyOptions American instrument', async () => {
  const validateDataAccountAmount = 2;
  const prepareToSettleAccountAmount = 7;
  const settleAccountAmount = 3;
  const revertPreparationAccountAmount = 3;
  const cleanUpAccountAmount = 4;
  const canBeUsedAsQuote = true;

  await cvg.protocol().addInstrument({
    authority: dao,
    instrumentProgram: cvg.programs().getPsyoptionsAmericanInstrument().address,
    canBeUsedAsQuote,
    validateDataAccountAmount,
    prepareToSettleAccountAmount,
    settleAccountAmount,
    revertPreparationAccountAmount,
    cleanUpAccountAmount,
  });
});

test('[riskEngineModule] it can initialize the default risk engine config', async () => {
  await cvg.riskEngine().initializeConfig({});
});

test('[riskEngineModule] it can set spot and option instrument type', async () => {
  await cvg.riskEngine().setInstrumentType({
    instrumentProgram: cvg.programs().getSpotInstrument().address,
    instrumentType: InstrumentType.Spot,
  });
  await cvg.riskEngine().setInstrumentType({
    instrumentProgram: cvg.programs().getPsyoptionsAmericanInstrument().address,
    instrumentType: InstrumentType.Option,
  });
  await cvg.riskEngine().setInstrumentType({
    instrumentProgram: cvg.programs().getPsyoptionsEuropeanInstrument().address,
    instrumentType: InstrumentType.Option,
  });
});

test('[protocolModule] it can add a BTC base asset', async () => {
  await cvg.protocol().addBaseAsset({
    authority: dao,
    index: { value: 0 },
    ticker: 'BTC',
    riskCategory: RiskCategory.VeryLow,
    priceOracle: { __kind: 'Switchboard', address: SWITCHBOARD_BTC_ORACLE },
  });
});

test('[protocolModule] it can register BTC mint', async () => {
  await cvg.protocol().registerMint({
    baseAssetIndex: 0,
    mint: btcMint.address,
  });
});

test('[protocolModule] it can register USDC mint', async () => {
  await cvg.protocol().registerMint({
    mint: usdcMint.address,
  });
});

/*
 * COLLATERAL
 */

test('[collateralModule] it can initialize collateral', async (t: Test) => {
  const { collateral: takerCollateral } = await cvg
    .collateral()
    .initializeCollateral({
      user: taker,
    });
  const { collateral: makerCollateral } = await cvg
    .collateral()
    .initializeCollateral({
      user: maker,
    });

  const foundTakercollateral = await cvg
    .collateral()
    .findByAddress({ address: takerCollateral.address });
  spok(t, takerCollateral, {
    $topic: 'Initialize Collateral',
    model: 'collateral',
    address: spokSamePubkey(foundTakercollateral.address),
  });

  const foundMakercollateral = await cvg
    .collateral()
    .findByAddress({ address: makerCollateral.address });
  spok(t, makerCollateral, {
    $topic: 'Initialize Collateral',
    model: 'collateral',
    address: spokSamePubkey(foundMakercollateral.address),
  });
});

test('[collateralModule] it can fund collateral', async (t: Test) => {
  await cvg.collateral().fundCollateral({
    userTokens: takerUSDCWallet.address,
    user: taker,
    amount: COLLATERAL_AMOUNT,
  });
  await cvg.collateral().fundCollateral({
    userTokens: makerUSDCWallet.address,
    user: maker,
    amount: COLLATERAL_AMOUNT,
  });

  const protocol = await cvg.protocol().get();
  const rfqProgram = cvg.programs().getRfq();
  const [collateralTokenPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), taker.publicKey.toBuffer()],
    rfqProgram.address
  );
  const collateralMint = await cvg
    .tokens()
    .findMintByAddress({ address: protocol.collateralMint });
  const collateralTokenAccount = await cvg
    .tokens()
    .findTokenByAddress({ address: collateralTokenPda });

  spok(t, collateralTokenAccount, {
    $topic: 'Fund Collateral',
    model: 'token',
    mintAddress: spokSamePubkey(collateralMint.address),
    amount: token(COLLATERAL_AMOUNT),
  });
});

test('[collateralModule] it can withdraw collateral', async (t: Test) => {
  const amount = 10;
  await cvg.collateral().withdrawCollateral({
    userTokens: makerUSDCWallet.address,
    user: maker,
    amount,
  });

  const refreshedMakerUSDCWallet = await cvg
    .tokens()
    .refreshToken(makerUSDCWallet);
  const protocol = await cvg.protocol().get();
  const collateralMint = await cvg
    .tokens()
    .findMintByAddress({ address: protocol.collateralMint });

  spok(t, refreshedMakerUSDCWallet, {
    $topic: 'Withdraw Collateral',
    address: spokSamePubkey(makerUSDCWallet.address),
    mintAddress: spokSamePubkey(collateralMint.address),
    // TODO: Add back in
    //amount: token(COLLATERAL_AMOUNT - amount),
  });

  const rfqProgram = cvg.programs().getRfq();
  const [makerCollateral] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), maker.publicKey.toBuffer()],
    rfqProgram.address
  );
  const makerCollateralInfo = await cvg
    .tokens()
    .findTokenByAddress({ address: makerCollateral });

  spok(t, makerCollateralInfo, {
    $topic: 'Withdraw Collateral',
    address: spokSamePubkey(makerCollateral),
    mintAddress: spokSamePubkey(collateralMint.address),
    // TODO: Add back in
    //amount: token(COLLATERAL_AMOUNT - amount),
  });
});

/*
 * RFQ
 */

test('[rfqModule] it can create a RFQ', async (t: Test) => {
  const quoteAsset = cvg
    .instrument(new SpotInstrument(cvg, usdcMint))
    .toQuoteData();
  const { rfq } = await cvg.rfqs().create({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 1,
        side: Side.Bid,
      }),
    ],
    orderType: OrderType.Sell,
    taker,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
    quoteAsset,
  });
  const foundRfq = await cvg.rfqs().findByAddress({ address: rfq.address });

  spok(t, rfq, {
    $topic: 'Created RFQ',
    model: 'rfq',
    address: spokSamePubkey(foundRfq.address),
  });
});

test('[rfqModule] it can finalize RFQ construction and cancel RFQ', async () => {
  const quoteAsset = cvg
    .instrument(new SpotInstrument(cvg, usdcMint))
    .toQuoteData();
  const { rfq } = await cvg.rfqs().create({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 1,
        side: Side.Bid,
      }),
    ],
    taker,
    orderType: OrderType.Sell,
    fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
    quoteAsset,
    activeWindow: 5_000,
    settlingWindow: 1_000,
  });

  await cvg.rfqs().finalizeRfqConstruction({
    rfq: rfq.address,
    taker,
    baseAssetIndex: { value: 0 },
  });

  await cvg.rfqs().cancelRfq({
    rfq: rfq.address,
    taker,
  });
});

test('[rfqModule] it can create and finalize RFQ', async (t: Test) => {
  const quoteAsset = cvg
    .instrument(new SpotInstrument(cvg, usdcMint))
    .toQuoteData();
  const { rfq } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 1,
        side: Side.Bid,
      }),
      new SpotInstrument(cvg, btcMint, {
        amount: 2,
        side: Side.Bid,
      }),
      new SpotInstrument(cvg, btcMint, {
        amount: 5,
        side: Side.Bid,
      }),
    ],
    taker,
    orderType: OrderType.Sell,
    fixedSize: { __kind: 'None', padding: 0 },
    quoteAsset,
  });

  const foundRfq = await cvg.rfqs().findByAddress({ address: rfq.address });

  spok(t, rfq, {
    $topic: 'Created RFQ',
    model: 'rfq',
    address: spokSamePubkey(foundRfq.address),
  });
});

test('[rfqModule] it can find RFQs by addresses', async (t: Test) => {
  const spotInstrument = new SpotInstrument(cvg, btcMint, {
    amount: 1,
    side: Side.Bid,
  });
  const quoteAsset = cvg
    .instrument(new SpotInstrument(cvg, usdcMint))
    .toQuoteData();

  const { rfq: rfq1 } = await cvg.rfqs().create({
    instruments: [spotInstrument],
    orderType: OrderType.Sell,
    fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
    quoteAsset,
  });
  const { rfq: rfq2 } = await cvg.rfqs().create({
    instruments: [spotInstrument],
    orderType: OrderType.Sell,
    fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
    quoteAsset,
  });
  const { rfq: rfq3 } = await cvg.rfqs().create({
    instruments: [spotInstrument],
    orderType: OrderType.Sell,
    fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
    quoteAsset,
  });

  const [foundRfq1, foundRfq2, foundRfq3] = await cvg
    .rfqs()
    .findByAddresses({ addresses: [rfq1.address, rfq2.address, rfq3.address] });

  spok(t, rfq1, {
    $topic: 'Created RFQ',
    model: 'rfq',
    address: spokSamePubkey(foundRfq1.address),
  });
  spok(t, rfq2, {
    $topic: 'Created RFQ',
    model: 'rfq',
    address: spokSamePubkey(foundRfq2.address),
  });
  spok(t, rfq3, {
    $topic: 'Created RFQ',
    model: 'rfq',
    address: spokSamePubkey(foundRfq3.address),
  });
});

//test('[rfqModule] it can find RFQs by instrument', async () => {
//  const spotInstrument = new SpotInstrument(cvg, btcMint, {
//    amount: 0,
//    side: Side.Bid,
//  });
//  const rfqs = await cvg.rfqs().findByInstrument({
//    instrument: spotInstrument,
//  });
//  assert(rfqs.length > 0);
//spok(t, rfq3, {
//  $topic: 'Created RFQ',
//  model: 'rfq',
//  address: spokSamePubkey(foundRfq3.address),
//});
//});

//test('[rfqModule] it can find RFQs by owner', async () => {
//  const spotInstrumentClient = cvg.spotInstrument();
//  const spotInstrument = spotInstrumentClient.createInstrument(
//    btcMint.address,
//    btcMint.decimals,
//    Side.Bid,
//    1
//  );
//  const { rfq: rfq1 } = await cvg.rfqs().create({
//    instruments: [spotInstrument],
//    quoteAsset: usdcMint,
//  });
//  const { rfq: rfq2 } = await createRfq(cvg);
//  const [
//    foundRfq1,
//    // foundRfq2
//  ] = await cvg.rfqs().findAllByOwner({ owner: cvg.identity().publicKey });
//  spok(t, rfq1, {
//    $topic: 'Created RFQ',
//    model: 'rfq',
//    address: spokSamePubkey(foundRfq1.address),
//  });
//  spok(t, rfq2, {
//    $topic: 'Created RFQ',
//    model: 'rfq',
//    address: spokSamePubkey(foundRfq2.address),
//  });
//});

test('[psyoptionsEuropeanInstrumentModule] it can create an RFQ with the PsyOptions European instrument', async (t: Test) => {
  const { euroMeta, euroMetaKey } = await initializeNewOptionMeta(
    cvg,
    btcMint,
    usdcMint,
    17_500,
    1_000,
    3_600
  );

  const psyoptionsEuropeanInstrument = new PsyoptionsEuropeanInstrument(
    cvg,
    btcMint,
    OptionType.PUT,
    euroMeta,
    euroMetaKey,
    {
      amount: 1,
      side: Side.Bid,
    }
  );
  const quoteAsset = cvg
    .instrument(new SpotInstrument(cvg, usdcMint))
    .toQuoteData();

  const { rfq } = await cvg.rfqs().create({
    instruments: [psyoptionsEuropeanInstrument],
    orderType: OrderType.Sell,
    fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
    quoteAsset,
  });
  const foundRfq = await cvg.rfqs().findByAddress({ address: rfq.address });
  finalisedRfq = foundRfq;
  spok(t, rfq, {
    $topic: 'Created RFQ',
    model: 'rfq',
    address: spokSamePubkey(foundRfq.address),
  });
});

test('[riskEngineModule] it can calculate collateral for rfq', async (t: Test) => {
  const rfq = finalisedRfq;
  await cvg.riskEngine().calculateCollateralForRfq({ rfq: rfq.address });

  spok(t, rfq, {
    $topic: 'Calculated Collateral for Rfq',
    model: 'rfq',
    address: spokSamePubkey(rfq.address),
  });
});


