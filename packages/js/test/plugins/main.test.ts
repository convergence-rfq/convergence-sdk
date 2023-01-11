import { readFileSync } from 'fs';
import test, { Test } from 'tape';
import spok from 'spok';
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  SWITCHBOARD_BTC_ORACLE,
  convergenceCli,
  killStuckProcess,
  spokSamePubkey,
  BTC_DECIMALS,
  USDC_DECIMALS,
  initializeNewOptionMeta,
  SKIP_PREFLIGHT,
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
} from '@/index';

killStuckProcess();

let cvg: Convergence;

let usdcMint: Mint;
let btcMint: Mint;

const maker = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(readFileSync('./test/fixtures/maker.json', 'utf8')))
);
const taker = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(readFileSync('./test/fixtures/taker.json', 'utf8')))
);

let makerBTCWallet: Token;
let makerUSDCWallet: Token;

let takerBTCWallet: Token;
let takerUSDCWallet: Token;

const WALLET_AMOUNT = 1_000_000_000;
const COLLATERAL_AMOUNT = 100_000_000;

test('[setup] it can create Convergence instance', async () => {
  cvg = await convergenceCli(SKIP_PREFLIGHT);

  const mintAuthority = Keypair.generate();

  // Setup wallets
  const walletTx = await cvg.connection.requestAirdrop(
    maker.publicKey,
    1 * LAMPORTS_PER_SOL
  );
  await cvg.connection.confirmTransaction(walletTx);

  const takerTx = await cvg.connection.requestAirdrop(
    taker.publicKey,
    1 * LAMPORTS_PER_SOL
  );
  await cvg.connection.confirmTransaction(takerTx);

  // Setup mints
  const { mint: newUSDCMint } = await cvg.tokens().createMint({
    mintAuthority: mintAuthority.publicKey,
    decimals: USDC_DECIMALS,
  });
  usdcMint = newUSDCMint;

  const { mint: newBTCMint } = await cvg.tokens().createMint({
    mintAuthority: mintAuthority.publicKey,
    decimals: BTC_DECIMALS,
  });
  btcMint = newBTCMint;

  // Setup USDC wallets
  const { token: newTakerUSDCWallet } = await cvg
    .tokens()
    .createToken({ mint: usdcMint.address, owner: taker.publicKey });
  takerUSDCWallet = newTakerUSDCWallet;

  const { token: newMakerUSDCWallet } = await cvg
    .tokens()
    .createToken({ mint: usdcMint.address, owner: maker.publicKey });
  makerUSDCWallet = newMakerUSDCWallet;

  await cvg.tokens().mint({
    mintAddress: usdcMint.address,
    amount: token(WALLET_AMOUNT),
    toToken: makerUSDCWallet.address,
    mintAuthority,
  });

  await cvg.tokens().mint({
    mintAddress: usdcMint.address,
    amount: token(WALLET_AMOUNT),
    toToken: takerUSDCWallet.address,
    mintAuthority,
  });

  // Setup BTC wallets
  const { token: newMakerBTCWallet } = await cvg
    .tokens()
    .createToken({ mint: btcMint.address, owner: maker.publicKey });
  makerBTCWallet = newMakerBTCWallet;

  const { token: newTakerBTCWallet } = await cvg
    .tokens()
    .createToken({ mint: btcMint.address, owner: taker.publicKey });
  takerBTCWallet = newTakerBTCWallet;

  await cvg.tokens().mint({
    mintAddress: btcMint.address,
    amount: token(WALLET_AMOUNT),
    toToken: takerBTCWallet.address,
    mintAuthority,
  });

  await cvg.tokens().mint({
    mintAddress: btcMint.address,
    amount: token(WALLET_AMOUNT),
    toToken: makerBTCWallet.address,
    mintAuthority,
  });
});

