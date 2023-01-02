import test, { Test } from 'tape';
//import {
//  createProgram,
//  instructions,
//  parseTranactionError,
//  ExpirationData,
//  EuroPrimitive,
//} from '@mithraic-labs/tokenized-euros';
import spok from 'spok';
import { PublicKey, Keypair } from '@solana/web3.js';
import {
  SWITCHBOARD_BTC_ORACLE,
  convergence,
  killStuckProcess,
  spokSamePubkey,
  BTC_DECIMALS,
  USDC_DECIMALS,
} from '../helpers';
import { Convergence } from '@/Convergence';
import {
  Mint,
  token,
  Side,
  RiskCategory,
  SPOT_INSTRUMENT_PROGRAM_ADDRESS,
  PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ADDRESS,
  Token,
  SpotInstrument,
  EuroMeta,
  OrderType,
  PsyoptionsEuropeanInstrument,
  OptionType,
} from '@/index';

killStuckProcess();

let cvg: Convergence;

let usdcMint: Mint;
let btcMint: Mint;

let userTokens: Token;

const mintAuthority = Keypair.generate();

test('[setup] it can create Convergence instance', async () => {
  cvg = await convergence();

  const { mint: newBTCMint } = await cvg.tokens().createMint({
    mintAuthority: mintAuthority.publicKey,
    decimals: BTC_DECIMALS,
  });

  btcMint = newBTCMint;

  const maker = Keypair.generate();

  const { mint: newUSDCMint } = await cvg.tokens().createMint({
    mintAuthority: mintAuthority.publicKey,
    decimals: USDC_DECIMALS,
  });

  usdcMint = newUSDCMint;

  const { token: toUSDCToken } = await cvg
    .tokens()
    .createToken({ mint: usdcMint.address, token: maker });

  await cvg.tokens().mint({
    mintAddress: usdcMint.address,
    amount: token(42),
    toToken: toUSDCToken.address,
    mintAuthority,
  });

  const taker = Keypair.generate();

  const { token: toBTCToken } = await cvg
    .tokens()
    .createToken({ mint: btcMint.address, token: taker });

  await cvg.tokens().mint({
    mintAddress: btcMint.address,
    amount: token(42),
    toToken: toBTCToken.address,
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

  await cvg.protocol().addInstrument({
    authority: dao,
    protocol: protocol.address,
    instrumentProgram: new PublicKey(SPOT_INSTRUMENT_PROGRAM_ADDRESS),
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

test('[protocolModule] it can add the PsyOptions instrument', async (t: Test) => {
  const dao = cvg.rpc().getDefaultFeePayer();
  const protocol = await cvg.protocol().get();

  const validateDataAccountAmount = 2;
  const prepareToSettleAccountAmount = 7;
  const settleAccountAmount = 3;
  const revertPreparationAccountAmount = 3;
  const cleanUpAccountAmount = 4;
  const canBeUsedAsQuote = true;

  await cvg.protocol().addInstrument({
    authority: dao,
    protocol: protocol.address,
    instrumentProgram: new PublicKey(
      PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ADDRESS
    ),
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

test('[collateralModule] it can initialize collateral', async (t: Test) => {
  const protocol = await cvg.protocol().get();

  const collateralMint = await cvg
    .tokens()
    .findMintByAddress({ address: protocol.collateralMint });

  const { collateral } = await cvg.collateral().initializeCollateral({
    collateralMint: collateralMint.address,
  });

  const collateralAccount = await cvg
    .collateral()
    .findByAddress({ address: collateral.address });

  spok(t, collateral, {
    $topic: 'Initialize Collateral',
    model: 'collateral',
    address: spokSamePubkey(collateralAccount.address),
  });
});

test('[collateralModule] it can fund collateral', async (t: Test) => {
  const AMOUNT = 25;

  const protocol = await cvg.protocol().get();

  const collateralMint = await cvg
    .tokens()
    .findMintByAddress({ address: protocol.collateralMint });

  const { token: newUserTokens } = await cvg.tokens().createToken({
    mint: collateralMint.address,
  });

  userTokens = newUserTokens;

  await cvg.tokens().mint({
    mintAddress: collateralMint.address,
    amount: token(AMOUNT),
    toToken: newUserTokens.address,
    mintAuthority,
  });

  await cvg.collateral().fundCollateral({
    userTokens: newUserTokens.address,
    amount: AMOUNT,
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
    $topic: 'Fund Collateral',
    model: 'token',
    mintAddress: spokSamePubkey(collateralMint.address),
    amount: token(AMOUNT),
  });
});

test('[collateralModule] it can withdraw collateral', async (t: Test) => {
  const FUND_AMOUNT = 25;
  const WITHDRAW_AMOUNT = 10;

  const protocol = await cvg.protocol().get();

  const collateralMint = await cvg
    .tokens()
    .findMintByAddress({ address: protocol.collateralMint });

  await cvg.collateral().withdrawCollateral({
    userTokens: userTokens.address,
    amount: WITHDRAW_AMOUNT,
  });

  const userTokensAccountAfterWithdraw = await cvg
    .tokens()
    .refreshToken(userTokens);

  spok(t, userTokensAccountAfterWithdraw, {
    $topic: 'Withdraw Collateral',
    address: spokSamePubkey(userTokens.address),
    mintAddress: spokSamePubkey(collateralMint.address),
    amount: token(WITHDRAW_AMOUNT),
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
    amount: token(FUND_AMOUNT - WITHDRAW_AMOUNT),
  });
});

test('[rfqModule] it can create a RFQ', async (t: Test) => {
  const quoteInstrument = new SpotInstrument(cvg, usdcMint, {
    amount: 1,
    side: Side.Bid,
    baseAssetIndex: 0,
  });
  const spotInstrument = new SpotInstrument(cvg, btcMint, {
    amount: 1,
    side: Side.Bid,
    baseAssetIndex: 0,
  });

  const quoteAsset = cvg.instrument(quoteInstrument).toQuoteData();

  const { rfq } = await cvg.rfqs().create({
    instruments: [spotInstrument],
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

test('[rfqModule] it can find RFQs by addresses', async (t: Test) => {
  const quoteInstrument = new SpotInstrument(cvg, usdcMint);
  const spotInstrument = new SpotInstrument(cvg, btcMint, {
    amount: 1,
    side: Side.Bid,
    baseAssetIndex: 0,
  });

  const quoteAsset = cvg.instrument(quoteInstrument).toQuoteData();

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

test('[rfqModule] it can find RFQs by owner', async () => {
  //const spotInstrumentClient = cvg.spotInstrument();
  //const spotInstrument = spotInstrumentClient.createInstrument(
  //  btcMint.address,
  //  btcMint.decimals,
  //  Side.Bid,
  //  1
  //);
  //const { rfq: rfq1 } = await cvg.rfqs().create({
  //  instruments: [spotInstrument],
  //  quoteAsset: usdcMint,
  //});
  // const { rfq: rfq2 } = await createRfq(cvg);
  //const [
  //  foundRfq1,
  //  // foundRfq2
  //] = await cvg.rfqs().findAllByOwner({ owner: cvg.identity().publicKey });
  //spok(t, rfq1, {
  //  $topic: 'Created RFQ',
  //  model: 'rfq',
  //  address: spokSamePubkey(foundRfq1.address),
  //});
  // spok(t, rfq2, {
  //   $topic: 'Created RFQ',
  //   model: 'rfq',
  //   address: spokSamePubkey(foundRfq2.address),
  // });
});

test('[psyoptionsEuropeanInstrumentModule] it can create an RFQ with the PsyOptions European instrument', async (t: Test) => {
  const meta: EuroMeta = {
    underlyingMint: PublicKey.default,
    underlyingDecimals: BTC_DECIMALS,
    underlyingAmountPerContract: 1,
    stableMint: usdcMint.address,
    stableDecimals: USDC_DECIMALS,
    strikePrice: 10_000,
    stablePool: PublicKey.default,
    oracle: PublicKey.default,
    priceDecimals: USDC_DECIMALS,
    callOptionMint: PublicKey.default,
    callWriterMint: PublicKey.default,
    putOptionMint: PublicKey.default,
    putWriterMint: PublicKey.default,
    underlyingPool: PublicKey.default,
    expiration: 1,
    bumpSeed: 1,
    expirationData: PublicKey.default,
    oracleProviderId: 1,
  };
  const metaKey = PublicKey.default;
  const callMint = usdcMint;
  const underlyingMint = btcMint; // TODO: Update
  const callWriterMint = btcMint; // TODO: Update
  const putMint = btcMint; // TODO: Update
  const putWriterMint = btcMint; // TODO: Update
  const optionType = OptionType.CALL;
  const stableMint = usdcMint;

  const psyoptionsEuropeanInstrument = new PsyoptionsEuropeanInstrument(
    cvg,
    btcMint,
    optionType,
    meta,
    metaKey,
    underlyingMint,
    stableMint,
    callMint,
    callWriterMint,
    putMint,
    putWriterMint,
    {
      amount: 1,
      side: Side.Bid,
      baseAssetIndex: 0,
    }
  );

  const quoteInstrument = new SpotInstrument(cvg, usdcMint, {
    amount: 1,
    side: Side.Bid,
    baseAssetIndex: 0,
  });
  const quoteAsset = cvg.instrument(quoteInstrument).toQuoteData();

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
