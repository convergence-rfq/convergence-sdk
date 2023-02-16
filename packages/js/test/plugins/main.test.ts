import test, { Test } from 'tape';
import spok from 'spok';
import { Keypair, PublicKey } from '@solana/web3.js';
//@ts-ignore
import { sleep } from '@bundlr-network/client/build/common/utils';
import { OptionMarketWithKey } from '@mithraic-labs/psy-american';
//@ts-ignore
import * as anchor from '@project-serum/anchor';
//@ts-ignore
import { sha256 } from '@noble/hashes/sha256';
import { UnparsedAccount } from '@/index';
//@ts-ignore
import { bignum } from '@convergence-rfq/beet';
import {
  SWITCHBOARD_BTC_ORACLE,
  SWITCHBOARD_SOL_ORACLE,
  SKIP_PREFLIGHT,
  convergenceCli,
  killStuckProcess,
  //@ts-ignore
  spokSamePubkey,
  //@ts-ignore
  initializeNewOptionMeta,
  //@ts-ignore
  initializePsyoptionsAmerican,
  setupAccounts,
  //@ts-ignore
  BTC_DECIMALS,
  USDC_DECIMALS,
  assertInitRiskEngineConfig,
  //@ts-ignore
  delay,
} from '../helpers';
import { Convergence } from '@/Convergence';
//@ts-ignore
import {
  //@ts-ignore
  RfqGpaBuilder,
  //@ts-ignore
  ResponseGpaBuilder,
  //@ts-ignore
  toResponse,
  //@ts-ignore
  toResponseAccount,
  //@ts-ignore
  toRfq,
  //@ts-ignore
  toRfqAccount,
} from '@/index';
import {
  Mint,
  token,
  //@ts-ignore
  Side,
  RiskCategory,
  //@ts-ignore
  SpotInstrument,
  //@ts-ignore
  OrderType,
  //@ts-ignore
  PsyoptionsEuropeanInstrument,
  //@ts-ignore
  PsyoptionsAmericanInstrument,
  //@ts-ignore
  OptionType,
  InstrumentType,
  Token,
  //@ts-ignore
  StoredResponseState,
  //@ts-ignore
  AuthoritySide,
  //@ts-ignore
  StoredRfqState,
  //@ts-ignore
  legsToInstruments,
  Signer,
  DEFAULT_RISK_CATEGORIES_INFO,
  //@ts-ignore
  devnetAirdrops,
  //@ts-ignore
  DEFAULT_MINT_DECIMALS,
  //@ts-ignore
  DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ,
  //@ts-ignore
  DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ,
  //@ts-ignore
  LEG_MULTIPLIER_DECIMALS,
} from '@/index';
//@ts-ignore
import { Rfq } from '@/index';

killStuckProcess();

let cvg: Convergence;

let usdcMint: Mint;
let btcMint: Mint;
let solMint: Mint;
// let ethMint: Mint;

let dao: Signer;

let maker: Keypair; // LxnEKWoRhZizxg4nZJG8zhjQhCLYxcTjvLp9ATDUqNS
let taker: Keypair; // BDiiVDF1aLJsxV6BDnP3sSVkCEm9rBt7n1T1Auq1r4Ux
//@ts-ignore
let mintAuthority: Keypair;

let daoBTCWallet: Token;
let daoUSDCWallet: Token;

let makerUSDCWallet: Token;
let makerBTCWallet: Token;

let takerUSDCWallet: Token;
let takerBTCWallet: Token;
let takerSOLWallet: Token;

const SOL_WALLET_AMOUNT = 9_000;
const BTC_WALLET_AMOUNT = 9_000;
const USER_COLLATERAL_AMOUNT = 100_000_000;
const USER_USDC_WALLET = 10_000_000;
// const USER_COLLATERAL_AMOUNT_WITH_DECIMALS = new anchor.BN(
//   USER_COLLATERAL_AMOUNT
// ).muln(10 ** USDC_DECIMALS);

// SETUP
//@ts-ignore
let optionMarket: OptionMarketWithKey | null;
//@ts-ignore
let optionMarketPubkey: PublicKey;
//@ts-ignore
let europeanOptionPutMint: PublicKey;

test('[setup] it can create Convergence instance', async (t: Test) => {
  cvg = await convergenceCli(SKIP_PREFLIGHT);

  dao = cvg.rpc().getDefaultFeePayer();

  const context = await setupAccounts(
    cvg,
    BTC_WALLET_AMOUNT,
    SOL_WALLET_AMOUNT,
    USER_COLLATERAL_AMOUNT + USER_USDC_WALLET,
    dao.publicKey
  );
  maker = context.maker;
  taker = context.taker;

  usdcMint = context.usdcMint;
  btcMint = context.btcMint;
  solMint = context.solMint;

  daoUSDCWallet = context.daoUSDCWallet;

  daoBTCWallet = context.daoBTCWallet;

  makerUSDCWallet = context.makerUSDCWallet;
  makerBTCWallet = context.makerBTCWallet;

  takerUSDCWallet = context.takerUSDCWallet;
  takerBTCWallet = context.takerBTCWallet;
  takerSOLWallet = context.takerSOLWallet;

  mintAuthority = context.mintAuthority;

  t.same(
    daoBTCWallet.ownerAddress.toString(),
    dao.publicKey.toString(),
    'same owner'
  );
  spok(t, daoBTCWallet, {
    $topic: 'token model',
    model: 'token',
  });

  t.same(
    daoUSDCWallet.ownerAddress.toString(),
    dao.publicKey.toString(),
    'same owner'
  );
  spok(t, daoUSDCWallet, {
    $topic: 'token model',
    model: 'token',
  });

  t.same(
    makerBTCWallet.ownerAddress.toString(),
    maker.publicKey.toString(),
    'same owner'
  );
  spok(t, makerBTCWallet, {
    $topic: 'token model',
    model: 'token',
  });

  t.same(
    takerBTCWallet.ownerAddress.toString(),
    taker.publicKey.toString(),
    'same owner'
  );
  spok(t, takerBTCWallet, {
    $topic: 'token model',
    model: 'token',
  });

  t.same(
    takerSOLWallet.ownerAddress.toString(),
    taker.publicKey.toString(),
    'same owner'
  );
  spok(t, takerSOLWallet, {
    $topic: 'token model',
    model: 'token',
  });
});

// PROTOCOL

