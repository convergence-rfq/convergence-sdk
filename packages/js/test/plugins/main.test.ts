import test, { Test } from 'tape';
import spok from 'spok';
import { Keypair, PublicKey } from '@solana/web3.js';
import { sleep } from '@bundlr-network/client/build/common/utils';
import { OptionMarketWithKey } from '@mithraic-labs/psy-american';
import * as anchor from '@project-serum/anchor';
import { bignum } from '@convergence-rfq/beet';
import { EuroPrimitive } from '@mithraic-labs/tokenized-euros';
import { IDL as PseudoPythIdl } from 'programs/pseudo_pyth_idl';
import {
  createEuroAccountsAndMintOptions,
  createAmericanAccountsAndMintOptions,
} from '../helpers';
import { createAmericanProgram, initializeNewAmericanOption } from '@/index';
import {
  SWITCHBOARD_BTC_ORACLE,
  SWITCHBOARD_SOL_ORACLE,
  SKIP_PREFLIGHT,
  convergenceCli,
  killStuckProcess,
  spokSamePubkey,
  createPriceFeed,
  setupAccounts,
  USDC_DECIMALS,
  assertInitRiskEngineConfig,
} from '../helpers';
import { Convergence } from '@/Convergence';
import {
  Mint,
  token,
  Side,
  RiskCategory,
  SpotInstrument,
  OrderType,
  initializeNewOptionMeta,
  createEuropeanProgram,
  PsyoptionsEuropeanInstrument,
  PsyoptionsAmericanInstrument,
  OptionType,
  InstrumentType,
  Token,
  StoredResponseState,
  AuthoritySide,
  StoredRfqState,
  legsToInstruments,
  Signer,
  DEFAULT_RISK_CATEGORIES_INFO,
  devnetAirdrops,
  DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ,
  DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ,
  calculateExpectedLegsSize,
  calculateExpectedLegsHash,
} from '@/index';

killStuckProcess();

let cvg: Convergence;

let usdcMint: Mint;
let btcMint: Mint;
let solMint: Mint;

let dao: Signer;
let oracle: PublicKey;
let europeanProgram: anchor.Program<EuroPrimitive>;
let americanProgram: any;

let maker: Keypair; // LxnEKWoRhZizxg4nZJG8zhjQhCLYxcTjvLp9ATDUqNS
let taker: Keypair; // BDiiVDF1aLJsxV6BDnP3sSVkCEm9rBt7n1T1Auq1r4Ux
let mintAuthority: Keypair;

let daoBTCWallet: Token;
let daoUSDCWallet: Token;

let makerUSDCWallet: Token;
let makerBTCWallet: Token;

let takerUSDCWallet: Token;
let takerBTCWallet: Token;
let takerSOLWallet: Token;

let payer: Signer;

const SOL_WALLET_AMOUNT = 9_000;
const BTC_WALLET_AMOUNT = 9_000;
const USER_COLLATERAL_AMOUNT = 100_000_000;
const USER_USDC_WALLET = 10_000_000;

// SETUP
let optionMarket: OptionMarketWithKey | null;
let optionMarketPubkey: PublicKey;
let europeanOptionPutMint: PublicKey;

test('[setup] it can create Convergence instance', async (t: Test) => {
  cvg = await convergenceCli(SKIP_PREFLIGHT);

  dao = cvg.rpc().getDefaultFeePayer();
  payer = cvg.rpc().getDefaultFeePayer();

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

  console.log(
    'taker usdc wallet amount: ',
    takerUSDCWallet.amount.basisPoints.toString()
  );
  console.log(
    'taker btc wallet amount: ',
    takerBTCWallet.amount.basisPoints.toString()
  );
  console.log(
    'taker sol wallet amount: ',
    takerSOLWallet.amount.basisPoints.toString()
  );
  console.log(
    'maker usdc wallet amount: ',
    makerUSDCWallet.amount.basisPoints.toString()
  );
  console.log(
    'maker btc wallet amount: ',
    makerBTCWallet.amount.basisPoints.toString()
  );
  console.log(
    'dao usdc wallet amount: ',
    daoUSDCWallet.amount.basisPoints.toString()
  );

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
  console.log('usdc mint decimals: ', usdcMint.decimals.toString());
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
  await Promise.all([
    cvg.protocol().addInstrument({
      authority: dao,
      instrumentProgram: cvg.programs().getSpotInstrument().address,
      canBeUsedAsQuote: true,
      validateDataAccountAmount: 1,
      prepareToSettleAccountAmount: 7,
      settleAccountAmount: 3,
      revertPreparationAccountAmount: 3,
      cleanUpAccountAmount: 4,
    }),
    cvg.protocol().addInstrument({
      authority: dao,
      instrumentProgram: cvg.programs().getPsyoptionsEuropeanInstrument()
        .address,
      canBeUsedAsQuote: true,
      validateDataAccountAmount: 2,
      prepareToSettleAccountAmount: 7,
      settleAccountAmount: 3,
      revertPreparationAccountAmount: 3,
      cleanUpAccountAmount: 4,
    }),
    cvg.protocol().addInstrument({
      authority: dao,
      instrumentProgram: cvg.programs().getPsyoptionsAmericanInstrument()
        .address,
      canBeUsedAsQuote: true,
      validateDataAccountAmount: 3,
      prepareToSettleAccountAmount: 7,
      settleAccountAmount: 3,
      revertPreparationAccountAmount: 3,
      cleanUpAccountAmount: 4,
    }),
  ]);
});

test('[protocolModule] it can add BTC and SOL base assets', async (t: Test) => {
  const [{ baseAsset: baseBTCAsset }, { baseAsset: baseSOLAsset }] =
    await Promise.all([
      cvg.protocol().addBaseAsset({
        authority: dao,
        index: { value: 0 },
        ticker: 'BTC',
        riskCategory: RiskCategory.VeryLow,
        priceOracle: { __kind: 'Switchboard', address: SWITCHBOARD_BTC_ORACLE },
      }),
      cvg.protocol().addBaseAsset({
        authority: dao,
        index: { value: 1 },
        ticker: 'SOL',
        riskCategory: RiskCategory.VeryLow,
        priceOracle: { __kind: 'Switchboard', address: SWITCHBOARD_SOL_ORACLE },
      }),
    ]);

  spok(t, baseBTCAsset, {
    $topic: 'baseAsset model',
    model: 'baseAsset',
    index: { value: 0 },
    ticker: 'BTC',
  });

  spok(t, baseSOLAsset, {
    $topic: 'baseAsset model',
    model: 'baseAsset',
    index: { value: 1 },
    ticker: 'SOL',
  });
});

