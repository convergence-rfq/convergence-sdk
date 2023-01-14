import test, { Test } from 'tape';
import spok from 'spok';
import { Keypair } from '@solana/web3.js';
import {
  SWITCHBOARD_BTC_ORACLE,
  SWITCHBOARD_SOL_ORACLE,
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
  StoredResponseState,
  AuthoritySide,
  StoredRfqState,
} from '@/index';

killStuckProcess();

let cvg: Convergence;

let usdcMint: Mint;
let btcMint: Mint;
let solMint: Mint;

let dao: Signer;

let maker: Keypair; // LxnEKWoRhZizxg4nZJG8zhjQhCLYxcTjvLp9ATDUqNS
let taker: Keypair; // BDiiVDF1aLJsxV6BDnP3sSVkCEm9rBt7n1T1Auq1r4Ux

let makerUSDCWallet: Token;
let makerBTCWallet: Token;

let takerUSDCWallet: Token;
let takerBTCWallet: Token;
let takerSOLWallet: Token;

const WALLET_AMOUNT = 9_000_000_000_000;
const COLLATERAL_AMOUNT = 100_000_000_000;

// SETUP

test('[setup] it can create Convergence instance', async (t: Test) => {
  cvg = await convergenceCli(SKIP_PREFLIGHT);

  const context = await setupAccounts(cvg, WALLET_AMOUNT);
  maker = context.maker;
  taker = context.taker;
  usdcMint = context.usdcMint;
  btcMint = context.btcMint;
  solMint = context.solMint;
  makerUSDCWallet = context.makerUSDCWallet;
  makerBTCWallet = context.makerBTCWallet;
  takerUSDCWallet = context.takerUSDCWallet;
  takerBTCWallet = context.takerBTCWallet;
  takerSOLWallet = context.takerSOLWallet;

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
  spok(t, takerSOLWallet, {
    $topic: 'Wallet',
    model: 'token',
    ownerAddress: spokSamePubkey(taker.publicKey),
  });
});

// PROTOCOL

test('[protocolModule] it can initialize the protocol', async (t: Test) => {
  const { protocol } = await cvg.protocol().initialize({
    collateralMint: usdcMint.address,
  });
  spok(t, protocol, {
    $topic: 'Initialize Protocol',
    model: 'protocol',
    address: spokSamePubkey(cvg.protocol().pdas().protocol()),
  });
});

test('[protocolModule] it can add instruments', async () => {
  await cvg.protocol().addInstrument({
    authority: dao,
    instrumentProgram: cvg.programs().getSpotInstrument().address,
    canBeUsedAsQuote: true,
    validateDataAccountAmount: 1,
    prepareToSettleAccountAmount: 7,
    settleAccountAmount: 3,
    revertPreparationAccountAmount: 3,
    cleanUpAccountAmount: 4,
  });
  await cvg.protocol().addInstrument({
    authority: dao,
    instrumentProgram: cvg.programs().getPsyoptionsEuropeanInstrument().address,
    canBeUsedAsQuote: true,
    validateDataAccountAmount: 2,
    prepareToSettleAccountAmount: 7,
    settleAccountAmount: 3,
    revertPreparationAccountAmount: 3,
    cleanUpAccountAmount: 4,
  });
  await cvg.protocol().addInstrument({
    authority: dao,
    instrumentProgram: cvg.programs().getPsyoptionsAmericanInstrument().address,
    canBeUsedAsQuote: true,
    validateDataAccountAmount: 2,
    prepareToSettleAccountAmount: 7,
    settleAccountAmount: 3,
    revertPreparationAccountAmount: 3,
    cleanUpAccountAmount: 4,
  });
});

test('[protocolModule] it can add BTC and SOL base assets', async (t: Test) => {
  const { baseAsset: baseBTCAsset } = await cvg.protocol().addBaseAsset({
    authority: dao,
    index: { value: 0 },
    ticker: 'BTC',
    riskCategory: RiskCategory.VeryLow,
    priceOracle: { __kind: 'Switchboard', address: SWITCHBOARD_BTC_ORACLE },
  });
  spok(t, baseBTCAsset, {
    $topic: 'Add Base Asset',
    model: 'baseAsset',
    index: { value: 0 },
    ticker: 'BTC',
  });

  const { baseAsset: baseSOLAsset } = await cvg.protocol().addBaseAsset({
    authority: dao,
    index: { value: 1 },
    ticker: 'SOL',
    riskCategory: RiskCategory.VeryLow,
    priceOracle: { __kind: 'Switchboard', address: SWITCHBOARD_SOL_ORACLE },
  });
  spok(t, baseSOLAsset, {
    $topic: 'Add Base Asset',
    model: 'baseAsset',
    index: { value: 1 },
    ticker: 'SOL',
  });
});