test('[protocolModule] it can initialize the protocol', async (t: Test) => {
  const { protocol } = await cvg.protocol().initialize({
    collateralMint: usdcMint.address,
  });
  t.same(
    cvg.protocol().pdas().protocol().toString(),
    protocol.address.toString(),
    'same address'
  );
  spok(t, protocol, {
    $topic: 'protocol model',
    model: 'protocol',
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
    $topic: 'baseAsset model',
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
    $topic: 'baseAsset model',
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
  t.same(
    btcRegisteredMint.mintAddress.toString(),
    btcMint.address.toString(),
    'same address'
  );
  spok(t, btcRegisteredMint, {
    $topic: 'registeredMint model',
    model: 'registeredMint',
  });

  const { registeredMint: solRegisteredMint } = await cvg
    .protocol()
    .registerMint({
      baseAssetIndex: 1,
      mint: solMint.address,
    });
  t.same(
    solRegisteredMint.mintAddress.toString(),
    solMint.address.toString(),
    'same address'
  );
  spok(t, solRegisteredMint, {
    $topic: 'registeredMint model',
    model: 'registeredMint',
  });

  const { registeredMint: usdcRegisteredMint } = await cvg
    .protocol()
    .registerMint({
      mint: usdcMint.address,
    });
  t.same(
    usdcRegisteredMint.mintAddress.toString(),
    usdcMint.address.toString(),
    'same address'
  );
  spok(t, usdcRegisteredMint, {
    $topic: 'registeredMint model',
    model: 'registeredMint',
  });
});

// PROTOCOL UTILS

test('[protocolModule] it can get base assets', async (t: Test) => {
  const baseAssets = await cvg.protocol().getBaseAssets();
  spok(t, baseAssets[0], {
    $topic: 'Get Base Assets',
    model: 'baseAsset',
    index: {
      value: 0,
    },
    ticker: 'BTC',
    riskCategory: 0,
  });
  spok(t, baseAssets[1], {
    $topic: 'Get Base Assets',
    model: 'baseAsset',
    index: {
      value: 1,
    },
    ticker: 'SOL',
    riskCategory: 0,
  });
});

test('[protocolModule] get registered mints', async (t: Test) => {
  const registeredMints = await cvg.protocol().getRegisteredMints();
  t.assert(registeredMints.length > 0);
});

// RISK ENGINE

test('[riskEngineModule] it can initialize the default risk engine config', async (t: Test) => {
  const output = await cvg
    .riskEngine()
    .initializeConfig({ collateralMintDecimals: USDC_DECIMALS });
  assertInitRiskEngineConfig(cvg, t, output);
});

test('[riskEngineModule] it can set instrument types', async (t: Test) => {
  const { response: response1 } = await cvg.riskEngine().setInstrumentType({
    instrumentProgram: cvg.programs().getSpotInstrument().address,
    instrumentType: InstrumentType.Spot,
  });
  t.assert(response1.signature.length > 0, 'signature present');

  const { response: response2 } = await cvg.riskEngine().setInstrumentType({
    instrumentProgram: cvg.programs().getPsyoptionsAmericanInstrument().address,
    instrumentType: InstrumentType.Option,
  });
  t.assert(response2.signature.length > 0, 'signature present');

  const { response: response3 } = await cvg.riskEngine().setInstrumentType({
    instrumentProgram: cvg.programs().getPsyoptionsEuropeanInstrument().address,
    instrumentType: InstrumentType.Option,
  });
  t.assert(response3.signature.length > 0, 'signature present');
});

test('[riskEngineModule] it can set risk categories info', async (t: Test) => {
  const { response: responseVeryLow } = await cvg
    .riskEngine()
    .setRiskCategoriesInfo({
      changes: [
        {
          newValue: DEFAULT_RISK_CATEGORIES_INFO.veryLow,
          riskCategoryIndex: RiskCategory.VeryLow,
        },
      ],
    });
  t.assert(responseVeryLow.signature.length > 0, 'signature present');

  const { response: responseLow } = await cvg
    .riskEngine()
    .setRiskCategoriesInfo({
      changes: [
        {
          newValue: DEFAULT_RISK_CATEGORIES_INFO.low,
          riskCategoryIndex: RiskCategory.Low,
        },
      ],
    });
  t.assert(responseLow.signature.length > 0, 'signature present');

  const { response: responseMedium } = await cvg
    .riskEngine()
    .setRiskCategoriesInfo({
      changes: [
        {
          newValue: DEFAULT_RISK_CATEGORIES_INFO.medium,
          riskCategoryIndex: RiskCategory.Medium,
        },
      ],
    });
  t.assert(responseMedium.signature.length > 0, 'signature present');

  const { response: responseHigh } = await cvg
    .riskEngine()
    .setRiskCategoriesInfo({
      changes: [
        {
          newValue: DEFAULT_RISK_CATEGORIES_INFO.high,
          riskCategoryIndex: RiskCategory.High,
        },
      ],
    });
  t.assert(responseHigh.signature.length > 0, 'signature present');

  const { response: responseVeryHigh } = await cvg
    .riskEngine()
    .setRiskCategoriesInfo({
      changes: [
        {
          newValue: DEFAULT_RISK_CATEGORIES_INFO.veryHigh,
          riskCategoryIndex: RiskCategory.VeryHigh,
        },
      ],
    });
  t.assert(responseVeryHigh.signature.length > 0, 'signature present');
});

// COLLATERAL

test('[collateralModule] it can initialize collateral', async (t: Test) => {
  const { collateral: takerCollateral } = await cvg.collateral().initialize({
    user: taker,
  });
  const { collateral: makerCollateral } = await cvg.collateral().initialize({
    user: maker,
  });
  const { collateral: daoCollateral } = await cvg.collateral().initialize({
    user: dao,
  });

  const foundTakercollateral = await cvg
    .collateral()
    .findByAddress({ address: takerCollateral.address });
  t.same(
    foundTakercollateral.address.toString(),
    takerCollateral.address.toString(),
    'same address'
  );
  spok(t, takerCollateral, {
    $topic: 'collateral model',
    model: 'collateral',
  });

  const foundMakercollateral = await cvg
    .collateral()
    .findByAddress({ address: makerCollateral.address });
  t.same(
    foundMakercollateral.address.toString(),
    makerCollateral.address.toString(),
    'same address'
  );
  spok(t, makerCollateral, {
    $topic: 'Initialize Collateral',
    model: 'collateral',
  });

  const foundDaocollateral = await cvg
    .collateral()
    .findByAddress({ address: daoCollateral.address });
  t.same(
    foundDaocollateral.address.toString(),
    daoCollateral.address.toString(),
    'same address'
  );
  spok(t, daoCollateral, {
    $topic: 'collateral model',
    model: 'collateral',
  });

  const tc = await cvg.collateral().findByUser({
    user: taker.publicKey,
  });
  console.log(
    '<initCollateral> taker collateral amount: ' +
      tc.lockedTokensAmount.basisPoints.toString()
  );
});

test('[collateralModule] it can fund collateral', async (t: Test) => {
  await cvg.collateral().fund({
    user: taker,
    amount: USER_COLLATERAL_AMOUNT,
  });
  await cvg.collateral().fund({
    user: maker,
    amount: USER_COLLATERAL_AMOUNT,
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

  t.same(
    takerCollateralTokenAccount.mintAddress.toString(),
    collateralMint.address.toString(),
    'same address'
  );
  spok(t, takerCollateralTokenAccount, {
    $topic: 'collateral model',
    model: 'token',
    amount: token(USER_COLLATERAL_AMOUNT * 10 ** USDC_DECIMALS),
  });

  t.same(
    makerCollateralTokenAccount.mintAddress.toString(),
    collateralMint.address.toString(),
    'same address'
  );
  spok(t, makerCollateralTokenAccount, {
    $topic: 'collateral model',
    model: 'token',
    amount: token(USER_COLLATERAL_AMOUNT * 10 ** USDC_DECIMALS),
  });

  const takerCollateral = await cvg.collateral().findByUser({
    user: taker.publicKey,
  });
  console.log(
    '<fundCollateral> taker collateral amount: ' +
      takerCollateral.lockedTokensAmount.basisPoints.toString()
  );
});

test('[collateralModule] it can withdraw collateral', async (t: Test) => {
  const amount = 10;

  const protocol = await cvg.protocol().get();
  const collateralMint = await cvg
    .tokens()
    .findMintByAddress({ address: protocol.collateralMint });

  await cvg.collateral().withdraw({
    user: taker,
    amount,
  });
  await cvg.collateral().withdraw({
    user: maker,
    amount,
  });

  const refreshedTakerUSDCWallet = await cvg
    .tokens()
    .refreshToken(takerUSDCWallet);
  const refreshedMakerUSDCWallet = await cvg
    .tokens()
    .refreshToken(makerUSDCWallet);

  t.same(
    takerUSDCWallet.mintAddress.toString(),
    collateralMint.address.toString(),
    'same address'
  );
  spok(t, refreshedTakerUSDCWallet, {
    $topic: 'same model',
    model: 'token',
  });

  t.same(
    makerUSDCWallet.mintAddress.toString(),
    collateralMint.address.toString(),
    'same address'
  );
  spok(t, refreshedMakerUSDCWallet, {
    $topic: 'same model',
    model: 'token',
  });

  const makerCollateral = cvg
    .collateral()
    .pdas()
    .collateralToken({ user: maker.publicKey });
  const makerCollateralInfo = await cvg
    .tokens()
    .findTokenByAddress({ address: makerCollateral });
  const takerCollateralInfo = await cvg
    .tokens()
    .findTokenByAddress({ address: makerCollateral });

  t.same(
    makerCollateralInfo.mintAddress.toString(),
    collateralMint.address.toString(),
    'same address'
  );
  spok(t, makerCollateralInfo, {
    $topic: 'same model',
    model: 'token',
  });

  t.same(
    takerCollateralInfo.mintAddress.toString(),
    collateralMint.address.toString(),
    'same address'
  );
  spok(t, takerCollateralInfo, {
    $topic: 'same model',
    model: 'token',
  });

  const takerCollateral = await cvg.collateral().findByUser({
    user: taker.publicKey,
  });
  console.log(
    '<withdrawCollateral> taker collateral amount: ' +
      takerCollateral.lockedTokensAmount.basisPoints.toString()
  );
});

test('[collateralModule] it can find collateral by user', async (t: Test) => {
  const makerCollateral = await cvg.collateral().findByUser({
    user: maker.publicKey,
  });
  t.same(
    makerCollateral.user.toString(),
    maker.publicKey.toString(),
    'same address'
  );
  spok(t, makerCollateral, {
    $topic: 'same model',
    model: 'collateral',
  });

  console.log(
    'maker collateral amount: ' +
      makerCollateral.lockedTokensAmount.basisPoints.toString()
  );

  const takerCollateral = await cvg.collateral().findByUser({
    user: taker.publicKey,
  });
  t.same(
    takerCollateral.user.toString(),
    taker.publicKey.toString(),
    'same address'
  );
  spok(t, takerCollateral, {
    $topic: 'same model',
    model: 'collateral',
  });

  console.log(
    'taker collateral amount: ' +
      takerCollateral.lockedTokensAmount.basisPoints.toString()
  );
});

// RFQ

test('[rfqModule] it can create and finalize RFQ, cancel RFQ, unlock RFQ collateral, and clean up RFQ', async (t: Test) => {
  const { rfq } = await cvg.rfqs().create({
    taker,
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000001,
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
  });

  await cvg.rfqs().cancelRfq({
    taker,
    rfq: rfq.address,
  });

  let refreshedRfq = await cvg.rfqs().refreshRfq(rfq);

  spok(t, refreshedRfq, {
    $topic: 'Cancelled RFQ',
    model: 'rfq',
    state: StoredRfqState.Canceled,
  });

  await cvg.rfqs().unlockRfqCollateral({
    rfq: rfq.address,
  });

  refreshedRfq = await cvg.rfqs().refreshRfq(rfq);

  t.same(
    refreshedRfq.nonResponseTakerCollateralLocked.toString(),
    '0',
    'Expected 0 locked taker collateral'
  );

  await cvg.rfqs().cleanUpRfq({
    rfq: rfq.address,
    taker: taker.publicKey,
  });
});

test('[rfqModule] it can create and finalize RFQ, respond, confirm response, prepare settlement, prepare more legs settlement, partially settle legs, settle', async (t: Test) => {
  const { rfq } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000005,
        side: Side.Bid,
      }),
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000005,
        side: Side.Ask,
      }),
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000002,
        side: Side.Ask,
      }),
    ],
    taker,
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
  });

  const { rfqResponse } = await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.000001 },
    },
  });

  await cvg.rfqs().confirmResponse({
    taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    side: Side.Bid,
  });

  await cvg.rfqs().prepareSettlement({
    caller: taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    legAmountToPrepare: 2,
  });

  await cvg.rfqs().prepareSettlement({
    caller: maker,
    rfq: rfq.address,
    response: rfqResponse.address,
    legAmountToPrepare: 2,
  });

  await cvg.rfqs().prepareMoreLegsSettlement({
    caller: taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    legAmountToPrepare: 1,
  });

  await cvg.rfqs().prepareMoreLegsSettlement({
    caller: maker,
    rfq: rfq.address,
    response: rfqResponse.address,
    legAmountToPrepare: 1,
  });

  let refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

  spok(t, refreshedResponse, {
    $topic: 'Prepared Settlement',
    model: 'response',
    state: StoredResponseState.ReadyForSettling,
  });

  await cvg.rfqs().partiallySettleLegs({
    rfq: rfq.address,
    response: rfqResponse.address,
    maker: maker.publicKey,
    taker: taker.publicKey,
    legAmountToSettle: 1,
  });

  await cvg.rfqs().settle({
    maker: maker.publicKey,
    taker: taker.publicKey,
    rfq: rfq.address,
    response: rfqResponse.address,
  });

  refreshedResponse = await cvg.rfqs().refreshResponse(refreshedResponse);

  spok(t, refreshedResponse, {
    $topic: 'Settled',
    model: 'response',
    state: StoredResponseState.Settled,
  });
});