test('[protocolModule] it can register mints', async (t: Test) => {
  const [
    { registeredMint: btcRegisteredMint },
    { registeredMint: solRegisteredMint },
    { registeredMint: usdcRegisteredMint },
  ] = await Promise.all([
    cvg.protocol().registerMint({
      baseAssetIndex: 0,
      mint: btcMint.address,
    }),
    cvg.protocol().registerMint({
      baseAssetIndex: 1,
      mint: solMint.address,
    }),
    cvg.protocol().registerMint({
      mint: usdcMint.address,
    }),
  ]);

  t.same(
    btcRegisteredMint.mintAddress.toString(),
    btcMint.address.toString(),
    'same address'
  );
  spok(t, btcRegisteredMint, {
    $topic: 'registeredMint model',
    model: 'registeredMint',
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

test('[protocolModule] it can get the protocol', async (t: Test) => {
  const protocol = await cvg.protocol().get();

  t.same(protocol.address, cvg.protocol().pdas().protocol(), 'same address');
});

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

test('[protocolModule] it can find BTC and SOL base assets by address', async (t: Test) => {
  const btcBaseAsset = await cvg.protocol().findBaseAssetByAddress({
    address: cvg
      .protocol()
      .pdas()
      .baseAsset({ index: { value: 0 } }),
  });
  const solBaseAsset = await cvg.protocol().findBaseAssetByAddress({
    address: cvg
      .protocol()
      .pdas()
      .baseAsset({ index: { value: 1 } }),
  });

  spok(t, btcBaseAsset, {
    $topic: 'Find Base Asset By Address',
    model: 'baseAsset',
    index: {
      value: 0,
    },
    ticker: 'BTC',
    riskCategory: 0,
  });
  spok(t, solBaseAsset, {
    $topic: 'Find Base Asset By Address',
    model: 'baseAsset',
    index: {
      value: 1,
    },
    ticker: 'SOL',
    riskCategory: 0,
  });
});

test('[protocolModule] it can find registered mint by address', async (t: Test) => {
  const bitcoinMint = await cvg
    .protocol()
    .findRegisteredMintByAddress({ address: btcMint.address });

  t.same(
    bitcoinMint.address.toString(),
    btcMint.address.toString(),
    'expected btc mint address'
  );
});

test('[protocolModule] get registered mints', async (t: Test) => {
  const registeredMints = await cvg.protocol().getRegisteredMints();

  t.assert(registeredMints.length === 3, 'expected 3 registered mints');
});

// RISK ENGINE

test('[riskEngineModule] it can initialize the default risk engine config', async (t: Test) => {
  const output = await cvg
    .riskEngine()
    .initializeConfig({ collateralMintDecimals: USDC_DECIMALS });
  assertInitRiskEngineConfig(cvg, t, output);
});

test('[riskEngineModule] it can fetch the config', async (t: Test) => {
  const output = await cvg.riskEngine().fetchConfig();

  spok(t, output, {
    $topic: 'fetch risk engine config',
    model: 'config',
  });
});

test('[riskEngineModule] it can update the risk engine config', async (t: Test) => {
  const output = await cvg.riskEngine().updateConfig();
  assertInitRiskEngineConfig(cvg, t, output);
});

test('[riskEngineModule] it can fetch the config', async (t: Test) => {
  const output = await cvg.riskEngine().fetchConfig();

  spok(t, output, {
    $topic: 'fetch risk engine config',
    model: 'config',
  });
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
  const [
    { collateral: takerCollateral },
    { collateral: makerCollateral },
    { collateral: daoCollateral },
  ] = await Promise.all([
    cvg.collateral().initialize({
      user: taker,
    }),
    cvg.collateral().initialize({
      user: maker,
    }),
    cvg.collateral().initialize({
      user: dao,
    }),
  ]);

  const [foundTakerCollateral, foundMakerCollateral, foundDaoCollateral] =
    await Promise.all([
      cvg.collateral().findByAddress({ address: takerCollateral.address }),
      cvg.collateral().findByAddress({ address: makerCollateral.address }),
      cvg.collateral().findByAddress({ address: daoCollateral.address }),
    ]);

  t.same(
    foundTakerCollateral.address.toString(),
    takerCollateral.address.toString(),
    'same address'
  );
  spok(t, takerCollateral, {
    $topic: 'collateral model',
    model: 'collateral',
  });

  t.same(
    foundMakerCollateral.address.toString(),
    makerCollateral.address.toString(),
    'same address'
  );
  spok(t, makerCollateral, {
    $topic: 'Initialize Collateral',
    model: 'collateral',
  });

  t.same(
    foundDaoCollateral.address.toString(),
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
    '<initCollateral> taker locked tokens collateral amount: ' +
      tc.lockedTokensAmount.toString()
  );
});

test('[collateralModule] it can fund collateral', async (t: Test) => {
  await Promise.all([
    cvg.collateral().fund({
      user: taker,
      amount: USER_COLLATERAL_AMOUNT,
    }),
    cvg.collateral().fund({
      user: maker,
      amount: USER_COLLATERAL_AMOUNT,
    }),
  ]);

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

  const [takerCollateralTokenAccount, makerCollateralTokenAccount] =
    await Promise.all([
      cvg.tokens().findTokenByAddress({ address: takerCollateralTokenPda }),
      cvg.tokens().findTokenByAddress({ address: makerCollateralTokenPda }),
    ]);

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
    '<fundCollateral> taker locked tokens collateral amount:  ' +
      takerCollateral.lockedTokensAmount.toString()
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
  const takerCollateral = cvg
    .collateral()
    .pdas()
    .collateralToken({ user: taker.publicKey });

  const [makerCollateralInfo, takerCollateralInfo] = await Promise.all([
    cvg.tokens().findTokenByAddress({ address: makerCollateral }),
    cvg.tokens().findTokenByAddress({ address: takerCollateral }),
  ]);

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
});

test('*<>*<>*[Testing] Wrap tests that don`t depend on each other*<>*<>*', async () => {
  test('[collateralModule] it can find collateral by user', async (t: Test) => {
    const [makerCollateral, takerCollateral] = await Promise.all([
      cvg.collateral().findByUser({ user: maker.publicKey }),
      cvg.collateral().findByUser({ user: taker.publicKey }),
    ]);
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
        makerCollateral.lockedTokensAmount.toString()
    );

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
        takerCollateral.lockedTokensAmount.toString()
    );
  });

  // // RFQ

  test('[rfqModule] it can create and finalize RFQ, cancel RFQ, unlock RFQ collateral, and clean up RFQ', async (t: Test) => {
    let takerCollateral = await cvg.collateral().findByUser({
      user: taker.publicKey,
    });

    console.log(
      '<createAndFinalize <before create> fixed quote> taker locked tokens collateral amount:  ' +
        takerCollateral.lockedTokensAmount.toString()
    );

    const { rfq } = await cvg.rfqs().create({
      taker,
      quoteAsset: cvg
        .instrument(new SpotInstrument(cvg, usdcMint))
        .toQuoteAsset(),
      instruments: [
        new SpotInstrument(cvg, btcMint, {
          amount: 1,
          side: Side.Bid,
        }),
      ],
      orderType: OrderType.Sell,
      fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
    });

    takerCollateral = await cvg.collateral().refresh(takerCollateral);

    console.log(
      '<createAndFinalize <before finalize> fixed quote> taker locked tokens collateral amount:  ' +
        takerCollateral.lockedTokensAmount.toString()
    );

    await cvg.rfqs().finalizeRfqConstruction({
      taker,
      rfq: rfq.address,
    });

    takerCollateral = await cvg.collateral().refresh(takerCollateral);

    let refreshedRfq = await cvg.rfqs().refreshRfq(rfq);
    console.log('now finding collater by user');
    console.log(
      '<createAndFinalize <after> fixed quote> taker locked tokens collateral amount:  ' +
        takerCollateral.lockedTokensAmount.toString()
    );

    console.log(
      'taker collateral locked: ',
      refreshedRfq.totalTakerCollateralLocked.toString()
    );

    await cvg.rfqs().cancelRfq({
      taker,
      rfq: rfq.address,
    });

    refreshedRfq = await cvg.rfqs().refreshRfq(rfq);

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

  test('[rfqModule] it can create fixed base, check locked collateral, and clean up RFQ', async (t: Test) => {
    const { rfq } = await cvg.rfqs().createAndFinalize({
      instruments: [
        new SpotInstrument(cvg, btcMint, {
          amount: 1,
          side: Side.Bid,
        }),
      ],
      taker,
      orderType: OrderType.TwoWay,
      fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
      quoteAsset: cvg
        .instrument(new SpotInstrument(cvg, usdcMint))
        .toQuoteAsset(),
      activeWindow: 60 * 60,
      settlingWindow: 5 * 60,
    });

    const takerCollateral = await cvg.collateral().findByUser({
      user: taker.publicKey,
    });
    //3.743 usdc on UI side
    console.log(
      '&&&&taker collateral locked tokens collateral amount:  ' +
        takerCollateral.lockedTokensAmount.toString()
    );

    console.log(
      '&&&&taker rfq collateral locked: ',
      rfq.totalTakerCollateralLocked.toString()
    );
  });

  test('[rfqModule] it can create and finalize RFQ, respond, confirm response, prepare settlement, prepare more legs settlement, partially settle legs, settle', async (t: Test) => {
    //@ts-ignore
    const { rfq } = await cvg.rfqs().createAndFinalize({
      instruments: [
        new SpotInstrument(cvg, btcMint, {
          amount: 5.4987,
          side: Side.Bid,
        }),
        new SpotInstrument(cvg, btcMint, {
          amount: 42.9573893,
          side: Side.Ask,
        }),
        new SpotInstrument(cvg, btcMint, {
          amount: 999.29354,
          side: Side.Ask,
        }),
        new SpotInstrument(cvg, btcMint, {
          amount: 1,
          side: Side.Bid,
        }),
      ],
      taker,
      orderType: OrderType.TwoWay,
      fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
      quoteAsset: cvg
        .instrument(new SpotInstrument(cvg, usdcMint))
        .toQuoteAsset(),
      activeWindow: 60 * 60,
      settlingWindow: 50 * 5,
    });

    const takerCollateral = await cvg.collateral().findByUser({
      user: taker.publicKey,
    });
    console.log(
      '<createAndFinalize fixed base> taker locked tokens collateral amount:  ' +
        takerCollateral.lockedTokensAmount.toString()
    );

    console.log(
      'taker collateral locked: ',
      rfq.totalTakerCollateralLocked.toString()
    );

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

    let refreshedRfq = await cvg.rfqs().refreshRfq(rfq);

    console.log(
      'taker collateral locked after confirm response:  ',
      refreshedRfq.totalTakerCollateralLocked.toString()
    );

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
      legAmountToPrepare: 2,
    });

    await cvg.rfqs().prepareMoreLegsSettlement({
      caller: maker,
      rfq: rfq.address,
      response: rfqResponse.address,
      legAmountToPrepare: 2,
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

    refreshedRfq = await cvg.rfqs().refreshRfq(rfq);

    console.log(
      'taker collateral locked after settlement:  ',
      refreshedRfq.totalTakerCollateralLocked.toString()
    );

    refreshedResponse = await cvg.rfqs().refreshResponse(refreshedResponse);

    spok(t, refreshedResponse, {
      $topic: 'Settled',
      model: 'response',
      state: StoredResponseState.Settled,
    });
  });

  // RFQ UTILS

  test('[rfqModule] it can find RFQs by addresses', async (t: Test) => {
    const { rfq: rfq1 } = await cvg.rfqs().create({
      taker,
      instruments: [
        new SpotInstrument(cvg, solMint, {
          amount: 2.967,
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
          amount: 0.06,
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
          amount: 9.5312,
          side: Side.Ask,
        }),
      ],
      orderType: OrderType.Sell,
      fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
      quoteAsset: cvg
        .instrument(new SpotInstrument(cvg, usdcMint))
        .toQuoteAsset(),
    });

    const rfqPages = await cvg.rfqs().findRfqsByAddresses({
      addresses: [rfq1.address, rfq2.address, rfq3.address],
    });

    spok(t, rfq1, {
      $topic: 'Created RFQ',
      model: 'rfq',
      address: spokSamePubkey(rfqPages[0][0].address),
    });
    spok(t, rfq2, {
      $topic: 'Created RFQ',
      model: 'rfq',
      address: spokSamePubkey(rfqPages[0][1].address),
    });
    spok(t, rfq3, {
      $topic: 'Created RFQ',
      model: 'rfq',
      address: spokSamePubkey(rfqPages[0][2].address),
    });
  });

  test('[rfqModule] it can find RFQs by owner and print pages', async (t: Test) => {
    const foundRfqs = await cvg
      .rfqs()
      .findRfqsByOwner({ owner: taker.publicKey, rfqsPerPage: 2 });

    for (const foundRfq of foundRfqs) {
      console.log('new page');

      for (const rfq of foundRfq) {
        console.log('rfq address: ' + rfq.address.toBase58());
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
          amount: 1,
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
  });

  test('[riskEngineModule] it can calculate collateral for fixed quote size RFQ creation (Spot)', async (t: Test) => {
    const legs = [
      await SpotInstrument.createForLeg(cvg, btcMint, 5, Side.Bid).toLegData(),
    ];

    const riskOutput = await cvg.riskEngine().calculateCollateralForRfq({
      fixedSize: {
        __kind: 'QuoteAsset',
        quoteAmount: 100,
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

  test('[psyoptionsEuropeanInstrumentModule] it can create and finalize RFQ w/ PsyOptions Euro, respond, confirm, prepare, settle', async (t: Test) => {
    const provider = new anchor.AnchorProvider(
      cvg.connection,
      new anchor.Wallet(payer as Keypair),
      {}
    );
    // anchor.setProvider(provider);
    europeanProgram = await createEuropeanProgram(cvg);
    const pseudoPythProgram = new anchor.Program(
      PseudoPythIdl,
      new PublicKey('FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH'),
      provider
    );
    oracle = await createPriceFeed(
      pseudoPythProgram,
      17_000,
      usdcMint.decimals * -1
    );

    const { euroMeta, euroMetaKey } = await initializeNewOptionMeta(
      cvg,
      oracle,
      europeanProgram,
      btcMint,
      usdcMint,
      23_354,
      1,
      3_600
    );

    europeanOptionPutMint = euroMeta.putOptionMint;

    await createEuroAccountsAndMintOptions(
      cvg,
      euroMeta,
      euroMetaKey,
      payer,
      europeanProgram,
      usdcMint
    );

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
    });

    await cvg.rfqs().finalizeRfqConstruction({
      rfq: rfq.address,
      taker,
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

    const foundRfq = await cvg
      .rfqs()
      .findRfqByAddress({ address: rfq.address });
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

  test('[riskEngineModule] it can calculate collateral for fixed base size RFQ creation', async (t: Test) => {
    const legs = [
      await SpotInstrument.createForLeg(cvg, btcMint, 5, Side.Bid).toLegData(),
    ];

    const riskOutput = await cvg.riskEngine().calculateCollateralForRfq({
      fixedSize: {
        __kind: 'BaseAsset',
        legsMultiplierBps: 2,
      },
      orderType: OrderType.TwoWay,
      legs,
      settlementPeriod: 5 * 60 * 60, // 5 hours
    });

    spok(t, riskOutput, {
      $topic: 'Calculated Collateral for fixed base size Rfq',
      requiredCollateral: 19800,
    });
  });

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

    const riskOutput = await cvg
      .riskEngine()
      .calculateCollateralForConfirmation({
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

  test('[rfqModule] it can create/finalize Rfq, respond, confirm resp, prepare settlemt, settle, unlock resp collat, clean up response legs, clean up response', async (t: Test) => {
    const { euroMeta, euroMetaKey } = await initializeNewOptionMeta(
      cvg,
      oracle,
      europeanProgram,
      btcMint,
      usdcMint,
      23_354,
      1,
      3_600
    );

    await createEuroAccountsAndMintOptions(
      cvg,
      euroMeta,
      euroMetaKey,
      cvg.rpc().getDefaultFeePayer(),
      europeanProgram,
      usdcMint
    );

    const psyopEuroInstrument1 = new PsyoptionsEuropeanInstrument(
      cvg,
      btcMint,
      OptionType.PUT,
      euroMeta,
      euroMetaKey,
      {
        amount: 0.00000001,
        side: Side.Bid,
      }
    );

    const { rfq } = await cvg.rfqs().createAndFinalize({
      taker,
      quoteAsset: cvg
        .instrument(new SpotInstrument(cvg, usdcMint))
        .toQuoteAsset(),
      instruments: [
        new SpotInstrument(cvg, btcMint, {
          amount: 5,
          side: Side.Bid,
        }),
        new SpotInstrument(cvg, btcMint, {
          amount: 3,
          side: Side.Ask,
        }),
        psyopEuroInstrument1,
      ],
      orderType: OrderType.TwoWay,
      fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
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
      legAmountToPrepare: 3,
    });
    const firstToPrepare = taker.publicKey;

    await cvg.rfqs().prepareSettlement({
      caller: maker,
      rfq: rfq.address,
      response: rfqResponse.address,
      legAmountToPrepare: 3,
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

    refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

    t.same(
      refreshedResponse.makerCollateralLocked.toString(),
      '0',
      'Expected 0 locked maker collateral'
    );

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
          amount: 5,
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

  test('[rfqModule] it can create and finalize open RFQ, then respond w/ base quantity', async (t: Test) => {
    const { rfq } = await cvg.rfqs().createAndFinalize({
      instruments: [
        new SpotInstrument(cvg, btcMint, {
          amount: 1.23,
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

  test('[psyoptionsAmericanInstrumentModule] it can mint options to taker', async () => {
    americanProgram = createAmericanProgram(cvg);

    const {
      optionMarketKey,
      optionMarket: op,
      optionMintKey,
      writerMintKey,
      // optionMint,
    } = await initializeNewAmericanOption(
      cvg,
      americanProgram,
      btcMint,
      usdcMint,
      new anchor.BN(100),
      new anchor.BN(1),
      3_600
    );
    optionMarket = op;
    optionMarketPubkey = optionMarketKey;

    await createAmericanAccountsAndMintOptions(
      cvg,
      americanProgram,
      btcMint,
      optionMarket,
      optionMintKey,
      writerMintKey
    );
  });

  test('[psyoptionsAmericanInstrumentModule] it can create an RFQ with PsyOptions American, respond, confirm response, prepare settlement, settle', async (t: Test) => {
    const { rfq, response } = await cvg.rfqs().createAndFinalize({
      taker,
      instruments: [
        new PsyoptionsAmericanInstrument(
          cvg,
          btcMint,
          usdcMint,
          OptionType.CALL,
          optionMarket as OptionMarketWithKey,
          optionMarketPubkey,
          {
            amount: 0.00000001,
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

  let xOp: any;
  let xOptionMarketPubkey: PublicKey;

  test('[psyoptionsAmericanInstrumentModule] it can mint options to taker x2', async () => {
    const {
      optionMarketKey,
      optionMarket: op,
      optionMintKey,
      writerMintKey,
    } = await initializeNewAmericanOption(
      cvg,
      americanProgram,
      btcMint,
      usdcMint,
      new anchor.BN(100),
      new anchor.BN(1),
      3_600
    );
    xOp = op;
    xOptionMarketPubkey = optionMarketKey;

    await createAmericanAccountsAndMintOptions(
      cvg,
      americanProgram,
      btcMint,
      op,
      optionMintKey,
      writerMintKey
    );
  });

  test('[psyoptionsAmericanInstrumentModule] it can create an RFQ with PsyOptions American, respond, confirm response, prepare settlement, settle', async (t: Test) => {
    const { rfq, response } = await cvg.rfqs().createAndFinalize({
      taker,
      instruments: [
        new PsyoptionsAmericanInstrument(
          cvg,
          btcMint,
          usdcMint,
          OptionType.CALL,
          xOp as OptionMarketWithKey,
          xOptionMarketPubkey,
          {
            amount: 0.00000001,
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
    let instruments: (
      | SpotInstrument
      | PsyoptionsEuropeanInstrument
      | PsyoptionsAmericanInstrument
    )[] = [];

    instruments.push(
      new SpotInstrument(cvg, solMint, {
        amount: 6,
        side: Side.Ask,
      })
    );
    instruments.push(
      new SpotInstrument(cvg, btcMint, {
        amount: 1,
        side: Side.Ask,
      })
    );
    instruments.push(
      new SpotInstrument(cvg, btcMint, {
        amount: 9,
        side: Side.Bid,
      })
    );

    const expectedLegsSize = await calculateExpectedLegsSize(cvg, instruments);
    const expectedLegsHash = await calculateExpectedLegsHash(cvg, instruments);

    const { rfq } = await cvg.rfqs().create({
      taker,
      quoteAsset: cvg
        .instrument(new SpotInstrument(cvg, usdcMint))
        .toQuoteAsset(),
      instruments: [
        new SpotInstrument(cvg, solMint, {
          amount: 6,
          side: Side.Ask,
        }),
      ],
      orderType: OrderType.TwoWay,
      fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
      expectedLegsSize,
      expectedLegsHash,
    });

    await cvg.rfqs().addLegsToRfq({
      taker,
      rfq: rfq.address,
      instruments: [
        new SpotInstrument(cvg, btcMint, {
          amount: 1,
          side: Side.Ask,
        }),
        new SpotInstrument(cvg, btcMint, {
          amount: 9,
          side: Side.Bid,
        }),
      ],
    });

    await cvg.rfqs().finalizeRfqConstruction({
      taker,
      rfq: rfq.address,
    });

    const refreshedRfq = await cvg.rfqs().refreshRfq(rfq.address);

    spok(t, refreshedRfq, {
      $topic: 'Added legs to Rfq',
      model: 'rfq',
      address: spokSamePubkey(rfq.address),
      state: StoredRfqState.Active,
    });
  });

  // RFQ HELPERS

  test('[rfqModule] it can convert RFQ legs to instruments', async (t: Test) => {
    const rfqPages = await cvg.rfqs().findRfqsByOwner({
      owner: taker.publicKey,
    });

    let instruments: (
      | SpotInstrument
      | PsyoptionsEuropeanInstrument
      | PsyoptionsAmericanInstrument
    )[][] = [[]];

    for (const rfqs of rfqPages) {
      instruments = await Promise.all(
        rfqs.map(async (rfq) => legsToInstruments(cvg, rfq.legs))
      );
    }

    const instrument = instruments[0][0];
    t.assert(
      instrument instanceof SpotInstrument ||
        instrument instanceof PsyoptionsEuropeanInstrument ||
        instrument instanceof PsyoptionsAmericanInstrument,
      'expected instrument'
    );
  });

  test('[rfqModule] it can create and finalize RFQ, respond, confirm response, prepare settlemt, partly revert settlemt prep, revert settlemt prep', async (t: Test) => {
    const { rfq, response } = await cvg.rfqs().createAndFinalize({
      instruments: [
        new SpotInstrument(cvg, btcMint, {
          amount: 5,
          side: Side.Bid,
        }),
        new SpotInstrument(cvg, btcMint, {
          amount: 7,
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

    t.equal(
      rfqResponse.makerPreparedLegs,
      0,
      'maker prepared legs should be 0'
    );
    t.equal(
      rfqResponse.takerPreparedLegs,
      0,
      'taker prepared legs should be 0'
    );
  });

  test('%%%% [rfqModule] it can find all rfqs by instrument as leg %%%%%%%%%%%%%%%%%%%%%%%%%%%', async (t: Test) => {
    const spotInstrument = cvg.programs().getSpotInstrument();
    const rfqs = await cvg
      .rfqs()
      .findRfqsByInstrument({ instrumentProgram: spotInstrument });

    t.assert(rfqs.length > 0, 'rfqs should be greater than 0');
  });

  test('[rfqModule] it can find all rfqs which are active', async (t: Test) => {
    const rfqPages = await cvg.rfqs().findRfqsByActive({
      rfqsPerPage: 3,
    });

    for (const rfqPage of rfqPages) {
      console.log('new page');

      for (const rfq of rfqPage) {
        console.log('rfq address: ', rfq.address.toString());
      }
    }

    console.log('number of pages: ' + rfqPages.length.toString());

    t.assert(rfqPages.length > 0, 'rfqs should be greater than 0');
  });

  test('[rfqModule] it can find all rfqs by token mint address [EuropeanPut]', async (t: Test) => {
    const rfqPages = await cvg
      .rfqs()
      .findRfqsByToken({ mintAddress: europeanOptionPutMint, rfqsPerPage: 1 });

    for (const rfqPage of rfqPages) {
      console.log('new page');

      for (const rfq of rfqPage) {
        console.log('rfq address: ', rfq.address.toString());
      }
    }

    console.log('number of pages: ' + rfqPages.length.toString());

    t.assert(rfqPages.length > 0, 'rfq pages should be greater than 0');
  });

  test('[rfq module] it can find all rfqs by token mint address [usdcMint]', async (t: Test) => {
    const rfqPages = await cvg.rfqs().findRfqsByToken({
      mintAddress: usdcMint.address,
      rfqsPerPage: 3,
      numPages: 2,
    });

    for (const rfqPage of rfqPages) {
      console.log('new page');

      for (const rfq of rfqPage) {
        console.log('rfq address: ', rfq.address.toString());
      }
    }

    console.log('number of pages: ' + rfqPages.length.toString());

    t.assert(rfqPages.length > 0, 'rfq pages should be greater than 0');
  });

  test('[rfq module] it can find all responses by maker address', async (t: Test) => {
    const responsePages = await cvg
      .rfqs()
      .findResponsesByOwner({ owner: maker.publicKey });

    for (const responsePage of responsePages) {
      console.log('new page');

      for (const response of responsePage) {
        console.log('response address: ', response.address.toString());
      }
    }

    console.log('number of pages: ' + responsePages.length.toString());
  });

  test('[rfqModule] it can find a response by address', async (t: Test) => {
    const { rfq } = await cvg.rfqs().createAndFinalize({
      instruments: [
        new SpotInstrument(cvg, btcMint, {
          amount: 5,
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

    const { rfqResponse: rfqResponse1 } = await cvg.rfqs().respond({
      maker,
      rfq: rfq.address,
      bid: {
        __kind: 'FixedSize',
        priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.000001 },
      },
    });

    const response = await cvg.rfqs().findResponseByAddress({
      address: rfqResponse1.address,
    });

    t.same(
      response.address.toString(),
      rfqResponse1.address.toString(),
      'Found response by address'
    );
  });

  test('[rfqModule] it can find responses by rfq address', async (t: Test) => {
    const { rfq } = await cvg.rfqs().createAndFinalize({
      instruments: [
        new SpotInstrument(cvg, btcMint, {
          amount: 5,
          side: Side.Bid,
        }),
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

    const responsePages = await cvg.rfqs().findResponsesByRfq({
      address: rfq.address,
    });

    for (const responsePage of responsePages) {
      console.log('new page');

      for (const response of responsePage) {
        console.log('response address: ', response.address.toString());
      }
    }

    console.log('number of pages: ' + responsePages.length.toString());
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
          amount: 450.6,
          side: Side.Ask,
        }),
        new SpotInstrument(cvg, btcMint, {
          amount: 12.6879,
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

    await cvg.rfqs().respond({
      maker,
      rfq: rfq1.address,
      bid: {
        __kind: 'FixedSize',
        priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.000001 },
      },
    });

    await cvg.rfqs().respond({
      maker,
      rfq: rfq2.address,
      ask: {
        __kind: 'FixedSize',
        priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.000001 },
      },
    });

    const responsePages = await cvg.rfqs().findResponsesByRfqs({
      addresses: [rfq1.address, rfq2.address],
    });

    for (const responsePage of responsePages) {
      for (const response of responsePage) {
        console.log('response address: ', response.address.toString());
      }
    }
  });

  test('[rfqModule] it can create and finalize RFQ, respond, confirm response, taker prepare settlement, settle 1 party default', async (t: Test) => {
    const { rfq } = await cvg.rfqs().createAndFinalize({
      instruments: [
        new SpotInstrument(cvg, btcMint, {
          amount: 5,
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
          amount: 4.5,
          side: Side.Bid,
        }),
        new SpotInstrument(cvg, btcMint, {
          amount: 9.874,
          side: Side.Ask,
        }),
      ],
      taker,
      orderType: OrderType.TwoWay,
      fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
      quoteAsset: cvg
        .instrument(new SpotInstrument(cvg, usdcMint))
        .toQuoteAsset(),
      activeWindow: 3,
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

    await sleep(3_001).then(async () => {
      await cvg.rfqs().settleTwoPartyDefault({
        rfq: rfq.address,
        response: rfqResponse.address,
      });
    });
  });

  let yOp: any;
  let yOptionMarketPubkey: PublicKey;

  test('[rfqModule] it can mint american options before the next test', async (t: Test) => {
    const {
      optionMarketKey,
      optionMarket: op,
      optionMintKey,
      writerMintKey,
    } = await initializeNewAmericanOption(
      cvg,
      americanProgram,
      btcMint,
      usdcMint,
      new anchor.BN(90),
      new anchor.BN(1),
      3_600
    );

    yOp = op;
    yOptionMarketPubkey = optionMarketKey;

    await createAmericanAccountsAndMintOptions(
      cvg,
      americanProgram,
      btcMint,
      op,
      optionMintKey,
      writerMintKey
    );
  });

  test('[rfqModule] it can createRfqAndAddLegs, addLegs, finalize, respond, confirmResponse, prepareSettlementAndPrepareMoreLegs, partiallySettleLegsAndSettle', async (t: Test) => {
    const instruments = [];
    for (let i = 0; i < 5; i++) {
      instruments.push(
        new SpotInstrument(cvg, btcMint, {
          amount: 0.00000001,
          side: Side.Ask,
        })
      );
    }

    const americanInstrument1 = new PsyoptionsAmericanInstrument(
      cvg,
      btcMint,
      usdcMint,
      OptionType.CALL,
      yOp as OptionMarketWithKey,
      yOptionMarketPubkey,
      {
        amount: 0.00000001,
        side: Side.Bid,
      }
    );
    instruments.push(americanInstrument1);

    const { euroMeta, euroMetaKey, expirationData } =
      await initializeNewOptionMeta(
        cvg,
        oracle,
        europeanProgram,
        btcMint,
        usdcMint,
        23_354,
        1,
        3_600
        // 1
      );
    euroMeta.oracleProviderId = 1;
    expirationData.oracleProviderId = 1;

    await createEuroAccountsAndMintOptions(
      cvg,
      euroMeta,
      euroMetaKey,
      cvg.rpc().getDefaultFeePayer(),
      europeanProgram,
      usdcMint
    );

    const psyopEuroInstrument1 = new PsyoptionsEuropeanInstrument(
      cvg,
      btcMint,
      OptionType.PUT,
      euroMeta,
      euroMetaKey,
      {
        amount: 0.00000001,
        side: Side.Bid,
      }
    );
    instruments.push(psyopEuroInstrument1);

    const psyopEuroInstrument2 = new PsyoptionsEuropeanInstrument(
      cvg,
      btcMint,
      OptionType.PUT,
      euroMeta,
      euroMetaKey,
      {
        amount: 0.00000001,
        side: Side.Bid,
      }
    );
    instruments.push(psyopEuroInstrument2);

    const expectedLegsSize = await calculateExpectedLegsSize(cvg, instruments);
    const expectedLegsHash = await calculateExpectedLegsHash(cvg, instruments);

    const { rfq } = await cvg.rfqs().createRfqAndAddLegs({
      taker,
      // instruments: instruments.slice(0, 20),
      // instruments: [psyopEuroInstrument1, psyopEuroInstrument2],
      instruments,
      orderType: OrderType.TwoWay,
      fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
      quoteAsset: cvg
        .instrument(new SpotInstrument(cvg, usdcMint))
        .toQuoteAsset(),
      expectedLegsSize,
      expectedLegsHash,
    });

    // await cvg.rfqs().addLegsToRfq({
    //   taker,
    //   rfq: rfq.address,
    //   instruments: instruments.slice(20),
    // });

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

    // await cvg.rfqs().prepareSettlementAndPrepareMoreLegs({
    //   caller: taker,
    //   rfq: rfq.address,
    //   response: rfqResponse.address,
    //   // legAmountToPrepare: 20,
    //   legAmountToPrepare: 8,
    // });
    // await cvg.rfqs().prepareSettlementAndPrepareMoreLegs({
    //   caller: maker,
    //   rfq: rfq.address,
    //   response: rfqResponse.address,
    //   // legAmountToPrepare: 20,
    //   legAmountToPrepare: 8,
    // });
    await cvg.rfqs().prepareSettlement({
      caller: taker,
      rfq: rfq.address,
      response: rfqResponse.address,
      legAmountToPrepare: 8,
    });
    await cvg.rfqs().prepareSettlement({
      caller: maker,
      rfq: rfq.address,
      response: rfqResponse.address,
      legAmountToPrepare: 8,
    });

    // await cvg.rfqs().prepareMoreLegsSettlement({
    //   caller: taker,
    //   rfq: rfq.address,
    //   response: rfqResponse.address,
    //   legAmountToPrepare: 5,
    // });
    // await cvg.rfqs().prepareMoreLegsSettlement({
    //   caller: maker,
    //   rfq: rfq.address,
    //   response: rfqResponse.address,
    //   legAmountToPrepare: 5,
    // });

    let refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

    spok(t, refreshedResponse, {
      $topic: 'same model',
      state: StoredResponseState.ReadyForSettling,
    });

    // await cvg.rfqs().partiallySettleLegs({
    //   rfq: rfq.address,
    //   response: rfqResponse.address,
    //   maker: maker.publicKey,
    //   taker: taker.publicKey,
    //   legAmountToSettle: 3,
    // });

    await cvg.rfqs().partiallySettleLegsAndSettle({
      maker: maker.publicKey,
      taker: taker.publicKey,
      rfq: rfq.address,
      response: rfqResponse.address,
      // legAmountToSettle: 22,
      legAmountToSettle: 8,
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

  test('[rfqModule] it can find RFQs by instrument (specifying page params)', async (t: Test) => {
    const rfqPages1 = await cvg.rfqs().findRfqsByInstrument({
      instrumentProgram: cvg.programs().getSpotInstrument(),
      rfqsPerPage: 5,
      numPages: 4,
    });

    for (const rfqPage of rfqPages1) {
      console.log('new page');

      for (const rfq of rfqPage) {
        console.log('rfq address: ' + rfq.address.toString());
      }
    }
    t.assert(rfqPages1.length === 4, 'returned 4 pages');

    const rfqPages2 = await cvg.rfqs().findRfqsByInstrument({
      instrumentProgram: cvg.programs().getSpotInstrument(),
    });

    for (const rfqPage of rfqPages2) {
      console.log('new page');

      for (const rfq of rfqPage) {
        console.log('rfq address: ' + rfq.address.toString());
      }
    }
    t.assert(rfqPages2.length === 1, 'returned 1 page');
  });

  test('[rfqModule] it can create Rfqs with decimal amounts and find Rfqs by address', async (t: Test) => {
    const { rfq: rfq1 } = await cvg.rfqs().createAndFinalize({
      taker,
      instruments: [
        new SpotInstrument(cvg, btcMint, {
          amount: 5,
          side: Side.Bid,
        }),
        new SpotInstrument(cvg, btcMint, {
          amount: 7,
          side: Side.Ask,
        }),
      ],
      orderType: OrderType.TwoWay,
      fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
      quoteAsset: cvg
        .instrument(new SpotInstrument(cvg, usdcMint))
        .toQuoteAsset(),
    });
    const { rfq: rfq2 } = await cvg.rfqs().createAndFinalize({
      instruments: [
        new SpotInstrument(cvg, btcMint, {
          amount: 2.56,
          side: Side.Bid,
        }),
        new SpotInstrument(cvg, btcMint, {
          amount: 9.84,
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
    const { rfq: rfq3 } = await cvg.rfqs().createAndFinalize({
      taker,
      instruments: [
        new SpotInstrument(cvg, btcMint, {
          amount: 999999,
          side: Side.Bid,
        }),
      ],
      orderType: OrderType.TwoWay,
      fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
      quoteAsset: cvg
        .instrument(new SpotInstrument(cvg, usdcMint))
        .toQuoteAsset(),
    });

    const foundRfq1 = await cvg
      .rfqs()
      .findRfqByAddress({ address: rfq1.address });
    const foundRfq2 = await cvg
      .rfqs()
      .findRfqByAddress({ address: rfq2.address });
    const foundRfq3 = await cvg
      .rfqs()
      .findRfqByAddress({ address: rfq3.address });

    spok(t, foundRfq1.fixedSize, {
      $topic:
        'Found RFQ1 by address and assert the fixedSize.legsMultiplierBps',
      __kind: 'BaseAsset',
      legsMultiplierBps: 1,
    });
    spok(t, foundRfq1.legs[0], {
      $topic: 'Found RFQ1 by address and assert the amount of legs[0]',
      instrumentAmount: 5,
    });
    spok(t, foundRfq1.legs[1], {
      $topic: 'Found RFQ1 by address and assert the amount of legs[1]',
      instrumentAmount: 7,
    });
    spok(t, foundRfq2.fixedSize, {
      $topic: 'Found RFQ2 by address and assert the fixedSize.__kind',
      __kind: 'None',
    });
    spok(t, foundRfq2.legs[0], {
      $topic: 'Found RFQ2 by address and assert the amount of legs[0]',
      instrumentAmount: 2.56,
    });
    spok(t, foundRfq2.legs[1], {
      $topic: 'Found RFQ2 by address and assert the amount of legs[1]',
      instrumentAmount: 9.84,
    });
    spok(t, foundRfq3.fixedSize, {
      $topic: 'Found RFQ2 by address and assert the fixedSize.quoteAmount',
      __kind: 'QuoteAsset',
      quoteAmount: 1,
    });
    spok(t, foundRfq3.legs[0], {
      $topic: 'Found RFQ3 by address and assert the amount of legs[0]',
      instrumentAmount: 999999,
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

  test('[helpers] create europeanProgram', async (t: Test) => {
    const europeanProgram = await createEuropeanProgram(cvg);
    t.assert(europeanProgram);
  });

  test('[riskEngineModule] it can calculate collateral for fixed quote size RFQ creation (Psyoptions Euro)', async (t: Test) => {
    const { euroMeta, euroMetaKey } = await initializeNewOptionMeta(
      cvg,
      oracle,
      europeanProgram,
      btcMint,
      usdcMint,
      17_500,
      1,
      3_600
    );

    const legs = [
      await SpotInstrument.createForLeg(cvg, btcMint, 5, Side.Bid).toLegData(),
      await PsyoptionsEuropeanInstrument.createForLeg(
        cvg,
        btcMint,
        OptionType.PUT,
        euroMeta,
        euroMetaKey,
        5,
        Side.Bid
      ).toLegData(),
    ];

    const riskOutput = await cvg.riskEngine().calculateCollateralForRfq({
      fixedSize: {
        __kind: 'QuoteAsset',
        quoteAmount: 100,
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

  test('[rfqModule] it can create and finalize Rfq (QuoteAsset), respond, and cancel response', async (t: Test) => {
    await sleep(2000);

    const { euroMeta, euroMetaKey } = await initializeNewOptionMeta(
      cvg,
      oracle,
      europeanProgram,
      btcMint,
      usdcMint,
      23_354,
      1,
      3_600
    );
    const psyopEuroInstrument1 = new PsyoptionsEuropeanInstrument(
      cvg,
      btcMint,
      OptionType.CALL,
      euroMeta,
      euroMetaKey,
      {
        amount: 3.769,
        side: Side.Ask,
      }
    );
    const psyopEuroInstrument2 = new PsyoptionsEuropeanInstrument(
      cvg,
      btcMint,
      OptionType.PUT,
      euroMeta,
      euroMetaKey,
      {
        amount: 3.89,
        side: Side.Bid,
      }
    );

    const { rfq } = await cvg.rfqs().createAndFinalize({
      taker,
      instruments: [psyopEuroInstrument1, psyopEuroInstrument2],
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
  test('[rfqModule] it can create and finalize Rfq (QuoteAsset), respond, and cancel response', async (t: Test) => {
    const { euroMeta, euroMetaKey } = await initializeNewOptionMeta(
      cvg,
      oracle,
      europeanProgram,
      btcMint,
      usdcMint,
      23_354,
      1,
      3_600
    );
    const psyopEuroInstrument1 = new PsyoptionsEuropeanInstrument(
      cvg,
      btcMint,
      OptionType.CALL,
      euroMeta,
      euroMetaKey,
      {
        amount: 3.769,
        side: Side.Ask,
      }
    );
    const psyopEuroInstrument2 = new PsyoptionsEuropeanInstrument(
      cvg,
      btcMint,
      OptionType.PUT,
      euroMeta,
      euroMetaKey,
      {
        amount: 3.89,
        side: Side.Bid,
      }
    );

    const { rfq } = await cvg.rfqs().createAndFinalize({
      taker,
      instruments: [psyopEuroInstrument1, psyopEuroInstrument2],
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

  test('init new option meta again', async () => {
    await initializeNewOptionMeta(
      cvg,
      oracle,
      europeanProgram,
      btcMint,
      usdcMint,
      23_333,
      1,
      3_600
    );
  });
  test('init new option meta again x2', async () => {
    await sleep(2000).then(async () => {
      await initializeNewOptionMeta(
        cvg,
        oracle,
        europeanProgram,
        btcMint,
        usdcMint,
        23_505,
        1,
        3_600
      );
    });
  });
  test('init new option meta again x3', async () => {
    await sleep(2000).then(async () => {
      await initializeNewOptionMeta(
        cvg,
        oracle,
        europeanProgram,
        btcMint,
        usdcMint,
        21_505,
        1,
        3_600
      );
    });
  });

  test('[american program] it can create american program', async (t: Test) => {
    const americanProgram = createAmericanProgram(cvg);

    t.assert(americanProgram, 'created american program');
  });

  //*<>*<>*END NON-INTERDEPENDENT TESTS WRAPPER*<>*<>*//
});
