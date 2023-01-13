import test, { Test } from 'tape';
import spok from 'spok';
import { Keypair } from '@solana/web3.js';
import {
  StoredResponseState,
  StoredRfqState,
  AuthoritySide,
} from '@convergence-rfq/rfq';
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
  Rfq,
  Token,
  Signer,
} from '@/index';
import { Response } from '@/plugins/rfqModule/models/Response';

killStuckProcess();

let cvg: Convergence;

let usdcMint: Mint;
let btcMint: Mint;

let dao: Signer;

// LxnEKWoRhZizxg4nZJG8zhjQhCLYxcTjvLp9ATDUqNS
let maker: Keypair;
// BDiiVDF1aLJsxV6BDnP3sSVkCEm9rBt7n1T1Auq1r4Ux
let taker: Keypair;

let finalizedRfq: Rfq;
let response: Response;

const keypair: Keypair = Keypair.generate();

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
  spok(t, protocol, {
    $topic: 'Initialize Protocol',
    model: 'protocol',
    address: spokSamePubkey(cvg.protocol().pdas().protocol()),
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
  const protocol = await cvg.protocol().get();

  const { collateral: takerCollateral } = await cvg
    .collateral()
    .initializeCollateral({
      user: taker,
      collateralMint: protocol.collateralMint,
    });
  const { collateral: makerCollateral } = await cvg
    .collateral()
    .initializeCollateral({
      user: maker,
      collateralMint: protocol.collateralMint,
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
  const takerCollateralTokenPda = cvg
    .collateral()
    .pdas()
    .collateralToken({ user: taker.publicKey });
  const makerCollateralTokenPda = cvg
    .collateral()
    .pdas()
    .collateralToken({ user: maker.publicKey });
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
  const AMOUNT = 10;

  const protocol = await cvg.protocol().get();

  const collateralMint = await cvg
    .tokens()
    .findMintByAddress({ address: protocol.collateralMint });

  await cvg.collateral().withdrawCollateral({
    userTokens: takerUSDCWallet.address,
    user: taker,
    amount: AMOUNT,
  });
  await cvg.collateral().withdrawCollateral({
    userTokens: makerUSDCWallet.address,
    user: maker,
    amount: AMOUNT,
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
    // TODO: Add back in
    // amount: token(COLLATERAL_AMOUNT - AMOUNT),
  });
  spok(t, refreshedMakerUSDCWallet, {
    $topic: 'Withdraw Collateral',
    address: spokSamePubkey(makerUSDCWallet.address),
    mintAddress: spokSamePubkey(collateralMint.address),
    //amount: token(COLLATERAL_AMOUNT - amount),
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
    //amount: token(COLLATERAL_AMOUNT - amount),
  });
});

/*
 * RFQ
 */

test('[rfqModule] it can create a RFQ', async (t: Test) => {
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

// test('[rfqModule] it can finalize RFQ construction with BaseAsset', async (t: Test) => {
test('[rfqModule] it can finalize RFQ construction and cancel RFQ', async (t: Test) => {
  const quoteAsset = cvg
    .instrument(new SpotInstrument(cvg, usdcMint))
    .toQuoteData();
  const { rfq } = await cvg.rfqs().create({
    taker,
    quoteAsset,
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
  const quoteAsset = cvg
    .instrument(new SpotInstrument(cvg, usdcMint))
    .toQuoteData();
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
    quoteAsset,
  });

  const refreshedRfq = await cvg.rfqs().refreshRfq(rfq);

  finalizedRfq = rfq;

  const foundRfq = await cvg.rfqs().findRfqByAddress({ address: rfq.address });

  spok(t, rfq, {
    $topic: 'Created RFQ',
    model: 'rfq',
    address: spokSamePubkey(foundRfq.address),
  });
  spok(t, refreshedRfq, {
    $topic: 'Created RFQ',
    model: 'rfq',
    // address: spokSamePubkey(foundRfq.address),
    state: StoredRfqState.Active,
  });
});

test('[rfqModule] it can respond to an Rfq', async (t: Test) => {
  const { rfqResponse } = await cvg.rfqs().respond({
    maker,
    rfq: finalizedRfq.address,
    bid: {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
    },
    ask: null,
    keypair,
  });

  response = rfqResponse;

  const respondedToRfq = await cvg.rfqs().refreshRfq(finalizedRfq);

  spok(t, finalizedRfq, {
    $topic: 'Finalized Rfq',
    model: 'rfq',
    address: spokSamePubkey(respondedToRfq.address),
  });
  spok(t, rfqResponse, {
    $topic: 'Responded to Rfq',
    model: 'response',
    state: StoredResponseState.Active,
  });
});

//confirm response

test('[rfqModule] it can confirm a response', async (t: Test) => {
  await cvg.rfqs().confirmResponse({
    taker,
    rfq: finalizedRfq.address,
    response: response.address,
    side: Side.Bid,
    overrideLegMultiplierBps: null,
  });

  const confirmedResponse = await cvg.rfqs().refreshResponse(response);

  response = confirmedResponse;

  spok(t, response, {
    $topic: 'Responded to Rfq',
    model: 'response',
    state: StoredResponseState.SettlingPreparations,
  });
});

test('[rfqModule] it can finalize RFQ construction with QuoteAsset and cancel RFQ', async (t: Test) => {
  const quoteAsset = cvg
    .instrument(new SpotInstrument(cvg, usdcMint))
    .toQuoteData();

  const { rfq } = await cvg.rfqs().create({
    taker,
    quoteAsset,
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
  //TODO: we have to pass the baseAssetMints manually
  //  we need a method with type (baseAssetIndex) -> Mint or MintPubkey
  //  then the baseAssetMints could be extracted from the rfq's legs
  await cvg.rfqs().prepareSettlement({
    caller: taker,
    rfq: finalizedRfq.address,
    response: response.address,
    side: AuthoritySide.Taker,
    legAmountToPrepare: 3,
    quoteMint: usdcMint,
    baseAssetMints: [btcMint, btcMint, btcMint],
  });

  await cvg.rfqs().prepareSettlement({
    caller: maker,
    rfq: finalizedRfq.address,
    response: response.address,
    side: AuthoritySide.Maker,
    legAmountToPrepare: 3,
    quoteMint: usdcMint,
    baseAssetMints: [btcMint, btcMint, btcMint],
  });

  const refreshedResponse = await cvg.rfqs().refreshResponse(response);

  spok(t, refreshedResponse, {
    $topic: 'Prepared Settlement',
    model: 'response',
    state: StoredResponseState.ReadyForSettling,
  });
});

/*
 * UTILS
 */

test('[rfqModule] it can find RFQs by addresses', async (t: Test) => {
  const quoteAsset = cvg
    .instrument(new SpotInstrument(cvg, usdcMint))
    .toQuoteData();
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
    quoteAsset,
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
    quoteAsset,
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
    quoteAsset,
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

// //test('[rfqModule] it can find RFQs by owner', async () => {
// // const spotInstrumentClient = cvg.spotInstrument();
// // const spotInstrument = spotInstrumentClient.createInstrument(
// // btcMint.address,
// // btcMint.decimals,
// // Side.Bid,
// // 1
// // );
// // const { rfq: rfq1 } = await cvg.rfqs().create({
// // instruments: [spotInstrument],
// // quoteAsset: usdcMint,
// // });
// // const { rfq: rfq2 } = await createRfq(cvg);
// // const [
// // foundRfq1,
// // // foundRfq2
// // ] = await cvg.rfqs().findAllByOwner({ owner: cvg.identity().publicKey });
// // spok(t, rfq1, {
// // $topic: 'Created RFQ',
// // model: 'rfq',
// // address: spokSamePubkey(foundRfq1.address),
// // });
// // spok(t, rfq2, {
// // $topic: 'Created RFQ',
// // model: 'rfq',
// // address: spokSamePubkey(foundRfq2.address),
// // });
// //});
test('[rfqModule] it can find RFQs by instrument', async () => {
  const rfqs = await cvg.rfqs().findByInstrument({
    instrumentProgram: cvg.programs().getSpotInstrument(),
  });
  console.error(rfqs.length);
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
});

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