// // RFQ UTILS

test('[rfqModule] it can find RFQs by addresses', async (t: Test) => {
  const { rfq: rfq1 } = await cvg.rfqs().create({
    taker,
    instruments: [
      new SpotInstrument(cvg, solMint, {
        amount: 0.000000002,
        side: Side.Bid,
      }),
    ],
    orderType: OrderType.Sell,
    fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
  });

  const { rfq: rfq2 } = await cvg.rfqs().create({
    taker,
    instruments: [
      new SpotInstrument(cvg, solMint, {
        amount: 0.000000006,
        side: Side.Bid,
      }),
    ],
    orderType: OrderType.Sell,
    fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
  });

  const { rfq: rfq3 } = await cvg.rfqs().create({
    taker,
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000009,
        side: Side.Ask,
      }),
    ],
    orderType: OrderType.Sell,
    fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
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

// test('[rfqModule] it can find RFQs by instrument', async (t: Test) => {
//   const instruments = await cvg.rfqs().findByInstrument({
//     instrumentProgram: cvg.programs().getSpotInstrument(),
//   });
//   t.assert(instruments.length > 0, 'instruments present');
// });

test('[rfqModule] it can find RFQs by owner', async (t: Test) => {
  const foundRfqs = await cvg.rfqs().findAllByOwner({ owner: taker.publicKey });

  // const newFoundRfqs = await cvg
  //   .rfqs()
  //   .findAllByOwner({ owner: taker.publicKey, rfqs: foundRfqs });

  // for (const newFoundRfq of newFoundRfqs) {
  //   console.log('<> new found rfq: ' + newFoundRfq.address.toBase58());
  // }

  for (const foundRfq of foundRfqs) {
    if (foundRfq instanceof Array) {
      for (const rfq of foundRfq) {
        console.log('<inner page> rfq address: ' + rfq.address.toBase58());
      }
    } else {
      console.log('<flat page> rfq address: ' + foundRfq.address.toBase58());
    }
  }

  console.log('number of pages: ' + foundRfqs.length.toString());
});

// RISK ENGINE UTILS

function removeCollateralDecimals(value: bignum): number {
  return Number(value) / 10 ** USDC_DECIMALS;
}

test('[riskEngineModule] it can calculate collateral for variable size RFQ creation', async (t: Test) => {
  const { rfq } = await cvg.rfqs().create({
    taker,
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000009,
        side: Side.Ask,
      }),
    ],
    orderType: OrderType.Sell,
    fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
  });
  const legs = [
    await SpotInstrument.createForLeg(cvg, btcMint, 5, Side.Bid).toLegData(),
  ];

  const riskOutput = await cvg.riskEngine().calculateCollateralForRfq({
    fixedSize: { __kind: 'None', padding: 0 },
    orderType: OrderType.TwoWay,
    legs,
    settlementPeriod: 100,
  });

  await cvg.rfqs().finalizeRfqConstruction({
    taker,
    rfq: rfq.address,
  });

  spok(t, riskOutput, {
    $topic: 'Calculated Collateral for variable size Rfq',
    requiredCollateral: removeCollateralDecimals(
      DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ
    ),
  });

  // const { collateralForRfqAmount } = await cvg
  //   .riskEngine()
  //   .calculateCollateralForRfq({ rfq: rfq.address });

  // t.assert(
  //   collateralForRfqAmount > 0,
  //   'expected collateral for Rfq to be greater than 0.'
  // );
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
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
  });
  //@ts-ignore
  const { rfqResponse } = await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
    },
  });
});