test('[protocolModule] it can initialize the protocol', async (t: Test) => {
  const { protocol } = await cvg.protocol().initialize({
    collateralMint: usdcMint.address,
  });

  spok(t, protocol, {
    $topic: 'Initialize Protocol',
    model: 'protocol',
    address: spokSamePubkey(protocol.address),
  });
});

test('[protocolModule] it can add the spot instrument', async (t: Test) => {
  const dao = cvg.rpc().getDefaultFeePayer();
  const protocol = await cvg.protocol().get();

  const validateDataAccountAmount = 1;
  const prepareToSettleAccountAmount = 7;
  const settleAccountAmount = 3;
  const revertPreparationAccountAmount = 3;
  const cleanUpAccountAmount = 4;
  const canBeUsedAsQuote = true;

  const spotInstrument = cvg.programs().getSpotInstrument();

  await cvg.protocol().addInstrument({
    authority: dao,
    protocol: protocol.address,
    instrumentProgram: spotInstrument.address,
    canBeUsedAsQuote,
    validateDataAccountAmount,
    prepareToSettleAccountAmount,
    settleAccountAmount,
    revertPreparationAccountAmount,
    cleanUpAccountAmount,
  });

  spok(t, protocol, {
    $topic: 'Add Instrument',
    model: 'protocol',
    address: spokSamePubkey(protocol.address),
  });
});

test('[protocolModule] it can add the PsyOptions European instrument', async (t: Test) => {
  const dao = cvg.rpc().getDefaultFeePayer();
  const protocol = await cvg.protocol().get();

  const validateDataAccountAmount = 2;
  const prepareToSettleAccountAmount = 7;
  const settleAccountAmount = 3;
  const revertPreparationAccountAmount = 3;
  const cleanUpAccountAmount = 4;
  const canBeUsedAsQuote = true;

  const psyoptionsEuropeanInstrument = cvg
    .programs()
    .getPsyoptionsEuropeanInstrument();

  await cvg.protocol().addInstrument({
    authority: dao,
    protocol: protocol.address,
    instrumentProgram: psyoptionsEuropeanInstrument.address,
    canBeUsedAsQuote,
    validateDataAccountAmount,
    prepareToSettleAccountAmount,
    settleAccountAmount,
    revertPreparationAccountAmount,
    cleanUpAccountAmount,
  });

  spok(t, protocol, {
    $topic: 'Add Instrument',
    model: 'protocol',
    address: spokSamePubkey(protocol.address),
  });
});

test('[protocolModule] it can add the PsyOptions American instrument', async (t: Test) => {
  const dao = cvg.rpc().getDefaultFeePayer();
  const protocol = await cvg.protocol().get();

  const validateDataAccountAmount = 2;
  const prepareToSettleAccountAmount = 7;
  const settleAccountAmount = 3;
  const revertPreparationAccountAmount = 3;
  const cleanUpAccountAmount = 4;
  const canBeUsedAsQuote = true;

  const psyoptionsAmericanInstrument = cvg
    .programs()
    .getPsyoptionsAmericanInstrument();

  await cvg.protocol().addInstrument({
    authority: dao,
    protocol: protocol.address,
    instrumentProgram: psyoptionsAmericanInstrument.address,
    canBeUsedAsQuote,
    validateDataAccountAmount,
    prepareToSettleAccountAmount,
    settleAccountAmount,
    revertPreparationAccountAmount,
    cleanUpAccountAmount,
  });

  spok(t, protocol, {
    $topic: 'Add Instrument',
    model: 'protocol',
    address: spokSamePubkey(protocol.address),
  });
});

test('[riskEngineModule] it can initialize the default risk engine config', async () => {
  await cvg.riskEngine().initializeConfig({});
});