test('[protocolModule] it can register mints', async (t: Test) => {
  const { registeredMint: btcRegisteredMint } = await cvg
    .protocol()
    .registerMint({
      baseAssetIndex: 0,
      mint: btcMint.address,
    });
  spok(t, btcRegisteredMint, {
    $topic: 'Register Mint',
    model: 'registeredMint',
    address: spokSamePubkey(btcRegisteredMint.address),
  });

  const { registeredMint: solRegisteredMint } = await cvg
    .protocol()
    .registerMint({
      baseAssetIndex: 1,
      mint: solMint.address,
    });
  spok(t, solRegisteredMint, {
    $topic: 'Register Mint',
    model: 'registeredMint',
    address: spokSamePubkey(solRegisteredMint.address),
  });

  const { registeredMint: usdcRegisteredMint } = await cvg
    .protocol()
    .registerMint({
      mint: usdcMint.address,
    });
  spok(t, usdcRegisteredMint, {
    $topic: 'Register Mint',
    model: 'registeredMint',
    address: spokSamePubkey(usdcRegisteredMint.address),
  });
});

// PROTOCOL UTILS

test('[protocolModule] it can get base assets', async (t: Test) => {
  const baseAssets = await cvg.protocol().getBaseAssets();
  spok(t, baseAssets[1], {
    $topic: 'Get Base Assets',
    model: 'baseAsset',
    index: {
      value: 0,
    },
    ticker: 'BTC',
    riskCategory: 0,
  });
  spok(t, baseAssets[0], {
    $topic: 'Get Base Assets',
    model: 'baseAsset',
    index: {
      value: 1,
    },
    ticker: 'SOL',
    riskCategory: 0,
  });
});

// RISK ENGINE

test('[riskEngineModule] it can initialize the default risk engine config', async () => {
  await cvg.riskEngine().initializeConfig();
});