test('[riskEngineModule] it can calculate collateral for fixed quote size RFQ creation', async (t: Test) => {
  const legs = [
    await SpotInstrument.createForLeg(cvg, btcMint, 5, Side.Bid).toLegData(),
  ];

  const riskOutput = await cvg.riskEngine().calculateCollateralForRfq({
    fixedSize: {
      __kind: 'QuoteAsset',
      quoteAmount: 100 * 10 ** USDC_DECIMALS,
    },
    orderType: OrderType.TwoWay,
    legs,
    settlementPeriod: 100,
  });

  spok(t, riskOutput, {
    $topic: 'Calculated Collateral for fixed quote size Rfq',
    requiredCollateral: removeCollateralDecimals(
      DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ
    ),
  });
});

test('[riskEngineModule] it can calculate collateral for fixed base size RFQ creation', async (t: Test) => {
  const legs = [
    await SpotInstrument.createForLeg(
      cvg,
      btcMint,
      5 * 10 ** BTC_DECIMALS,
      Side.Bid
    ).toLegData(),
  ];

  const riskOutput = await cvg.riskEngine().calculateCollateralForRfq({
    fixedSize: {
      __kind: 'BaseAsset',
      legsMultiplierBps: 2 * 10 ** LEG_MULTIPLIER_DECIMALS, // 2 multiplier of 5 bitcoins, so 10 bitcoins in total
    },
    orderType: OrderType.TwoWay,
    legs,
    settlementPeriod: 5 * 60 * 60, // 5 hours
  });

  spok(t, riskOutput, {
    $topic: 'Calculated Collateral for fixed quote size Rfq',
    requiredCollateral: 19800,
  });
});

// // PSYOPTIONS EUROPEANS
test('[riskEngineModule] it can calculate collateral for a response to an Rfq', async (t: Test) => {
  // variable size rfq for btc
  const { rfq } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 1,
        side: Side.Bid,
      }),
    ],
    taker,
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'None', padding: 0 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
    settlingWindow: 30 * 60 * 60, // 30 hours
  });

  const riskOutput = await cvg.riskEngine().calculateCollateralForResponse({
    rfqAddress: rfq.address,
    bid: {
      __kind: 'Standard',
      priceQuote: {
        __kind: 'AbsolutePrice',
        amountBps: 22_000,
      },
      legsMultiplierBps: 20,
    },
    ask: {
      __kind: 'Standard',
      priceQuote: {
        __kind: 'AbsolutePrice',
        amountBps: 23_000,
      },
      legsMultiplierBps: 5,
    },
  });

  spok(t, riskOutput, {
    $topic: 'Calculated Collateral for response to an Rfq',
    requiredCollateral: spok.range(92399, 92400),
  });
});