test('[riskEngineModule] it can set spot and option instrument type', async () => {
  const spotInstrument = cvg.programs().getSpotInstrument();
  const psyoptionsEuropeanInstrument = cvg
    .programs()
    .getPsyoptionsEuropeanInstrument();
  const psyoptionsAmericanInstrument = cvg
    .programs()
    .getPsyoptionsAmericanInstrument();

  await cvg.riskEngine().setInstrumentType({
    instrumentProgram: spotInstrument.address,
    instrumentType: InstrumentType.Spot,
  });
  await cvg.riskEngine().setInstrumentType({
    instrumentProgram: psyoptionsAmericanInstrument.address,
    instrumentType: InstrumentType.Option,
  });
  await cvg.riskEngine().setInstrumentType({
    instrumentProgram: psyoptionsEuropeanInstrument.address,
    instrumentType: InstrumentType.Option,
  });
});

test('[protocolModule] it can add a BTC base asset', async () => {
  const dao = cvg.rpc().getDefaultFeePayer();
  const protocol = await cvg.protocol().get();

  await cvg.protocol().addBaseAsset({
    authority: dao,
    protocol: protocol.address,
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

  const collateralMint = await cvg
    .tokens()
    .findMintByAddress({ address: protocol.collateralMint });

  const { collateral: takerCollateral } = await cvg
    .collateral()
    .initializeCollateral({
      collateralMint: collateralMint.address,
      user: taker,
    });
  const { collateral: makerCollateral } = await cvg
    .collateral()
    .initializeCollateral({
      collateralMint: collateralMint.address,
      user: maker,
    });

  const foundTakercollateral = await cvg
    .collateral()
    .findByAddress({ address: takerCollateral.address });
  spok(t, makerCollateral, {
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
  const protocol = await cvg.protocol().get();

  const collateralMint = await cvg
    .tokens()
    .findMintByAddress({ address: protocol.collateralMint });

  await cvg.collateral().fundCollateral({
    userTokens: takerUSDCWallet.address,
    amount: COLLATERAL_AMOUNT,
  });

  await cvg.collateral().fundCollateral({
    userTokens: makerUSDCWallet.address,
    amount: COLLATERAL_AMOUNT,
  });

  const rfqProgram = cvg.programs().getRfq();
  const [collateralTokenPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), taker.publicKey.toBuffer()],
    rfqProgram.address
  );

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

  const protocol = await cvg.protocol().get();

  const collateralMint = await cvg
    .tokens()
    .findMintByAddress({ address: protocol.collateralMint });

  await cvg.collateral().withdrawCollateral({
    userTokens: makerUSDCWallet.address,
    amount,
  });

  const userTokensAccountAfterWithdraw = await cvg
    .tokens()
    .refreshToken(makerUSDCWallet);

  spok(t, userTokensAccountAfterWithdraw, {
    $topic: 'Withdraw Collateral',
    address: spokSamePubkey(makerUSDCWallet.address),
    mintAddress: spokSamePubkey(collateralMint.address),
    amount: token(amount),
  });

  const rfqProgram = cvg.programs().getRfq();
  const [collateralTokenPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), cvg.identity().publicKey.toBuffer()],
    rfqProgram.address
  );

  const collateralTokenAccount = await cvg
    .tokens()
    .findTokenByAddress({ address: collateralTokenPda });

  spok(t, collateralTokenAccount, {
    $topic: 'Withdraw Collateral',
    address: spokSamePubkey(collateralTokenPda),
    mintAddress: spokSamePubkey(collateralMint.address),
    amount: token(5_000_000 - amount),
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
    orderType: OrderType.Sell,
    fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
    quoteAsset,
    activeWindow: 5_000,
    settlingWindow: 1_000,
  });

  await cvg.rfqs().finalizeRfqConstruction({
    rfq: rfq.address,
    baseAssetIndex: { value: 0 },
  });

  await cvg.rfqs().cancelRfq({
    rfq: rfq.address,
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

  spok(t, rfq, {
    $topic: 'Created RFQ',
    model: 'rfq',
    address: spokSamePubkey(foundRfq.address),
  });
});