test('[riskEngineModule] it can set spot, American and European option instrument types', async () => {
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

// COLLATERAL

test('[collateralModule] it can initialize collateral', async (t: Test) => {
  const { collateral: takerCollateral } = await cvg.collateral().initialize({
    user: taker,
  });
  const { collateral: makerCollateral } = await cvg.collateral().initialize({
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
  await cvg.collateral().fund({
    userTokens: takerUSDCWallet.address,
    user: taker,
    amount: COLLATERAL_AMOUNT,
  });
  await cvg.collateral().fund({
    userTokens: makerUSDCWallet.address,
    user: maker,
    amount: COLLATERAL_AMOUNT,
  });

  const takerCollateralTokenPda = cvg
    .collateral()
    .pdas()
    .collateralToken({ user: taker.publicKey });
  const makerCollateralTokenPda = cvg
    .collateral()
    .pdas()
    .collateralToken({ user: maker.publicKey });

  const protocol = await cvg.protocol().get();
  const collateralMint = await cvg
    .tokens()
    .findMintByAddress({ address: protocol.collateralMint });

  const takerCollateralTokenAccount = await cvg
    .tokens()
    .findTokenByAddress({ address: takerCollateralTokenPda });
  const makerCollateralTokenAccount = await cvg
    .tokens()
    .findTokenByAddress({ address: makerCollateralTokenPda });

  spok(t, takerCollateralTokenAccount, {
    $topic: 'Fund taker Collateral',
    model: 'token',
    mintAddress: spokSamePubkey(collateralMint.address),
    amount: token(COLLATERAL_AMOUNT),
  });
  spok(t, makerCollateralTokenAccount, {
    $topic: 'Fund maker Collateral',
    model: 'token',
    mintAddress: spokSamePubkey(collateralMint.address),
    amount: token(COLLATERAL_AMOUNT),
  });
});

test('[collateralModule] it can withdraw collateral', async (t: Test) => {
  const amount = 10;

  const protocol = await cvg.protocol().get();
  const collateralMint = await cvg
    .tokens()
    .findMintByAddress({ address: protocol.collateralMint });

  await cvg.collateral().withdraw({
    userTokens: takerUSDCWallet.address,
    user: taker,
    amount,
  });
  await cvg.collateral().withdraw({
    userTokens: makerUSDCWallet.address,
    user: maker,
    amount,
  });

  const refreshedTakerUSDCWallet = await cvg
    .tokens()
    .refreshToken(takerUSDCWallet);
  const refreshedMakerUSDCWallet = await cvg
    .tokens()
    .refreshToken(makerUSDCWallet);

  spok(t, refreshedTakerUSDCWallet, {
    $topic: 'Withdraw Collateral',
    address: spokSamePubkey(takerUSDCWallet.address),
    mintAddress: spokSamePubkey(collateralMint.address),
  });
  spok(t, refreshedMakerUSDCWallet, {
    $topic: 'Withdraw Collateral',
    address: spokSamePubkey(makerUSDCWallet.address),
    mintAddress: spokSamePubkey(collateralMint.address),
  });

  const makerCollateral = cvg
    .collateral()
    .pdas()
    .collateralToken({ user: maker.publicKey });
  const makerCollateralInfo = await cvg
    .tokens()
    .findTokenByAddress({ address: makerCollateral });

  spok(t, makerCollateralInfo, {
    $topic: 'Withdraw Collateral',
    address: spokSamePubkey(makerCollateral),
    mintAddress: spokSamePubkey(collateralMint.address),
  });
});

test('[collateralModule] it can find collateral by user', async (t: Test) => {
  const makerCollateral = await cvg.collateral().findByUser({
    user: maker.publicKey,
  });
  spok(t, makerCollateral, {
    $topic: 'Find Collateral by Owner',
    model: 'collateral',
    user: spokSamePubkey(maker.publicKey),
  });
  const takerCollateral = await cvg.collateral().findByUser({
    user: taker.publicKey,
  });
  spok(t, takerCollateral, {
    $topic: 'Find Collateral by Owner',
    model: 'collateral',
    address: spokSamePubkey(takerCollateral.address),
  });
});

// RFQ

test('[rfqModule] it can create an RFQ', async (t: Test) => {
  const { rfq } = await cvg.rfqs().create({
    taker,
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 1,
        side: Side.Bid,
      }),
    ],
    orderType: OrderType.Sell,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
    quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
  });

  const foundRfq = await cvg.rfqs().findRfqByAddress({ address: rfq.address });

  spok(t, rfq, {
    $topic: 'Created RFQ',
    model: 'rfq',
    address: spokSamePubkey(foundRfq.address),
  });
});

test('[rfqModule] it can finalize RFQ construction', async (t: Test) => {
  const { rfq } = await cvg.rfqs().create({
    quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 1,
        side: Side.Bid,
      }),
    ],
    orderType: OrderType.Sell,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
    activeWindow: 5_000,
    settlingWindow: 1_000,
    taker,
  });

  await cvg.rfqs().finalizeRfqConstruction({
    taker,
    rfq: rfq.address,
    baseAssetIndex: { value: 0 },
  });

  const refreshedRfq = await cvg.rfqs().refreshRfq(rfq);

  spok(t, rfq, {
    $topic: 'Finalized RFQ',
    model: 'rfq',
    address: spokSamePubkey(refreshedRfq.address),
  });
  spok(t, refreshedRfq, {
    $topic: 'Finalized RFQ',
    model: 'rfq',
    state: StoredRfqState.Active,
  });
});

test('[rfqModule] it can create and finalize RFQ', async (t: Test) => {
  //TODO: this rfq is returned from the createRfq ix, not finalizeRfqConstruction.
  // this means its `state` field != StoredRfqState.Active.
  // finalizeRfqConstruction (as well as createAndFinalize) should return the updated
  // Rfq with the correct StoredRfqState (which should be `Active`)
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
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
    quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
  });

  const refreshedRfq = await cvg.rfqs().refreshRfq(rfq);
  const foundRfq = await cvg.rfqs().findRfqByAddress({ address: rfq.address });

  spok(t, rfq, {
    $topic: 'Created RFQ',
    model: 'rfq',
    address: spokSamePubkey(foundRfq.address),
  });
  spok(t, refreshedRfq, {
    $topic: 'Created RFQ',
    model: 'rfq',
    state: StoredRfqState.Active,
  });
});