test('[riskEngineModule] it can calculate collateral for a confirmation of the Rfq', async (t: Test) => {
  // variable size rfq for btc
  const { rfq } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        // amount: 1 * 10 ** BTC_DECIMALS,
        amount: 1,
        side: Side.Bid,
      }),
    ],
    taker,
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'None', padding: 0 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
    settlingWindow: 60 * 60 * 60, // 60 hours
  });

  const { rfqResponse } = await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    bid: {
      __kind: 'Standard',
      priceQuote: {
        __kind: 'AbsolutePrice',
        // amountBps: 22_000 * 10 ** USDC_DECIMALS,
        amountBps: 22_000,
      },
      // legsMultiplierBps: 20 * 10 ** LEG_MULTIPLIER_DECIMALS,
      legsMultiplierBps: 20,
    },
    ask: {
      __kind: 'Standard',
      priceQuote: {
        __kind: 'AbsolutePrice',
        // amountBps: 23_000 * 10 ** USDC_DECIMALS,
        amountBps: 23_000,
      },
      legsMultiplierBps: 5,
    },
  });

  const riskOutput = await cvg.riskEngine().calculateCollateralForConfirmation({
    rfqAddress: rfq.address,
    responseAddress: rfqResponse.address,
    confirmation: {
      side: Side.Bid,
      overrideLegMultiplierBps: 3,
    },
  });

  spok(t, riskOutput, {
    $topic: 'Calculated Collateral for a confirmation of the Rfq',
    requiredCollateral: spok.range(20459.9999, 20460.0001),
  });
});

// PSYOPTIONS EUROPEANS

test('[psyoptionsEuropeanInstrumentModule] it can create and finalize RFQ w/ PsyOptions Euro, respond, confirm, prepare, settle', async (t: Test) => {
  const { euroMeta, euroMetaKey } = await initializeNewOptionMeta(
    cvg,
    btcMint,
    usdcMint,
    17_500 * 10 ** USDC_DECIMALS,
    1 * 10 ** BTC_DECIMALS,
    3_600
  );
  europeanOptionPutMint = euroMeta.putOptionMint;

  const instrument1 = new PsyoptionsEuropeanInstrument(
    cvg,
    btcMint,
    OptionType.PUT,
    euroMeta,
    euroMetaKey,
    {
      amount: 0.000000001,
      side: Side.Bid,
    }
  );
  const instrument2 = new SpotInstrument(cvg, btcMint, {
    amount: 0.000000005,
    side: Side.Ask,
  });
  const instrument3 = new SpotInstrument(cvg, btcMint, {
    amount: 0.000000011,
    side: Side.Bid,
  });

  const { rfq } = await cvg.rfqs().create({
    taker,
    instruments: [instrument1, instrument2, instrument3],
    orderType: OrderType.Sell,
    fixedSize: { __kind: 'QuoteAsset', quoteAmount: 0.000000001 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
    activeWindow: 5_000,
    settlingWindow: 1_000,
  });

  await cvg.rfqs().finalizeRfqConstruction({
    rfq: rfq.address,
    taker,
  });

  const { rfqResponse } = await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
    },
  });

  await cvg.rfqs().confirmResponse({
    taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    side: Side.Bid,
  });

  await cvg.rfqs().prepareSettlement({
    caller: taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    legAmountToPrepare: 3,
  });

  await cvg.rfqs().prepareSettlement({
    caller: maker,
    rfq: rfq.address,
    response: rfqResponse.address,
    legAmountToPrepare: 3,
  });

  await cvg.rfqs().settle({
    maker: maker.publicKey,
    taker: taker.publicKey,
    rfq: rfq.address,
    response: rfqResponse.address,
  });

  const foundRfq = await cvg.rfqs().findRfqByAddress({ address: rfq.address });
  t.same(foundRfq.address.toString(), rfq.address.toString(), 'same address');
  spok(t, rfq, {
    $topic: 'rfq model',
    model: 'rfq',
  });

  const refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

  spok(t, refreshedResponse, {
    $topic: 'Settled',
    model: 'response',
    state: StoredResponseState.Settled,
  });
});

test('[rfqModule] it can create/finalize Rfq, respond, confirm resp, prepare settlemt, settle, unlock resp collat, clean up response legs, clean up response', async (t: Test) => {
  const { rfq } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000005,
        side: Side.Bid,
      }),
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000003,
        side: Side.Ask,
      }),
    ],
    taker,
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
    activeWindow: 5_000,
    settlingWindow: 1_000,
  });
  const { rfqResponse } = await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.000001 },
    },
  });

  await cvg.rfqs().confirmResponse({
    taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    side: Side.Bid,
  });

  await cvg.rfqs().prepareSettlement({
    caller: taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    legAmountToPrepare: 2,
  });
  const firstToPrepare = taker.publicKey;

  await cvg.rfqs().prepareSettlement({
    caller: maker,
    rfq: rfq.address,
    response: rfqResponse.address,
    legAmountToPrepare: 2,
  });

  let refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

  await cvg.rfqs().settle({
    maker: maker.publicKey,
    taker: taker.publicKey,
    rfq: rfq.address,
    response: rfqResponse.address,
  });

  refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

  spok(t, refreshedResponse, {
    $topic: 'Settled',
    model: 'response',
    state: StoredResponseState.Settled,
  });

  await cvg.rfqs().unlockResponseCollateral({
    response: rfqResponse.address,
  });

  await cvg.rfqs().cleanUpResponseLegs({
    dao: dao.publicKey,
    rfq: rfq.address,
    response: rfqResponse.address,
    firstToPrepare,
    legAmountToClear: 1,
  });

  await cvg.rfqs().cleanUpResponse({
    maker: maker.publicKey,
    dao: dao.publicKey,
    rfq: rfq.address,
    response: rfqResponse.address,
    firstToPrepare,
  });

  const refreshedRfq = await cvg.rfqs().refreshRfq(rfq);

  t.assert(
    refreshedRfq.clearedResponses == 1,
    'expected there to be 1 cleared response'
  );
});

test('[rfqModule] it can create and finalize Rfq (BaseAsset), respond, and cancel response', async (t: Test) => {
  const { rfq } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000005,
        side: Side.Bid,
      }),
    ],
    taker,
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
  });
  const { rfqResponse } = await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.000001 },
    },
  });

  await cvg.rfqs().cancelResponse({
    maker,
    rfq: rfq.address,
    response: rfqResponse.address,
  });

  const refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

  spok(t, refreshedResponse, {
    $topic: 'Cancelled response',
    model: 'response',
    state: StoredResponseState.Canceled,
  });
});

