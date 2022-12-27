import test, { Test } from 'tape';
import spok from 'spok';
import { PublicKey, Keypair } from '@solana/web3.js';
import { PROGRAM_ADDRESS as SPOT_INSTRUMENT_PROGRAM_ADDRESS } from '@convergence-rfq/spot-instrument';
import { PROGRAM_ADDRESS as PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ADDRESS } from '@convergence-rfq/psyoptions-european-instrument';
import { Side, RiskCategory } from '@convergence-rfq/rfq';
import {
  SWITCHBOARD_BTC_ORACLE,
  convergence,
  killStuckProcess,
  spokSamePubkey,
  initializeProtocol,
  mintAuthority,
  initializeRiskEngineConfig,
  initializeCollateral,
  withdrawCollateral,
  fundCollateral,
  createRfq,
  ut,
} from '../helpers';
import { Convergence } from '@/Convergence';
import { Mint, token, SpotInstrument, toBigNumber } from '@/index';

killStuckProcess();

let cvg: Convergence;
let usdcMint: Mint;
let btcMint: Mint;

test('[setup] it can create Convergence instance', async () => {
  cvg = await convergence();

  const { mint } = await cvg
    .tokens()
    .createMint({ mintAuthority: mintAuthority.publicKey });

  const signer = Keypair.generate();

  const { token: toToken } = await cvg
    .tokens()
    .createToken({ mint: mint.address, token: signer });

  await cvg.tokens().mint({
    mintAddress: mint.address,
    amount: token(42),
    toToken: toToken.address,
    mintAuthority,
  });

  btcMint = mint;
});

test('[protocolModule] it can initialize the protocol', async (t: Test) => {
  const { protocol, collateralMint } = await initializeProtocol(
    cvg,
    mintAuthority
  );
  spok(t, protocol, {
    $topic: 'Initialize Protocol',
    model: 'protocol',
    address: spokSamePubkey(protocol.address),
  });

  usdcMint = collateralMint;
});

test('[protocolModule] it can add the spot instrument', async (t: Test) => {
  const authority = cvg.rpc().getDefaultFeePayer();
  const protocol = await cvg.protocol().get();

  const validateDataAccountAmount = 1;
  const prepareToSettleAccountAmount = 7;
  const settleAccountAmount = 3;
  const revertPreparationAccountAmount = 3;
  const cleanUpAccountAmount = 4;
  const canBeUsedAsQuote = true;

  await cvg.protocol().addInstrument({
    authority,
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
  const authority = cvg.rpc().getDefaultFeePayer();
  const protocol = await cvg.protocol().get();

  const validateDataAccountAmount = 2;
  const prepareToSettleAccountAmount = 7;
  const settleAccountAmount = 3;
  const revertPreparationAccountAmount = 3;
  const cleanUpAccountAmount = 4;
  const canBeUsedAsQuote = true;

  await cvg.protocol().addInstrument({
    authority,
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
  await initializeRiskEngineConfig(cvg);
});

test('[protocolModule] it can add a BTC base asset', async () => {
  const protocol = await cvg.protocol().get();
  const authority = cvg.rpc().getDefaultFeePayer();

  await cvg.protocol().addBaseAsset({
    authority,
    protocol: protocol.address,
    index: { value: 0 },
    ticker: 'BTC',
    riskCategory: RiskCategory.VeryLow,
    priceOracle: { __kind: 'Switchboard', address: SWITCHBOARD_BTC_ORACLE },
  });
});

test('[protocolModule] it can register USDC mint', async () => {
  await cvg.protocol().registerMint({
    baseAssetIndex: 0,
    mint: usdcMint.address,
  });
});

test('[protocolModule] it can register BTC mint', async () => {
  await cvg.protocol().registerMint({
    baseAssetIndex: 0, // TODO: Is this correct?
    mint: btcMint.address,
  });
});

test('[collateralModule] it can initialize collateral', async (t: Test) => {
  const protocol = await cvg.protocol().get();

  const collateralMint = await cvg
    .tokens()
    .findMintByAddress({ address: protocol.collateralMint });

  const { collateral } = await initializeCollateral(cvg, collateralMint);

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

  await fundCollateral(cvg, collateralMint, mintAuthority, AMOUNT);

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

  await withdrawCollateral(cvg, ut, WITHDRAW_AMOUNT);

  const userTokensAccountAfterWithdraw = await cvg.tokens().refreshToken(ut);

  spok(t, userTokensAccountAfterWithdraw, {
    $topic: 'Withdraw Collateral',
    address: spokSamePubkey(ut.address),
    mintAddress: spokSamePubkey(collateralMint.address),
    amount: token(WITHDRAW_AMOUNT),
  });

  const rfqProgram = cvg.programs().getRfq();

  const [collateralToken] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), cvg.identity().publicKey.toBuffer()],
    rfqProgram.address
  );

  const collateralTokenAccount = await cvg
    .tokens()
    .findTokenByAddress({ address: collateralToken });

  spok(t, collateralTokenAccount, {
    $topic: 'Withdraw Collateral',
    address: spokSamePubkey(collateralToken),
    mintAddress: spokSamePubkey(collateralMint.address),
    amount: token(FUND_AMOUNT - WITHDRAW_AMOUNT),
  });
});

test('[rfqModule] it can create a RFQ', async (t: Test) => {
  const spotInstrument: SpotInstrument = {
    model: 'spotInstrument',
    mint: btcMint.address,
    side: Side.Bid,
    amount: toBigNumber(1),
    decimals: 9,
    data: Buffer.from(btcMint.address.toBytes()),
  };
  const { rfq } = await createRfq(cvg, [spotInstrument], usdcMint);
  const foundRfq = await cvg.rfqs().findByAddress({ address: rfq.address });

  spok(t, rfq, {
    $topic: 'Created RFQ',
    model: 'rfq',
    address: spokSamePubkey(foundRfq.address),
  });
});

// test('[rfqModule] it can find RFQs by addresses', async (t: Test) => {
//   const cvg = await convergence();

//   const { rfq: rfq1 } = await createRfq(cvg);
//   const { rfq: rfq2 } = await createRfq(cvg);
//   const { rfq: rfq3 } = await createRfq(cvg);

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

// test('[rfqModule] it can find RFQs by owner', async (t: Test) => {
//   const cvg = await convergence();

//   const { rfq: rfq1 } = await createRfq(cvg);
//   // const { rfq: rfq2 } = await createRfq(cvg);

//   const [
//     foundRfq1,
//     // foundRfq2
//   ] = await cvg.rfqs().findAllByOwner({ owner: cvg.identity().publicKey });

//   spok(t, rfq1, {
//     $topic: 'Created RFQ',
//     model: 'rfq',
//     address: spokSamePubkey(foundRfq1.address),
//   });
//   // spok(t, rfq2, {
//   //   $topic: 'Created RFQ',
//   //   model: 'rfq',
//   //   address: spokSamePubkey(foundRfq2.address),
//   // });
// });

test('[psyoptionsEuropeanInstrumentModule] it can create a PsyOptions European instrument', async () => {});