test('[rfqModule] it can create and finalize, then respond to RFQ and confirm response', async (t: Test) => {
  const { rfq } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 5,
        side: Side.Ask,
      }),
    ],
    taker,
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
    quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
  });
  const { rfqResponse } = await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
    },
    ask: null,
    keypair: Keypair.generate(),
  });

  const respondedToRfq = await cvg.rfqs().refreshRfq(rfq.address);

  spok(t, rfq, {
    $topic: 'Finalized Rfq',
    model: 'rfq',
    address: spokSamePubkey(respondedToRfq.address),
  });
  spok(t, rfqResponse, {
    $topic: 'Responded to Rfq',
    model: 'response',
    state: StoredResponseState.Active,
  });

  await cvg.rfqs().confirmResponse({
    taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    side: Side.Bid,
    overrideLegMultiplierBps: null,
  });

  const refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

  spok(t, refreshedResponse, {
    $topic: 'Responded to Rfq',
    model: 'response',
    state: StoredResponseState.SettlingPreparations,
  });
});

test('[rfqModule] it can finalize RFQ construction with quote asset and cancel RFQ', async (t: Test) => {
  const { rfq } = await cvg.rfqs().create({
    taker,
    quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 1,
        side: Side.Bid,
      }),
    ],
    orderType: OrderType.Sell,
    fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
    activeWindow: 5_000,
    settlingWindow: 1_000,
  });

  await cvg.rfqs().finalizeRfqConstruction({
    taker,
    rfq: rfq.address,
    baseAssetIndex: { value: 0 },
  });

  await cvg.rfqs().cancelRfq({
    taker,
    rfq: rfq.address,
  });

  const refreshedRfq = await cvg.rfqs().refreshRfq(rfq);

  spok(t, rfq, {
    $topic: 'Cancelled RFQ',
    model: 'rfq',
    address: spokSamePubkey(refreshedRfq.address),
  });
  spok(t, refreshedRfq, {
    $topic: 'Cancelled RFQ',
    model: 'rfq',
    state: StoredRfqState.Canceled,
  });
});

test('[rfqModule] it can prepare settlement', async (t: Test) => {
  const { rfq } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 5,
        side: Side.Ask,
      }),
    ],
    taker,
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
    quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
  });
  const { rfqResponse } = await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
    },
    ask: null,
    keypair: Keypair.generate(),
  });

  await cvg.rfqs().confirmResponse({
    taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    side: Side.Bid,
    overrideLegMultiplierBps: null,
  });

  //TODO: we have to pass the baseAssetMints manually
  //  we need a method with type (baseAssetIndex) -> Mint or MintPubkey
  //  then the baseAssetMints could be extracted from the rfq's legs
  await cvg.rfqs().prepareSettlement({
    caller: taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    side: AuthoritySide.Taker,
    legAmountToPrepare: 1,
    quoteMint: usdcMint,
    baseAssetMints: [btcMint],
  });

  await cvg.rfqs().prepareSettlement({
    caller: maker,
    rfq: rfq.address,
    response: rfqResponse.address,
    side: AuthoritySide.Maker,
    legAmountToPrepare: 1,
    quoteMint: usdcMint,
    baseAssetMints: [btcMint],
  });

  const refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

  spok(t, refreshedResponse, {
    $topic: 'Prepared Settlement',
    model: 'response',
    state: StoredResponseState.ReadyForSettling,
  });
});

// RFQ UTILS

test('[rfqModule] it can find RFQs by addresses', async (t: Test) => {
  const { rfq: rfq1 } = await cvg.rfqs().create({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 1,
        side: Side.Bid,
      }),
    ],
    orderType: OrderType.Sell,
    taker,
    fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
    quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
  });
  const { rfq: rfq2 } = await cvg.rfqs().create({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 1,
        side: Side.Bid,
      }),
    ],
    taker,
    orderType: OrderType.Sell,
    fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
    quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
  });
  const { rfq: rfq3 } = await cvg.rfqs().create({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 1,
        side: Side.Bid,
      }),
    ],
    orderType: OrderType.Sell,
    taker,
    fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
    quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
  });

  const [foundRfq1, foundRfq2, foundRfq3] = await cvg
    .rfqs()
    .findRfqsByAddresses({
      addresses: [rfq1.address, rfq2.address, rfq3.address],
    });

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

