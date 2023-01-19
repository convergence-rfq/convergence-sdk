import test, { Test } from 'tape';
import spok from 'spok';
import { Keypair } from '@solana/web3.js';
//@ts-ignore
import { sleep } from '@bundlr-network/client/build/common/utils';
import {
  SWITCHBOARD_BTC_ORACLE,
  SWITCHBOARD_SOL_ORACLE,
  SKIP_PREFLIGHT,
  convergenceCli,
  killStuckProcess,
  spokSamePubkey,
  initializeNewOptionMeta,
  setupAccounts,
  BTC_DECIMALS,
  USDC_DECIMALS,
  //@ts-ignore
  spokSameBignum,
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
  //@ts-ignore
  StoredResponseState,
  AuthoritySide,
  StoredRfqState,
  legsToInstruments,
  Signer,
} from '@/index';
import { instructions } from '@mithraic-labs/tokenized-euros';

killStuckProcess();
//@ts-ignore
const { mintOptions } = instructions;

let cvg: Convergence;

let usdcMint: Mint;
let btcMint: Mint;
let solMint: Mint;

let dao: Signer;

let maker: Keypair; // LxnEKWoRhZizxg4nZJG8zhjQhCLYxcTjvLp9ATDUqNS
let taker: Keypair; // BDiiVDF1aLJsxV6BDnP3sSVkCEm9rBt7n1T1Auq1r4Ux

let daoBTCWallet: Token;
let daoUSDCWallet: Token;

let makerUSDCWallet: Token;
let makerBTCWallet: Token;

let takerUSDCWallet: Token;
let takerBTCWallet: Token;
let takerSOLWallet: Token;

const WALLET_AMOUNT = 9_000 * 10 ** BTC_DECIMALS;
const COLLATERAL_AMOUNT = 1_000_000 * 10 ** USDC_DECIMALS;

// let ctx;

// SETUP

