import test, { Test } from 'tape';
import spok from 'spok';
import { PublicKey, Keypair } from '@solana/web3.js';
import {
  SWITCHBOARD_BTC_ORACLE,
  convergenceCli,
  killStuckProcess,
  spokSamePubkey,
  BTC_DECIMALS,
  USDC_DECIMALS,
  createWallet,
  // initializeNewOptionMeta,
} from '../helpers';
import { Convergence } from '@/Convergence';
import {
  Mint,
  token,
  Side,
  RiskCategory,
  Token,
  SpotInstrument,
  OrderType,
  // toRfq,
  // toRfqAccount,
  // PsyoptionsEuropeanInstrument,
  // OptionType,
  InstrumentType,
  Rfq,
  KeypairSigner,
} from '@/index';
// import { createWallet } from '../helpers';
import { SKIP_PREFLIGHT } from '../helpers';

killStuckProcess();

// function toLittleEndian(value: number, bytes: number) {
//   const buf = Buffer.allocUnsafe(bytes);
//   buf.writeUIntLE(value, 0, bytes);
//   return buf;
// }

// const RFQ_ACCOUNT_DISCRIMINATOR = Buffer.from([
//   106, 19, 109, 78, 169, 13, 234, 58,
// ]);

let cvg: Convergence;

let usdcMint: Mint;
let btcMint: Mint;

//@ts-ignore
let userTokens: Token;

let finalizedRfq: Rfq;

const mintAuthority = Keypair.generate();

// TODO: Grab keypairs from Phantom wallet 1 and 2 so that browser testing is possible
const maker = Keypair.generate();
const taker = Keypair.generate();

let newMaker: KeypairSigner;