test('[rfqModule] it can find RFQs by instrument', async () => {
  await cvg.rfqs().findByInstrument({
    instrumentProgram: cvg.programs().getSpotInstrument(),
  });
  // TODO: Finish
});

test('[rfqModule] it can find RFQs by owner', async (t: Test) => {
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
    quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
  });

  const foundRfqs = await cvg.rfqs().findAllByOwner({ owner: taker.publicKey });

  spok(t, rfq, {
    $topic: 'Created RFQ',
    taker: spokSamePubkey(foundRfqs[0].taker),
  });
  spok(t, rfq, {
    $topic: 'Created RFQ',
    taker: spokSamePubkey(foundRfqs[1].taker),
  });
});

// RISK ENGINE UTILS

test('[riskEngineModule] it can calculate collateral for RFQ', async (t: Test) => {
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
    quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
  });

  await cvg.riskEngine().calculateCollateralForRfq({ rfq: rfq.address });

  spok(t, rfq, {
    $topic: 'Calculated Collateral for Rfq',
    model: 'rfq',
    address: spokSamePubkey(rfq.address),
  });
});

test('[riskEngineModule] it can calculate collateral for response', async (t: Test) => {
  const { rfq } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 5,
        side: Side.Ask,
      }),
    ],
    taker,
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
    quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
  });
  const { rfqResponse } = await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
    },
    ask: null,
    keypair: Keypair.generate(),
  });

  await cvg.riskEngine().calculateCollateralForResponse({
    rfq: rfq.address,
    response: rfqResponse.address,
  });
  spok(t, rfqResponse, {
    $topic: 'calculate collateral for response',
    model: 'response',
    address: spokSamePubkey(rfqResponse.address),
  });
});

test('[riskEngineModule] it can calculate collateral for confirm response', async (t: Test) => {
  const { rfq } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 5,
        side: Side.Ask,
      }),
    ],
    taker,
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
    quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
  });
  const { rfqResponse } = await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
    },
    ask: null,
    keypair: Keypair.generate(),
  });

  const respondedToRfq = await cvg.rfqs().refreshRfq(rfq.address);

  spok(t, rfq, {
    $topic: 'Finalized Rfq',
    model: 'rfq',
    address: spokSamePubkey(respondedToRfq.address),
  });
  spok(t, rfqResponse, {
    $topic: 'Responded to Rfq',
    model: 'response',
    state: StoredResponseState.Active,
  });

  await cvg.rfqs().confirmResponse({
    taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    side: Side.Bid,
    overrideLegMultiplierBps: null,
  });

  const refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);
  await cvg.riskEngine().calculateCollateralForConfirmation({
    rfq: rfq.address,
    response: refreshedResponse.address,
  });
});

// PSYOPTIONS EUROPEANS

test('[psyoptionsEuropeanInstrumentModule] it can create an RFQ with PsyOptions Europeans', async (t: Test) => {
  const { euroMeta, euroMetaKey } = await initializeNewOptionMeta(
    cvg,
    btcMint,
    usdcMint,
    17_500,
    1_000,
    3_600
  );

  const { rfq } = await cvg.rfqs().create({
    instruments: [
      new PsyoptionsEuropeanInstrument(
        cvg,
        btcMint,
        OptionType.PUT,
        euroMeta,
        euroMetaKey,
        {
          amount: 1,
          side: Side.Bid,
        }
      ),
    ],
    orderType: OrderType.Sell,
    fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
    quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
  });

  const foundRfq = await cvg.rfqs().findRfqByAddress({ address: rfq.address });

  spok(t, rfq, {
    $topic: 'Created RFQ',
    model: 'rfq',
    address: spokSamePubkey(foundRfq.address),
  });
});

// test('[rfqModule] it can add legs to  rfq', async (t: Test) => {
//   const rfq = finalisedRfq;
//   await cvg.rfqs().addLegsToRfq(taker,rfq,)

//   spok(t, rfq, {
//     $topic: 'Calculated Collateral for Rfq',
//     model: 'rfq',
//     address: spokSamePubkey(rfq.address),
//   });
// });