//TODO: add helper method to get number of base asset from response
test('**[rfqModule] it can create and finalize Rfq (QuoteAsset), respond, and cancel response', async (t: Test) => {
  const { rfq } = await cvg.rfqs().createAndFinalize({
    taker,
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000005,
        side: Side.Bid,
      }),
    ],
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'QuoteAsset', quoteAmount: 0.0000001 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
  });
  const { rfqResponse } = await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.000001 },
    },
    ask: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.000001 },
    },
  });

  await cvg.rfqs().confirmResponse({
    taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    side: Side.Bid,
  });

  await cvg.rfqs().prepareSettlement({
    caller: maker,
    rfq: rfq.address,
    response: rfqResponse.address,
    legAmountToPrepare: 1,
  });
  await cvg.rfqs().prepareSettlement({
    caller: taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    legAmountToPrepare: 1,
  });

  await cvg.rfqs().settle({
    maker: maker.publicKey,
    taker: taker.publicKey,
    rfq: rfq.address,
    response: rfqResponse.address,
  });
});

//TODO: add helper method to get number of base asset from response
test('**[rfqModule] it can create and finalize open RFQ, then respond w/ base quantity', async (t: Test) => {
  const { rfq } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000005,
        side: Side.Bid,
      }),
    ],
    taker,
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'None', padding: 0 },
    quoteAsset: new SpotInstrument(cvg, usdcMint).toQuoteAsset(),
  });
  //@ts-ignore
  const { rfqResponse } = await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    bid: {
      __kind: 'Standard',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.000001 },
      legsMultiplierBps: 0.001,
    },
    ask: {
      __kind: 'Standard',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.000001 },
      legsMultiplierBps: 0.001,
    },
  });
});

test('[riskEngineModule] it can calculate collateral for confirm response', async (t: Test) => {
  const { rfq } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000005,
        side: Side.Ask,
      }),
    ],
    taker,
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
    activeWindow: 5_000,
    settlingWindow: 1_000,
  });

  const { rfqResponse } = await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.000001 },
    },
  });

  const respondedToRfq = await cvg.rfqs().refreshRfq(rfq.address);
  t.same(
    rfq.address.toString(),
    respondedToRfq.address.toString(),
    'same address'
  );
  spok(t, rfq, {
    $topic: 'rfq model',
    model: 'rfq',
  });
  spok(t, rfqResponse, {
    $topic: 'rfq model',
    model: 'response',
    state: StoredResponseState.Active,
  });

  await cvg.rfqs().confirmResponse({
    taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    side: Side.Bid,
  });

  // TODO: Finish

  // await cvg.riskEngine().calculateCollateralForConfirmation({
  //   rfqAddress: rfq.address,
  //   responseAddress: rfqResponse.address,
  //   //@ts-ignore
  //   confirmation: rfqResponse.confirmed,
  // });
});

test('[psyoptionsAmericanInstrumentModule] it can mint options to taker', async () => {
  const { op, optionMarketKey } = await initializePsyoptionsAmerican(
    cvg,
    btcMint,
    usdcMint,
    taker,
    maker,
    new anchor.BN(100),
    new anchor.BN(1),
    3_600
  );

  optionMarket = op;
  optionMarketPubkey = optionMarketKey;
});

test('[psyoptionsAmericanInstrumentModule] it can create an RFQ with PsyOptions American, respond, confirm response, prepare settlement, settle', async (t: Test) => {
  const { rfq, response } = await cvg.rfqs().createAndFinalize({
    taker,
    instruments: [
      new PsyoptionsAmericanInstrument(
        cvg,
        btcMint,
        OptionType.CALL,
        optionMarket as OptionMarketWithKey,
        optionMarketPubkey,
        {
          amount: 0.000000001,
          side: Side.Bid,
        }
      ),
    ],
    orderType: OrderType.Sell,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
  });
  t.assert(response.signature.length > 0, 'signature present');

  const { rfqResponse } = await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 1 },
    },
  });

  await cvg.rfqs().confirmResponse({
    taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    side: Side.Bid,
  });

  await cvg.rfqs().prepareSettlement({
    caller: taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    legAmountToPrepare: 1,
  });

  await cvg.rfqs().prepareSettlement({
    caller: maker,
    rfq: rfq.address,
    response: rfqResponse.address,
    legAmountToPrepare: 1,
  });

  await cvg.rfqs().settle({
    taker: taker.publicKey,
    maker: maker.publicKey,
    rfq: rfq.address,
    response: rfqResponse.address,
  });
});

test('[rfqModule] it can add legs to rfq', async (t: Test) => {
  const instruments: (
    | SpotInstrument
    | PsyoptionsEuropeanInstrument
    | PsyoptionsAmericanInstrument
  )[] = [];

  instruments.push(
    new SpotInstrument(cvg, solMint, {
      amount: 0.000000006,
      side: Side.Ask,
    })
  );
  instruments.push(
    new SpotInstrument(cvg, btcMint, {
      amount: 0.00000001,
      side: Side.Ask,
    })
  );
  instruments.push(
    new SpotInstrument(cvg, btcMint, {
      amount: 0.000000009,
      side: Side.Bid,
    })
  );

  let expLegSize = 4;

  const serializedLegsData: Buffer[] = [];

  for (const instrument of instruments) {
    const instrumentClient = cvg.instrument(instrument, instrument.legInfo);
    expLegSize += await instrumentClient.getLegDataSize();

    const leg = await instrumentClient.toLegData();

    serializedLegsData.push(instrumentClient.serializeLegData(leg));
  }

  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeInt32LE(instruments.length);
  const fullLegDataBuffer = Buffer.concat([
    lengthBuffer,
    ...serializedLegsData,
  ]);

  const expectedLegsHash = sha256(fullLegDataBuffer);

  const { rfq } = await cvg.rfqs().create({
    taker,
    instruments: [
      new SpotInstrument(cvg, solMint, {
        amount: 0.000000006,
        side: Side.Ask,
      }),
    ],
    legSize: expLegSize,
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
    expectedLegsHash,
  });

  await cvg.rfqs().addLegsToRfq({
    taker,
    rfq: rfq.address,
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 0.00000001,
        side: Side.Ask,
      }),
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000009,
        side: Side.Bid,
      }),
    ],
  });

  spok(t, rfq, {
    $topic: 'Added legs to Rfq',
    model: 'rfq',
    address: spokSamePubkey(rfq.address),
  });

  await cvg.rfqs().finalizeRfqConstruction({
    taker,
    rfq: rfq.address,
  });
});

// RFQ HELPERS

// test('[rfqModule] it can convert RFQ legs to instruments', async (t: Test) => {
//   // We can to this after creating options so that we can test this method
//   // on all instruments
//   const rfqs = await cvg.rfqs().findAllByOwner({
//     owner: taker.publicKey,
//   });
//   const instruments = await Promise.all(
//     rfqs.map(async (rfq) => legsToInstruments(cvg, rfq.legs))
//   );
//   spok(t, instruments[0][0], {
//     $topic: 'Convert RFQ Legs to Instruments',
//     model: 'spotInstrument',
//   });
// });