test('[setup] it can create Convergence instance', async (t: Test) => {
  cvg = await convergenceCli(SKIP_PREFLIGHT);

  dao = cvg.rpc().getDefaultFeePayer();

  const context = await setupAccounts(cvg, WALLET_AMOUNT, dao.publicKey);
  // ctx = context;

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

  t.same(
    takerCollateralTokenAccount.mintAddress.toString(),
    collateralMint.address.toString(),
    'same address'
  );
  spok(t, takerCollateralTokenAccount, {
    $topic: 'collateral model',
    model: 'token',
    amount: token(COLLATERAL_AMOUNT),
  });

  t.same(
    makerCollateralTokenAccount.mintAddress.toString(),
    collateralMint.address.toString(),
    'same address'
  );
  spok(t, makerCollateralTokenAccount, {
    $topic: 'collateral model',
    model: 'token',
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
});

// RFQ

test('[rfqModule] it can create and finalize RFQ construction', async (t: Test) => {
  const { rfq } = await cvg.rfqs().create({
    quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
    instruments: [
      new SpotInstrument(cvg, solMint, {
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

  const { rfq: finalizedRfq } = await cvg.rfqs().finalizeRfqConstruction({
    taker,
    rfq: rfq.address,
    // baseAssetIndex: { value: 1 },
  });

  spok(t, finalizedRfq, {
    $topic: 'Finalized RFQ',
    model: 'rfq',
    state: StoredRfqState.Active,
  });
});

// test('[rfqModule] it can create and finalize RFQ in single method', async (t: Test) => {
//   const { rfq } = await cvg.rfqs().createAndFinalize({
//     instruments: [
//       new SpotInstrument(cvg, btcMint, {
//         amount: 1,
//         side: Side.Bid,
//       }),
//       new SpotInstrument(cvg, btcMint, {
//         amount: 2,
//         side: Side.Bid,
//       }),
//       new SpotInstrument(cvg, solMint, {
//         amount: 5,
//         side: Side.Bid,
//       }),
//     ],
//     taker,
//     orderType: OrderType.Sell,
//     fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
//     quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
//   });

//   const foundRfq = await cvg.rfqs().findRfqByAddress({ address: rfq.address });

//   spok(t, rfq, {
//     $topic: 'Created RFQ',
//     model: 'rfq',
//     address: spokSamePubkey(foundRfq.address),
//     state: StoredRfqState.Active,
//   });
// });

// test('[rfqModule] it can create and finalize, then respond to RFQ and confirm response', async (t: Test) => {
//   const { rfq } = await cvg.rfqs().createAndFinalize({
//     instruments: [
//       new SpotInstrument(cvg, btcMint, {
//         amount: 5,
//         side: Side.Ask,
//       }),
//     ],
//     taker,
//     orderType: OrderType.TwoWay,
//     fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
//     quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
//   });
//   const { rfqResponse } = await cvg.rfqs().respond({
//     maker,
//     rfq: rfq.address,
//     bid: {
//       __kind: 'FixedSize',
//       priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
//     },
//     ask: null,
//     keypair: Keypair.generate(),
//   });

//   const respondedToRfq = await cvg.rfqs().refreshRfq(rfq.address);

//   spok(t, rfq, {
//     $topic: 'Finalized Rfq',
//     model: 'rfq',
//     address: spokSamePubkey(respondedToRfq.address),
//   });
//   spok(t, rfqResponse, {
//     $topic: 'Responded to Rfq',
//     model: 'response',
//     state: StoredResponseState.Active,
//   });
// });

test('[rfqModule] it can create and finalize RFQ, cancel RFQ, unlock RFQ collateral, and clean up RFQ', async (t: Test) => {
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
    // baseAssetIndex: { value: 0 },
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

  spok(t, refreshedRfq, {
    $topic: 'Unlocked rfq collateral',
    model: 'rfq',
    // nonResponseTakerCollateralLocked: new BN(0),
  });

  await cvg.rfqs().cleanUpRfq({
    rfq: rfq.address,
    taker: taker.publicKey,
  });
});

// test('[rfqModule] it can create and finalize RFQ, respond, confirm response, prepare settlement, prepare more legs settlement, settle', async (t: Test) => {
//   const { rfq } = await cvg.rfqs().createAndFinalize({
//     instruments: [
//       new SpotInstrument(cvg, btcMint, {
//         amount: 5,
//         side: Side.Bid,
//       }),
//       new SpotInstrument(cvg, btcMint, {
//         amount: 5,
//         side: Side.Ask,
//       }),
//       new SpotInstrument(cvg, btcMint, {
//         amount: 2,
//         side: Side.Ask,
//       }),
//     ],
//     taker,
//     orderType: OrderType.TwoWay,
//     fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
//     quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
//   });
//   const { rfqResponse } = await cvg.rfqs().respond({
//     maker,
//     rfq: rfq.address,
//     bid: {
//       __kind: 'FixedSize',
//       priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
//     },
//     ask: null,
//     keypair: Keypair.generate(),
//   });

//   await cvg.rfqs().confirmResponse({
//     taker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: Side.Bid,
//     overrideLegMultiplierBps: null,
//   });

//   await cvg.rfqs().prepareSettlement({
//     caller: taker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: AuthoritySide.Taker,
//     legAmountToPrepare: 2,
//     quoteMint: usdcMint,
//     baseAssetMints: [btcMint, btcMint],
//   });

//   await cvg.rfqs().prepareSettlement({
//     caller: maker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: AuthoritySide.Maker,
//     legAmountToPrepare: 2,
//     quoteMint: usdcMint,
//     baseAssetMints: [btcMint, btcMint],
//   });

//   await cvg.rfqs().prepareMoreLegsSettlement({
//     caller: taker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: AuthoritySide.Taker,
//     legAmountToPrepare: 1,
//     baseAssetMints: [btcMint],
//   });

//   await cvg.rfqs().prepareMoreLegsSettlement({
//     caller: maker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: AuthoritySide.Maker,
//     legAmountToPrepare: 1,
//     baseAssetMints: [btcMint],
//   });

//   let refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

//   spok(t, refreshedResponse, {
//     $topic: 'Prepared Settlement',
//     model: 'response',
//     state: StoredResponseState.ReadyForSettling,
//   });

//   await cvg.rfqs().settle({
//     maker: maker.publicKey,
//     taker: taker.publicKey,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     baseAssetMints: [btcMint, btcMint, btcMint],
//     quoteMint: usdcMint,
//   });

//   refreshedResponse = await cvg.rfqs().refreshResponse(refreshedResponse);

//   spok(t, refreshedResponse, {
//     $topic: 'Settled',
//     model: 'response',
//     state: StoredResponseState.Settled,
//   });
// });

// test('[rfqModule] it can create/finalize Rfq, respond, confirm resp, prepare settlemt, settle, unlock resp collat, and clean up resp legs', async (t: Test) => {
//   const { rfq } = await cvg.rfqs().createAndFinalize({
//     instruments: [
//       new SpotInstrument(cvg, btcMint, {
//         amount: 5,
//         side: Side.Bid,
//       }),
//       new SpotInstrument(cvg, btcMint, {
//         amount: 3,
//         side: Side.Ask,
//       }),
//     ],
//     taker,
//     orderType: OrderType.TwoWay,
//     fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
//     quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
//     activeWindow: 5_000,
//     settlingWindow: 1_000,
//   });
//   const { rfqResponse } = await cvg.rfqs().respond({
//     maker,
//     rfq: rfq.address,
//     bid: {
//       __kind: 'FixedSize',
//       priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
//     },
//     ask: null,
//     keypair: Keypair.generate(),
//   });

//   await cvg.rfqs().confirmResponse({
//     taker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: Side.Bid,
//     overrideLegMultiplierBps: null,
//   });

//   // TODO: we have to pass the baseAssetMints manually
//   // we need a method with type (baseAssetIndex) -> Mint or MintPubkey
//   // then the baseAssetMints could be extracted from the rfq's legs
//   await cvg.rfqs().prepareSettlement({
//     caller: taker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: AuthoritySide.Taker,
//     legAmountToPrepare: 2,
//     quoteMint: usdcMint,
//     baseAssetMints: [btcMint, btcMint],
//   });
//   const firstToPrepare = taker.publicKey;

//   await cvg.rfqs().prepareSettlement({
//     caller: maker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: AuthoritySide.Maker,
//     legAmountToPrepare: 2,
//     quoteMint: usdcMint,
//     baseAssetMints: [btcMint, btcMint],
//   });

//   let refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

//   spok(t, refreshedResponse, {
//     $topic: 'Prepared Settlement',
//     model: 'response',
//     state: StoredResponseState.ReadyForSettling,
//   });

//   await cvg.rfqs().settle({
//     maker: maker.publicKey,
//     taker: taker.publicKey,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     baseAssetMints: [btcMint, btcMint],
//     quoteMint: usdcMint,
//   });

//   refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

//   spok(t, refreshedResponse, {
//     $topic: 'Settled',
//     model: 'response',
//     state: StoredResponseState.Settled,
//   });

//   //unlockResponseCollateral

//   await cvg.rfqs().unlockResponseCollateral({
//     rfq: rfq.address,
//     response: rfqResponse.address,
//   });

//   //TODO: fix BN types (test currently passes, value is 0 on both sides)
//   spok(t, refreshedResponse, {
//     $topic: 'Unlocked response collateral',
//     model: 'response',
//     // makerCollateralLocked: new BN(0),
//     // takerCollateralLocked: new BN(0),
//   });

//   await cvg.rfqs().cleanUpResponseLegs({
//     dao: dao.publicKey,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     firstToPrepare,
//     baseAssetMints: [btcMint],
//     legAmountToClear: 1,
//   });
// });

// test('[rfqModule] it can create/finalize Rfq, respond, confirm resp, prepare settlemt, partially settle legs', async (t: Test) => {
//   const { rfq } = await cvg.rfqs().createAndFinalize({
//     instruments: [
//       new SpotInstrument(cvg, btcMint, {
//         amount: 5,
//         side: Side.Bid,
//       }),
//       new SpotInstrument(cvg, btcMint, {
//         amount: 3,
//         side: Side.Ask,
//       }),
//     ],
//     taker,
//     orderType: OrderType.TwoWay,
//     fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
//     quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
//     activeWindow: 5_000,
//     settlingWindow: 1_000,
//   });
//   const { rfqResponse } = await cvg.rfqs().respond({
//     maker,
//     rfq: rfq.address,
//     bid: {
//       __kind: 'FixedSize',
//       priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
//     },
//     ask: null,
//     keypair: Keypair.generate(),
//   });

//   await cvg.rfqs().confirmResponse({
//     taker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: Side.Bid,
//     overrideLegMultiplierBps: null,
//   });

//   // TODO: we have to pass the baseAssetMints manually
//   // we need a method with type (baseAssetIndex) -> Mint or MintPubkey
//   // then the baseAssetMints could be extracted from the rfq's legs
//   await cvg.rfqs().prepareSettlement({
//     caller: taker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: AuthoritySide.Taker,
//     legAmountToPrepare: 2,
//     quoteMint: usdcMint,
//     baseAssetMints: [btcMint, btcMint],
//   });
//   // const firstToPrepare = taker.publicKey;

//   await cvg.rfqs().prepareSettlement({
//     caller: maker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: AuthoritySide.Maker,
//     legAmountToPrepare: 2,
//     quoteMint: usdcMint,
//     baseAssetMints: [btcMint, btcMint],
//   });

//   let refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

//   spok(t, refreshedResponse, {
//     $topic: 'Prepared Settlement',
//     model: 'response',
//     state: StoredResponseState.ReadyForSettling,
//   });

//   await cvg.rfqs().partiallySettleLegs({
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     maker: maker.publicKey,
//     taker: taker.publicKey,
//     legAmountToSettle: 1,
//     baseAssetMints: [btcMint],
//   });

//   await cvg.rfqs().settle({
//     maker: maker.publicKey,
//     taker: taker.publicKey,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     baseAssetMints: [btcMint],
//     quoteMint: usdcMint,
//   });

//   refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

//   spok(t, refreshedResponse, {
//     $topic: 'Settled',
//     model: 'response',
//     state: StoredResponseState.Settled,
//   });
// });

// test('[rfqModule] it can create/finalize Rfq, respond, confirm resp, prepare settlemt, settle, unlock resp collat, and clean up response', async (t: Test) => {
//   const { rfq } = await cvg.rfqs().createAndFinalize({
//     instruments: [
//       new SpotInstrument(cvg, btcMint, {
//         amount: 5,
//         side: Side.Bid,
//       }),
//     ],
//     taker,
//     orderType: OrderType.TwoWay,
//     fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
//     quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
//     activeWindow: 5_000,
//     settlingWindow: 1_000,
//   });
//   const { rfqResponse } = await cvg.rfqs().respond({
//     maker,
//     rfq: rfq.address,
//     bid: {
//       __kind: 'FixedSize',
//       priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
//     },
//     ask: null,
//     keypair: Keypair.generate(),
//   });

//   await cvg.rfqs().confirmResponse({
//     taker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: Side.Bid,
//     overrideLegMultiplierBps: null,
//   });

//   // TODO: we have to pass the baseAssetMints manually
//   // we need a method with type (baseAssetIndex) -> Mint or MintPubkey
//   // then the baseAssetMints could be extracted from the rfq's legs
//   await cvg.rfqs().prepareSettlement({
//     caller: taker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: AuthoritySide.Taker,
//     legAmountToPrepare: 1,
//     quoteMint: usdcMint,
//     baseAssetMints: [btcMint],
//   });
//   const firstToPrepare = taker.publicKey;

//   await cvg.rfqs().prepareSettlement({
//     caller: maker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: AuthoritySide.Maker,
//     legAmountToPrepare: 1,
//     quoteMint: usdcMint,
//     baseAssetMints: [btcMint],
//   });

//   let refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

//   spok(t, refreshedResponse, {
//     $topic: 'Prepared Settlement',
//     model: 'response',
//     state: StoredResponseState.ReadyForSettling,
//   });

//   await cvg.rfqs().settle({
//     maker: maker.publicKey,
//     taker: taker.publicKey,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     baseAssetMints: [btcMint],
//     quoteMint: usdcMint,
//   });

//   refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

//   spok(t, refreshedResponse, {
//     $topic: 'Settled',
//     model: 'response',
//     state: StoredResponseState.Settled,
//   });

//   await cvg.rfqs().unlockResponseCollateral({
//     rfq: rfq.address,
//     response: rfqResponse.address,
//   });

//   //TODO: fix BN types (test currently passes, value is 0 on both sides)
//   spok(t, refreshedResponse, {
//     $topic: 'Unlocked response collateral',
//     model: 'response',
//     // makerCollateralLocked: new BN(0),
//     // takerCollateralLocked: new BN(0),
//   });

//   refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

//   await cvg.rfqs().cleanUpResponse({
//     maker: maker.publicKey,
//     dao: dao.publicKey,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     firstToPrepare,
//     baseAssetMints: [btcMint],
//     quoteMint: usdcMint,
//   });
// });

// test('[rfqModule] it can create and finalize Rfq, respond, and cancel response', async (t: Test) => {
//   const { rfq } = await cvg.rfqs().createAndFinalize({
//     instruments: [
//       new SpotInstrument(cvg, btcMint, {
//         amount: 5,
//         side: Side.Bid,
//       }),
//     ],
//     taker,
//     orderType: OrderType.TwoWay,
//     fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
//     quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
//   });
//   const { rfqResponse } = await cvg.rfqs().respond({
//     maker,
//     rfq: rfq.address,
//     bid: {
//       __kind: 'FixedSize',
//       priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
//     },
//     ask: null,
//     keypair: Keypair.generate(),
//   });

//   await cvg.rfqs().cancelResponse({
//     maker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//   });

//   const refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

//   spok(t, refreshedResponse, {
//     $topic: 'Cancelled response',
//     model: 'response',
//     state: StoredResponseState.Canceled,
//   });
// });

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
  const instruments = await cvg.rfqs().findByInstrument({
    instrumentProgram: cvg.programs().getSpotInstrument(),
  });
  console.error(instruments);
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

// test('[riskEngineModule] it can calculate collateral for response', async (t: Test) => {
//   const { rfq } = await cvg.rfqs().createAndFinalize({
//     instruments: [
//       new SpotInstrument(cvg, btcMint, {
//         amount: 5,
//         side: Side.Ask,
//       }),
//     ],
//     taker,
//     orderType: OrderType.TwoWay,
//     fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
//     quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
//   });
//   const { rfqResponse } = await cvg.rfqs().respond({
//     maker,
//     rfq: rfq.address,
//     bid: {
//       __kind: 'FixedSize',
//       priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
//     },
//     ask: null,
//     keypair: Keypair.generate(),
//   });

//   await cvg.riskEngine().calculateCollateralForResponse({
//     rfq: rfq.address,
//     response: rfqResponse.address,
//   });
//   spok(t, rfqResponse, {
//     $topic: 'calculate collateral for response',
//     model: 'response',
//     address: spokSamePubkey(rfqResponse.address),
//   });
// });

// test('[riskEngineModule] it can calculate collateral for confirm response', async (t: Test) => {
//   const { rfq } = await cvg.rfqs().createAndFinalize({
//     instruments: [
//       new SpotInstrument(cvg, btcMint, {
//         amount: 5,
//         side: Side.Ask,
//       }),
//     ],
//     taker,
//     orderType: OrderType.TwoWay,
//     fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
//     quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
//     activeWindow: 5_000,
//     settlingWindow: 1_000,
//   });

//   const { rfqResponse } = await cvg.rfqs().respond({
//     maker,
//     rfq: rfq.address,
//     bid: {
//       __kind: 'FixedSize',
//       priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
//     },
//     ask: null,
//     keypair: Keypair.generate(),
//   });

//   const respondedToRfq = await cvg.rfqs().refreshRfq(rfq.address);
//   t.same(
//     rfq.address.toString(),
//     respondedToRfq.address.toString(),
//     'same address'
//   );
//   spok(t, rfq, {
//     $topic: 'rfq model',
//     model: 'rfq',
//   });
//   spok(t, rfqResponse, {
//     $topic: 'rfq model',
//     model: 'response',
//     state: StoredResponseState.Active,
//   });

//   await cvg.rfqs().confirmResponse({
//     taker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: Side.Bid,
//     overrideLegMultiplierBps: null,
//   });

//   await cvg.riskEngine().calculateCollateralForConfirmation({
//     rfq: rfq.address,
//     response: rfqResponse.address,
//   });
// });

// PSYOPTIONS EUROPEANS

// test('[rfqModule] it can create and finalize RFQ, respond, confirm response, prepare settlement, prepare more legs settlement, settle', async (t: Test) => {
//   const { rfq } = await cvg.rfqs().createAndFinalize({
//     instruments: [
//       new SpotInstrument(cvg, btcMint, {
//         amount: 5,
//         side: Side.Bid,
//       }),
//       new SpotInstrument(cvg, btcMint, {
//         amount: 5,
//         side: Side.Ask,
//       }),
//       new SpotInstrument(cvg, btcMint, {
//         amount: 2,
//         side: Side.Ask,
//       }),
//     ],
//     taker,
//     orderType: OrderType.TwoWay,
//     fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
//     quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
//   });
//   const { rfqResponse } = await cvg.rfqs().respond({
//     maker,
//     rfq: rfq.address,
//     bid: {
//       __kind: 'FixedSize',
//       priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
//     },
//     ask: null,
//     keypair: Keypair.generate(),
//   });

//   await cvg.rfqs().confirmResponse({
//     taker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: Side.Bid,
//     overrideLegMultiplierBps: null,
//   });

//   await cvg.rfqs().prepareSettlement({
//     caller: taker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: AuthoritySide.Taker,
//     legAmountToPrepare: 2,
//     quoteMint: usdcMint,
//     baseAssetMints: [btcMint, btcMint],
//   });

//   await cvg.rfqs().prepareSettlement({
//     caller: maker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: AuthoritySide.Maker,
//     legAmountToPrepare: 2,
//     quoteMint: usdcMint,
//     baseAssetMints: [btcMint, btcMint],
//   });

//   await cvg.rfqs().prepareMoreLegsSettlement({
//     caller: taker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: AuthoritySide.Taker,
//     legAmountToPrepare: 1,
//     baseAssetMints: [btcMint],
//   });

//   await cvg.rfqs().prepareMoreLegsSettlement({
//     caller: maker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: AuthoritySide.Maker,
//     legAmountToPrepare: 1,
//     baseAssetMints: [btcMint],
//   });

//   let refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

//   spok(t, refreshedResponse, {
//     $topic: 'Prepared Settlement',
//     model: 'response',
//     state: StoredResponseState.ReadyForSettling,
//   });

//   await cvg.rfqs().settle({
//     maker: maker.publicKey,
//     taker: taker.publicKey,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     baseAssetMints: [btcMint, btcMint, btcMint],
//     quoteMint: usdcMint,
//   });

//   refreshedResponse = await cvg.rfqs().refreshResponse(refreshedResponse);

//   spok(t, refreshedResponse, {
//     $topic: 'Settled',
//     model: 'response',
//     state: StoredResponseState.Settled,
//   });
// });

test('[psyoptionsEuropeanInstrumentModule] it can create and finalize RFQ w/ PsyOptions Euro, respond, confirm, prepare, settle', async (t: Test) => {
  const { euroMeta, euroMetaKey } = await initializeNewOptionMeta(
    cvg,
    btcMint,
    usdcMint,
    17_500,
    1_000_000,
    3_600,
    takerUSDCWallet,
    makerUSDCWallet
  );

  const { rfq } = await cvg.rfqs().create({
    taker,
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

  const euroMetaPutOptionMint = await cvg
    .tokens()
    .findMintByAddress({ address: euroMeta.putOptionMint });

  //need to init token account for taker and euroMetaPutOptionMint and fund it

  await cvg.rfqs().prepareSettlement({
    caller: taker,
    rfq: rfq.address,
    response: rfqResponse.address,
    side: AuthoritySide.Taker,
    legAmountToPrepare: 1,
    quoteMint: usdcMint,
    baseAssetMints: [euroMetaPutOptionMint],
  });

  await cvg.rfqs().prepareSettlement({
    caller: maker,
    rfq: rfq.address,
    response: rfqResponse.address,
    side: AuthoritySide.Maker,
    legAmountToPrepare: 1,
    quoteMint: usdcMint,
    baseAssetMints: [euroMetaPutOptionMint],
  });

  await cvg.rfqs().settle({
    maker: maker.publicKey,
    taker: taker.publicKey,
    rfq: rfq.address,
    response: rfqResponse.address,
    baseAssetMints: [euroMetaPutOptionMint],
    quoteMint: usdcMint,
  });

  const foundRfq = await cvg.rfqs().findRfqByAddress({ address: rfq.address });
  t.same(foundRfq.address.toString(), rfq.address.toString(), 'same address');
  spok(t, rfq, {
    $topic: 'rfq model',
    model: 'rfq',
  });
});

test('[rfqModule] it can add legs to  rfq', async (t: Test) => {
  const instruments: (SpotInstrument | PsyoptionsEuropeanInstrument)[] = [];

  instruments.push(
    new SpotInstrument(cvg, btcMint, {
      amount: 5,
      side: Side.Ask,
    })
  );
  instruments.push(
    new SpotInstrument(cvg, btcMint, {
      amount: 10,
      side: Side.Ask,
    })
  );
  instruments.push(
    new SpotInstrument(cvg, btcMint, {
      amount: 10,
      side: Side.Ask,
    })
  );

  let expLegSize = 4;

  for (const instrument of instruments) {
    const instrumentClient = cvg.instrument(instrument, instrument.legInfo);
    expLegSize += await instrumentClient.getLegDataSize();
  }

  const { rfq } = await cvg.rfqs().create({
    instruments: [
      new SpotInstrument(cvg, btcMint, {
        amount: 5,
        side: Side.Ask,
      }),
    ],
    taker,
    legSize: expLegSize,
    orderType: OrderType.TwoWay,
    fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
    quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
  });

  await cvg.rfqs().addLegsToRfq({
    taker,
    rfq: rfq.address,
    legs: [
      new SpotInstrument(cvg, btcMint, {
        amount: 10,
        side: Side.Ask,
      }),
      new SpotInstrument(cvg, btcMint, {
        amount: 10,
        side: Side.Ask,
      }),
    ],
  });

  spok(t, rfq, {
    $topic: 'Added leg to Rfq',
    model: 'rfq',
    address: spokSamePubkey(rfq.address),
  });
});

// RFQ HELPERS

test('[rfqModule] it can convert RFQ legs to instruments', async (t: Test) => {
  // We we can to this after creating options so that we can test this method
  // on all instruments
  const rfqs = await cvg.rfqs().findAllByOwner({
    owner: taker.publicKey,
  });
  const instruments = await Promise.all(
    rfqs.map(async (rfq) => legsToInstruments(cvg, rfq.legs))
  );
  spok(t, instruments[0][0], {
    $topic: 'Convert RFQ Legs to Instruments',
    model: 'spotInstrument',
  });
});

// test('[rfqModule] it can create and finalize RFQ, respond, confirm response, revert settlemt prep', async (t: Test) => {
//   const { rfq } = await cvg.rfqs().createAndFinalize({
//     instruments: [
//       new SpotInstrument(cvg, btcMint, {
//         amount: 5,
//         side: Side.Bid,
//       }),
//     ],
//     taker,
//     orderType: OrderType.TwoWay,
//     fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
//     quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
//     activeWindow: 2,
//     settlingWindow: 1,
//   });
//   const { rfqResponse } = await cvg.rfqs().respond({
//     maker,
//     rfq: rfq.address,
//     bid: {
//       __kind: 'FixedSize',
//       priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
//     },
//     ask: null,
//     keypair: Keypair.generate(),
//   });

//   await cvg.rfqs().confirmResponse({
//     taker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: Side.Bid,
//     overrideLegMultiplierBps: null,
//   });

//   await cvg.rfqs().prepareSettlement({
//     caller: maker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: AuthoritySide.Maker,
//     legAmountToPrepare: 1,
//     quoteMint: usdcMint,
//     baseAssetMints: [btcMint],
//   });

//   await sleep(3_001).then(async () => {
//     await cvg.rfqs().revertSettlementPreparation({
//       rfq: rfq.address,
//       response: rfqResponse.address,
//       quoteMint: usdcMint,
//       baseAssetMints: [btcMint],
//       side: AuthoritySide.Maker,
//     });
//   });

//   // let refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

//   // sleep(3001).then(() => {
//   //   spok(t, refreshedResponse, {
//   //     $topic: 'Revert settlement preparations',
//   //     model: 'response',
//   //     makerPreparedLegs: spokSameBignum(0),
//   //   });
//   // });
// });

// test('[rfqModule] it can create and finalize RFQ, respond, confirm response, partly revert settlemt prep', async (t: Test) => {
//   console.log(solMint.address.toString());

//   const { rfq } = await cvg.rfqs().createAndFinalize({
//     instruments: [
//       new SpotInstrument(cvg, btcMint, {
//         amount: 5,
//         side: Side.Bid,
//       }),
//       new SpotInstrument(cvg, solMint, {
//         amount: 7,
//         side: Side.Ask,
//       }),
//     ],
//     taker,
//     orderType: OrderType.TwoWay,
//     fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
//     quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
//     activeWindow: 2,
//     settlingWindow: 1,
//   });
//   const { rfqResponse } = await cvg.rfqs().respond({
//     maker,
//     rfq: rfq.address,
//     bid: {
//       __kind: 'FixedSize',
//       priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
//     },
//     ask: null,
//     keypair: Keypair.generate(),
//   });

//   await cvg.rfqs().confirmResponse({
//     taker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: Side.Bid,
//     overrideLegMultiplierBps: null,
//   });

//   await cvg.rfqs().prepareSettlement({
//     caller: maker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: AuthoritySide.Maker,
//     legAmountToPrepare: 2,
//     quoteMint: usdcMint,
//     baseAssetMints: [btcMint, solMint],
//   });

//   // const refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

//   // const makerPreparedLegs = parseInt(
//   //   refreshedResponse.makerPreparedLegs.toString()
//   // );

//   await sleep(3_001).then(async () => {
//     await cvg.rfqs().partlyRevertSettlementPreparation({
//       rfq: rfq.address,
//       response: rfqResponse.address,
//       baseAssetMints: [btcMint],
//       side: AuthoritySide.Maker,
//       legAmountToRevert: 1,
//     });
//   });

//   // await sleep(3_001);
//   // spok(t, refreshedResponse, {
//   //   $topic: 'Partly revert settlement preparations',
//   //   model: 'response',
//   //   makerPreparedLegs: spokSameBignum(makerPreparedLegs - 1),
//   // });
// });

// test('[rfqModule] it can create and finalize RFQ, respond, confirm response, taker prepare settlement, settle 1 party default', async (t: Test) => {
//   const { rfq } = await cvg.rfqs().createAndFinalize({
//     instruments: [
//       new SpotInstrument(cvg, btcMint, {
//         amount: 5,
//         side: Side.Bid,
//       }),
//     ],
//     taker,
//     orderType: OrderType.TwoWay,
//     fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
//     quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
//     activeWindow: 2,
//     settlingWindow: 1,
//   });
//   const { rfqResponse } = await cvg.rfqs().respond({
//     maker,
//     rfq: rfq.address,
//     bid: {
//       __kind: 'FixedSize',
//       priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
//     },
//     ask: null,
//     keypair: Keypair.generate(),
//   });

//   await cvg.rfqs().confirmResponse({
//     taker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: Side.Bid,
//     overrideLegMultiplierBps: null,
//   });

//   await cvg.rfqs().prepareSettlement({
//     caller: taker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: AuthoritySide.Taker,
//     legAmountToPrepare: 1,
//     quoteMint: usdcMint,
//     baseAssetMints: [btcMint],
//   });

//   await sleep(3_001).then(async () => {
//     await cvg.rfqs().settleOnePartyDefault({
//       rfq: rfq.address,
//       response: rfqResponse.address,
//     });
//   });

//   // const refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

//   // await sleep(3_001);
//   // spok(t, refreshedResponse, {
//   //   $topic: 'Settle 1 party default',
//   //   model: 'response',
//   //   makerCollateralLocked: spokSameBignum(0),
//   // });
// });

// test('[rfqModule] it can create and finalize RFQ, respond, confirm response, settle 2 party default', async (t: Test) => {
//   const { rfq } = await cvg.rfqs().createAndFinalize({
//     instruments: [
//       new SpotInstrument(cvg, btcMint, {
//         amount: 5,
//         side: Side.Bid,
//       }),
//       new SpotInstrument(cvg, btcMint, {
//         amount: 5,
//         side: Side.Ask,
//       }),
//     ],
//     taker,
//     orderType: OrderType.TwoWay,
//     fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1_000_000_000 },
//     quoteAsset: cvg.instrument(new SpotInstrument(cvg, usdcMint)).toQuoteData(),
//     activeWindow: 2,
//     settlingWindow: 1,
//   });
//   const { rfqResponse } = await cvg.rfqs().respond({
//     maker,
//     rfq: rfq.address,
//     bid: {
//       __kind: 'FixedSize',
//       priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
//     },
//     ask: null,
//     keypair: Keypair.generate(),
//   });

//   await cvg.rfqs().confirmResponse({
//     taker,
//     rfq: rfq.address,
//     response: rfqResponse.address,
//     side: Side.Bid,
//     overrideLegMultiplierBps: null,
//   });

//   await sleep(3_001).then(async () => {
//     await cvg.rfqs().settleTwoPartyDefault({
//       rfq: rfq.address,
//       response: rfqResponse.address,
//     });
//   });

//   // const refreshedResponse = await cvg.rfqs().refreshResponse(rfqResponse);

//   // await sleep(3_001);
//   // spok(t, refreshedResponse, {
//   //   $topic: 'Settle 2 party default',
//   //   model: 'response',
//   //   takerCollateralLocked: spokSameBignum(0),
//   //   makerCollateralLocked: spokSameBignum(0),
//   // });
// });