test('[setup] it can create Convergence instance', async () => {
  cvg = await convergenceCli(SKIP_PREFLIGHT);
  newMaker = await createWallet(cvg, 1_000);

  const { mint: newBTCMint } = await cvg.tokens().createMint({
    mintAuthority: mintAuthority.publicKey,
    decimals: BTC_DECIMALS,
  });

  btcMint = newBTCMint;

  const { mint: newUSDCMint } = await cvg.tokens().createMint({
    mintAuthority: mintAuthority.publicKey,
    decimals: USDC_DECIMALS,
  });

  usdcMint = newUSDCMint;

  const { token: toUSDCToken } = await cvg.tokens().createToken({
    mint: usdcMint.address,
    // owner: newMaker.publicKey,
    token: maker,
  });

  await cvg.tokens().mint({
    mintAddress: usdcMint.address,
    amount: token(10_000_000_000),
    toToken: toUSDCToken.address,
    mintAuthority,
  });

  const { token: toBTCToken } = await cvg
    .tokens()
    .createToken({ mint: btcMint.address, token: taker });

  await cvg.tokens().mint({
    mintAddress: btcMint.address,
    amount: token(10_000_000_000),
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

test('[collateralModule] it can initialize maker collateral', async (t: Test) => {
  const protocol = await cvg.protocol().get();

  const collateralMint = await cvg
    .tokens()
    .findMintByAddress({ address: protocol.collateralMint });

  const { collateral } = await cvg.collateral().initializeCollateral({
    user: newMaker,
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
  const AMOUNT = 10_000_000_010;

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

test('[collateralModule] it can fund maker collateral', async (t: Test) => {
  const AMOUNT = 10_000_000_010;

  const protocol = await cvg.protocol().get();

  const collateralMint = await cvg
    .tokens()
    .findMintByAddress({ address: protocol.collateralMint });

  const { token: newMakerUserTokens } = await cvg.tokens().createToken({
    mint: collateralMint.address,
    owner: newMaker.publicKey,
  });

  await cvg.tokens().mint({
    mintAddress: collateralMint.address,
    amount: token(AMOUNT),
    toOwner: newMaker.publicKey,
    toToken: newMakerUserTokens.address,
    mintAuthority,
  });

  await cvg.collateral().fundCollateral({
    user: newMaker,
    userTokens: newMakerUserTokens.address,
    amount: AMOUNT,
  });

  const rfqProgram = cvg.programs().getRfq();
  const [collateralTokenPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), newMaker.publicKey.toBuffer()],
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
  const FUND_AMOUNT = 10_000_000_010;
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

test('[rfqModule] it can finalize RFQ construction', async () => {
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

  finalizedRfq = rfq;
  console.log(finalizedRfq);

  // const rfqGpaBuilder = cvg
  //   .programs()
  //   .getGpaBuilder(rfqProgram.address)
  //   .where(0, RFQ_ACCOUNT_DISCRIMINATOR)
  //   .where(8, cvg.identity().publicKey)
  //   .where(170, 1);

  // const [unparsedRfq] = await rfqGpaBuilder.get();
  // const pulledRfq = toRfq(toRfqAccount(unparsedRfq));

  // spok(t, finalizedRfq, {
  //   $topic: 'Created RFQ',
  //   model: 'rfq',
  //   address: spokSamePubkey(pulledRfq.address),
  // });
});

// test('[rfqModule] it can cancel an Rfq', async (t: Test) => {
//   // const rfqProgram = cvg.programs().getRfq();

//   await cvg.rfqs().cancelRfq({
//     rfq: finalizedRfq.address,
//   });

//   // const ACTIVE_WINDOW = toLittleEndian(10, 2);

//   // const rfqGpaBuilder = cvg
//   //   .programs()
//   //   .getGpaBuilder(rfqProgram.address)
//   //   .where(0, RFQ_ACCOUNT_DISCRIMINATOR)
//   //   .where(8, cvg.identity().publicKey)
//   //   // .where(41, 0);
//   //   // .where(159, ACTIVE_WINDOW); //active_window: 10
//   // // .where(40, 0);
//   // // .where(169, 2); //StoredRfqState::Canceled

//   // const [unparsedRfq] = await rfqGpaBuilder.get();
//   // const cancelledRfq = toRfq(toRfqAccount(unparsedRfq));

//   // spok(t, finalizedRfq, {
//   //   $topic: 'Cancelled RFQ',
//   //   model: 'rfq',
//   //   address: spokSamePubkey(cancelledRfq.address),
//   // });
// });

test('[rfqModule] it can respond to an Rfq', async (t: Test) => {
  // try {
    await cvg.rfqs().respond({
      maker: newMaker,
      rfq: finalizedRfq.address,
      bid: {
        __kind: 'FixedSize',
        priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
      },
      ask: null,
    });
  // } catch (e) {
  //   console.log(e);
  // }

  // const rfqGpaBuilder = cvg
  //   .programs()
  //   .getGpaBuilder(rfqProgram.address)
  //   .where(0, RFQ_ACCOUNT_DISCRIMINATOR)
  //   .where(8, cvg.identity().publicKey)
  //   .where(41, 0);
  //   // .where(159, 10); //active_window: 10
  // // .where(40, 0);
  // // .where(169, 2); //StoredRfqState::Canceled

  // const [unparsedRfq] = await rfqGpaBuilder.get();
  // const cancelledRfq = toRfq(toRfqAccount(unparsedRfq));

  // spok(t, finalizedRfq, {
  //   $topic: 'Cancelled RFQ',
  //   model: 'rfq',
  //   address: spokSamePubkey(fetchedRfq.address),
  // });
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

// test('[rfqModule] it can find RFQs by addresses', async (t: Test) => {
//   const spotInstrument = new SpotInstrument(cvg, btcMint, {
//     amount: 1,
//     side: Side.Bid,
//   });
//   const quoteAsset = cvg
//     .instrument(new SpotInstrument(cvg, usdcMint))
//     .toQuoteData();

//   const { rfq: rfq1 } = await cvg.rfqs().create({
//     instruments: [spotInstrument],
//     orderType: OrderType.Sell,
//     fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
//     quoteAsset,
//   });
//   const { rfq: rfq2 } = await cvg.rfqs().create({
//     instruments: [spotInstrument],
//     orderType: OrderType.Sell,
//     fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
//     quoteAsset,
//   });
//   const { rfq: rfq3 } = await cvg.rfqs().create({
//     instruments: [spotInstrument],
//     orderType: OrderType.Sell,
//     fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
//     quoteAsset,
//   });

//   const [foundRfq1, foundRfq2, foundRfq3] = await cvg
//     .rfqs()
//     .findByAddresses({ addresses: [rfq1.address, rfq2.address, rfq3.address] });

//   spok(t, rfq1, {
//     $topic: 'Created RFQ',
//     model: 'rfq',
//     address: spokSamePubkey(foundRfq1.address),
//   });
//   spok(t, rfq2, {
//     $topic: 'Created RFQ',
//     model: 'rfq',
//     address: spokSamePubkey(foundRfq2.address),
//   });
//   spok(t, rfq3, {
//     $topic: 'Created RFQ',
//     model: 'rfq',
//     address: spokSamePubkey(foundRfq3.address),
//   });
// });

<<<<<<< HEAD
// //test('[rfqModule] it can find RFQs by owner', async () => {
// //  const spotInstrumentClient = cvg.spotInstrument();
// //  const spotInstrument = spotInstrumentClient.createInstrument(
// //    btcMint.address,
// //    btcMint.decimals,
// //    Side.Bid,
// //    1
// //  );
// //  const { rfq: rfq1 } = await cvg.rfqs().create({
// //    instruments: [spotInstrument],
// //    quoteAsset: usdcMint,
// //  });
// //  const { rfq: rfq2 } = await createRfq(cvg);
// //  const [
// //    foundRfq1,
// //    // foundRfq2
// //  ] = await cvg.rfqs().findAllByOwner({ owner: cvg.identity().publicKey });
// //  spok(t, rfq1, {
// //    $topic: 'Created RFQ',
// //    model: 'rfq',
// //    address: spokSamePubkey(foundRfq1.address),
// //  });
// //  spok(t, rfq2, {
// //    $topic: 'Created RFQ',
// //    model: 'rfq',
// //    address: spokSamePubkey(foundRfq2.address),
// //  });
// //});
=======
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
>>>>>>> 725dcfc81af78048a1a415ee3a5f4a8055e9aef1

// test('[psyoptionsEuropeanInstrumentModule] it can create an RFQ with the PsyOptions European instrument', async (t: Test) => {
//   const { euroMeta, euroMetaKey } = await initializeNewOptionMeta(
//     cvg,
//     btcMint,
//     usdcMint,
//     17_500,
//     1_000,
//     3_600
//   );

//   const psyoptionsEuropeanInstrument = new PsyoptionsEuropeanInstrument(
//     cvg,
//     btcMint,
//     OptionType.PUT,
//     euroMeta,
//     euroMetaKey,
//     {
//       amount: 1,
//       side: Side.Bid,
//     }
//   );
//   const quoteAsset = cvg
//     .instrument(new SpotInstrument(cvg, usdcMint))
//     .toQuoteData();

//   const { rfq } = await cvg.rfqs().create({
//     instruments: [psyoptionsEuropeanInstrument],
//     orderType: OrderType.Sell,
//     fixedSize: { __kind: 'QuoteAsset', quoteAmount: 1 },
//     quoteAsset,
//   });
//   const foundRfq = await cvg.rfqs().findByAddress({ address: rfq.address });

//   spok(t, rfq, {
//     $topic: 'Created RFQ',
//     model: 'rfq',
//     address: spokSamePubkey(foundRfq.address),
//   });
// });