test('[rfqModule] it can create and finalize RFQ, respond, confirm response, prepare settlemt, partly revert settlemt prep, revert settlemt prep', async (t: Test) => {
  const { rfq, response } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000005,
        side: Side.Bid,
      }),
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000007,
        side: Side.Ask,
      }),
    ],
    taker,
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
    activeWindow: 2,
    settlingWindow: 1,
  });
  t.assert(response.signature.length > 0, 'signature present');

  const { rfqResponse } = await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.000001 },
    },
  });

  await cvg.rfqs().confirmResponse({
    taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    side: Side.Bid,
  });

  await cvg.rfqs().prepareSettlement({
    caller: maker,
    rfq: rfq.address,
    response: rfqResponse.address,
    legAmountToPrepare: 2,
  });

  await sleep(3_001).then(async () => {
    await cvg.rfqs().partlyRevertSettlementPreparation({
      rfq: rfq.address,
      response: rfqResponse.address,
      side: AuthoritySide.Maker,
      legAmountToRevert: 1,
    });
  });

  await cvg.rfqs().revertSettlementPreparation({
    rfq: rfq.address,
    response: rfqResponse.address,
    side: AuthoritySide.Maker,
  });
});

test('[rfq module] it can find all rfqs by instrument as leg', async (t: Test) => {
  const spotInstrument = cvg.programs().getSpotInstrument();
  const rfqs = await cvg
    .rfqs()
    .findByInstrument({ instrumentProgram: spotInstrument });

  t.assert(rfqs.length > 0, 'rfqs should be greater than 0');
});

test('[rfq module] it can find all rfqs which are active', async (t: Test) => {
  const rfqPages = await cvg.rfqs().findRfqsByActive({});

  for (const rfqPage of rfqPages) {
    if (rfqPage instanceof Array) {
      for (const rfq of rfqPage) {
        console.log('<> active rfq: ', rfq.address.toString());
      }
    } else {
      console.log('<> active rfq: ', rfqPage.address.toString());
    }
  }

  t.assert(rfqPages.length > 0, 'rfqs should be greater than 0');
});

// test('[rfq module] it can find all rfqs by token mint address [EuropeanPut]', async (t: Test) => {
//   const rfqs = await cvg
//     .rfqs()
//     .findByToken({ mintAddress: europeanOptionPutMint });

//   for (const rfq of rfqs) {
//     if (rfq instanceof Array) {
//       for (const r of rfq) {
//         console.log('<inner page> rfq address: ', r.address.toString());
//       }
//     } else {
//       console.log('<flat page> rfq address: ', rfq.address.toString());
//     }
//   }

//   // t.assert(rfqs.length > 0, 'rfqs should be greater than 0');
// });

// test('[rfq module] it can find all rfqs by token mint address [usdcMint]', async (t: Test) => {
//   // const rfqs = await cvg.rfqs().findByToken({ mintAddress: usdcMint.address });
//   // t.assert(rfqs.length > 0, 'rfqs should be greater than 0');
// });

test('[rfq module] it can find all responses by maker address', async (t: Test) => {
  const responses = await cvg
    .rfqs()
    .findResponsesByOwner({ owner: maker.publicKey });

  for (const response of responses) {
    if (response instanceof Array) {
      for (const r of response) {
        console.log('<inner page> response address: ', r.address.toString());
      }
    } else {
      console.log(
        '<flat page> response address: ',
        response.address.toString()
      );
    }
  }
});

test('[rfqModule] it can find responses by rfq address', async (t: Test) => {
  const { rfq } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000005,
        side: Side.Bid,
      }),
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000005,
        side: Side.Ask,
      }),
    ],
    taker,
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
  });

  //@ts-ignore
  const { rfqResponse: rfqResponse1 } = await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.000001 },
    },
  });

  //@ts-ignore
  const { rfqResponse: rfqResponse2 } = await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    ask: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.000001 },
    },
  });

  const responses = await cvg.rfqs().findResponsesByRfq({
    address: rfq.address,
  });

  for (const response of responses) {
    // console.log('Rfq response: ' + response.address.toString());

    if (response instanceof Array) {
      for (const r of response) {
        console.log('<inner page> response address: ', r.address.toString());
      }
    } else {
      console.log(
        '<flat page> response address: ',
        response.address.toString()
      );
    }
  }
});

test('[rfqModule] it can find responses by multiple rfq addresses', async (t: Test) => {
  const { rfq: rfq1 } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000005,
        side: Side.Bid,
      }),
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000005,
        side: Side.Ask,
      }),
    ],
    taker,
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
  });
  const { rfq: rfq2 } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, solMint, {
        amount: 0.000000004,
        side: Side.Ask,
      }),
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000005,
        side: Side.Ask,
      }),
    ],
    taker,
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
  });
  //@ts-ignore
  const { rfqResponse: rfqResponse1 } = await cvg.rfqs().respond({
    maker,
    rfq: rfq1.address,
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.000001 },
    },
  });
  //@ts-ignore
  const { rfqResponse: rfqResponse2 } = await cvg.rfqs().respond({
    maker,
    rfq: rfq2.address,
    ask: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.000001 },
    },
  });

  const responses = await cvg.rfqs().findResponsesByRfqs({
    addresses: [rfq1.address, rfq2.address],
  });

  for (const response of responses) {
    // console.log('Rfq response: ' + response.address.toString());

    if (response instanceof Array) {
      for (const r of response) {
        console.log('<inner page> response address: ', r.address.toString());
      }
    } else {
      console.log(
        '<flat page> response address: ',
        response.address.toString()
      );
    }
  }
});

test('[rfqModule] it can create and finalize RFQ, respond, confirm response, taker prepare settlement, settle 1 party default', async (t: Test) => {
  const { rfq } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000005,
        side: Side.Bid,
      }),
    ],
    taker,
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
    activeWindow: 2,
    settlingWindow: 1,
  });
  const { rfqResponse } = await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.000001 },
    },
  });

  await cvg.rfqs().confirmResponse({
    taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    side: Side.Bid,
  });

  await cvg.rfqs().prepareSettlement({
    caller: taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    legAmountToPrepare: 1,
  });

  console.log(
    'settle 1 party response collateral: ' +
      rfqResponse.takerCollateralLocked.toString() +
      ' .. ' +
      rfqResponse.makerCollateralLocked.toString()
  );

  await sleep(3_001).then(async () => {
    await cvg.rfqs().settleOnePartyDefault({
      rfq: rfq.address,
      response: rfqResponse.address,
    });
  });
});

test('[rfqModule] it can create and finalize RFQ, respond twice w/ identical responses, confirm response, settle 2 party default', async (t: Test) => {
  const { rfq } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000005,
        side: Side.Bid,
      }),
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000005,
        side: Side.Ask,
      }),
    ],
    taker,
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
    activeWindow: 2,
    settlingWindow: 1,
  });
  const { rfqResponse } = await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.000001 },
    },
  });
  await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.000001 },
    },
  });

  await cvg.rfqs().confirmResponse({
    taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    side: Side.Bid,
  });

  console.log(
    'settle 2 party response collateral: ' +
      rfqResponse.takerCollateralLocked.toString() +
      ' .. ' +
      rfqResponse.makerCollateralLocked.toString()
  );

  await sleep(3_001).then(async () => {
    await cvg.rfqs().settleTwoPartyDefault({
      rfq: rfq.address,
      response: rfqResponse.address,
    });
  });
});

test('[helpers] devnet airdrop tokens', async (t: Test) => {
  const { collateralWallet } = await devnetAirdrops(
    cvg,
    Keypair.generate().publicKey,
    mintAuthority
  );
  t.assert(collateralWallet);
});

test('[rfqModule] convert user-friendly inputs to bignum and vice versa', async () => {
  const { rfq } = await cvg.rfqs().createAndFinalize({
    taker,
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000005,
        side: Side.Bid,
      }),
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000005,
        side: Side.Ask,
      }),
    ],
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
  });
  console.log(
    'fixed size legs multipler bps: ' +
      //@ts-ignore
      rfq.fixedSize.legsMultiplierBps.toString()
  );

  const foundRfq = await cvg.rfqs().findRfqByAddress({ address: rfq.address });

  console.log(
    'leg 0 instrument amt: ' + foundRfq.legs[0].instrumentAmount.toString()
  );
  console.log(
    'leg 1 instrument amt: ' + foundRfq.legs[1].instrumentAmount.toString()
  );
  //@ts-ignore
  const { rfqResponse } = await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.000001 },
    },
  });
});

test('[rfqModule] it can createRfqAndAddLegs, finalize, respond, confirmResponse, prepareSettlementAndPrepareMoreLegs, partiallySettleLegsAndSettle', async (t: Test) => {
  const instruments = [];
  for (let i = 0; i < 25; i++) {
    instruments.push(
      new SpotInstrument(cvg, btcMint, {
        amount: 0.000000005,
        side: Side.Ask,
      })
    );
  }

  const { rfq } = await cvg.rfqs().createRfqAndAddLegs({
    taker,
    instruments,
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
    quoteAsset: cvg
      .instrument(new SpotInstrument(cvg, usdcMint))
      .toQuoteAsset(),
  });

  await cvg.rfqs().finalizeRfqConstruction({
    taker,
    rfq: rfq.address,
  });

  const { rfqResponse } = await cvg.rfqs().respond({
    maker,
    rfq: rfq.address,
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.000001 },
    },
  });

  await cvg.rfqs().confirmResponse({
    taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    side: Side.Bid,
  });

  await cvg.rfqs().prepareSettlementAndPrepareMoreLegs({
    caller: taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    legAmountToPrepare: 25,
  });
  await cvg.rfqs().prepareSettlementAndPrepareMoreLegs({
    caller: maker,
    rfq: rfq.address,
    response: rfqResponse.address,
    legAmountToPrepare: 25,
  });

  let refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

  spok(t, refreshedResponse, {
    $topic: 'same model',
    state: StoredResponseState.ReadyForSettling,
  });

  await cvg.rfqs().partiallySettleLegsAndSettle({
    maker: maker.publicKey,
    taker: taker.publicKey,
    rfq: rfq.address,
    response: rfqResponse.address,
    legAmountToSettle: 25,
  });

  refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

  spok(t, refreshedResponse, {
    $topic: 'same model',
    state: StoredResponseState.Settled,
  });
});

test('[collateralModule] it can initialize collateral if necessary', async (t: Test) => {
  const initializationNecessary = await cvg
    .collateral()
    .initializationNecessary(taker.publicKey);

  if (initializationNecessary) {
    await cvg.collateral().initialize({ user: taker });
  }
  await cvg.collateral().fund({ user: taker, amount: 1000 });
});
//@ts-ignore

export const getPages = (
  unparsedAccounts: UnparsedAccount[],
  numPages: number,
  rfqsPerPage: number
): UnparsedAccount[][] => {
  let unparsedAccountPages: UnparsedAccount[][] = [];

  for (let i = 0; i < numPages; i++) {
    if (
      unparsedAccounts.slice(i * rfqsPerPage, (i + 1) * rfqsPerPage).length ===
      0
    ) {
      return unparsedAccountPages;
    } else {
      unparsedAccountPages.push(
        unparsedAccounts.slice(i * rfqsPerPage, (i + 1) * rfqsPerPage)
      );
    }
  }

  return unparsedAccountPages;
};

// test('[rfqModule] it can fetch RFQs via pagination', async () => {
//   const rfqProgram = cvg.programs().getRfq();
//   const rfqGpaBuilder = new RfqGpaBuilder(cvg, rfqProgram.address);

//   const unparsedAccounts = await rfqGpaBuilder.get();

//   const paginatedUnparsedAccounts = getPages(unparsedAccounts, 1, 1);

//   console.log(
//     'paginated unparsed accts: ' + paginatedUnparsedAccounts.length.toString()
//   );

//   console.log('unparsed accts len: ' + unparsedAccounts.length.toString());

//   const rfqs: Rfq[] = [];

//   for (const unparsedAccount of paginatedUnparsedAccounts) {
//     const rfq = await cvg
//       .rfqs()
//       .findRfqByAddress({ address: unparsedAccount.publicKey });

//     rfqs.push(rfq);
//   }

//   console.log('rfq accts len: ' + rfqs.length.toString());

//   for (const rfq of rfqs) {
//     console.log('rfq pubkey: ' + rfq.address.toString());
//   }
// });

// test('[rfqModule] it can fetch RFQ responses via pagination', async () => {
//   //@ts-ignore
//   const responses = await cvg
//     .rfqs()
//     .findResponsesByOwner({ owner: maker.publicKey });

//   const rfqProgram = cvg.programs().getRfq();
//   const responseGpaBuilder = new ResponseGpaBuilder(cvg, rfqProgram.address);
//   //@ts-ignore
//   const responseAccounts = await responseGpaBuilder.get();
// });

test('[rfqModule] it can find RFQs by instrument', async (t: Test) => {
  const rfqPages = await cvg.rfqs().findByInstrument({
    instrumentProgram: cvg.programs().getSpotInstrument(),
    pageConfig: [10, 10],
  });

  for (const rfqPage of rfqPages) {
    if (rfqPage instanceof Array) {
      for (const rfq of rfqPage) {
        console.log('<inner page> rfq address: ' + rfq.address.toString());
      }
    } else {
      console.log('<flat page> rfq address: ' + rfqPage.address.toString());
    }
  }

  console.log('number of pages: ' + rfqPages.length.toString());

  t.assert(rfqPages.length > 0, 'instruments present');
});
