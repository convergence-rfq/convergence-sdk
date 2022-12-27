import test, { Test } from 'tape';
import spok from 'spok';
//import { PublicKey, Keypair } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ADDRESS as SPOT_INSTRUMENT_PROGRAM_ADDRESS } from '@convergence-rfq/spot-instrument';
import { PROGRAM_ADDRESS as PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ADDRESS } from '@convergence-rfq/psyoptions-european-instrument';
//import { RiskCategory } from '@convergence-rfq/rfq';
import {
  convergence,
  killStuckProcess,
  spokSamePubkey,
  initializeProtocol,
  mintAuthority,
  initializeRiskEngineConfig,
  initializeCollateral,
  withdrawCollateral,
  fundCollateral,
  ut,
} from '../helpers';
import { Convergence } from '@/Convergence';
import { token } from '@/index';

killStuckProcess();

let cvg: Convergence;

test('[Convergence] it can create Convergence instance', async () => {
  cvg = await convergence();
});

test('[protocolModule] it can initialize the protocol', async (t: Test) => {
  const { protocol } = await initializeProtocol(cvg, mintAuthority);

  spok(t, protocol, {
    $topic: 'Initialize Protocol',
    model: 'protocol',
    address: spokSamePubkey(protocol.address),
  });
});

test('[protocolModule] it can add the spot instrument', async (t: Test) => {
  const authority = cvg.rpc().getDefaultFeePayer();
  const protocol = await cvg.protocol().get({});

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
  const protocol = await cvg.protocol().get({});

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

test('[riskEngineModule] it can initialize risk engine config', async () => {
  await initializeRiskEngineConfig(cvg);
});

//test('[protocolModule] it can add a base asset', async () => {
//  const protocol = await cvg.protocol().get({});
//  const authority = cvg.rpc().getDefaultFeePayer();
//  const oracleAddress = Keypair.generate().publicKey;
//
//  await cvg.protocol().addBaseAsset({
//    authority,
//    protocol: protocol.address,
//    mint: protocol.collateralMint,
//    index: { value: 0 },
//    ticker: 'USDC',
//    riskCategory: RiskCategory.Medium,
//    priceOracle: { __kind: 'Switchboard', address: oracleAddress },
//  });
//});
//
//test('[protocolModule] it can register mint', async () => {
//  const protocol = await cvg.protocol().get({});
//  const authority = cvg.rpc().getDefaultFeePayer();
//
//  await cvg.protocol().registerMint({
//    protocol: protocol.address,
//    authority,
//    mint: protocol.collateralMint,
//  });
//});
//
//test('[psyoptionsEuropeanInstrumentModule] it can create a PsyOptions European instrument', async () => {});
//
test('[collateralModule] it can initialize collateral', async (t: Test) => {
  const protocol = await cvg.protocol().get({});

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
  const rfqProgram = cvg.programs().getRfq();
  const AMOUNT = 25;

  const protocol = await cvg.protocol().get({});

  const collateralMint = await cvg
    .tokens()
    .findMintByAddress({ address: protocol.collateralMint });

  await initializeCollateral(cvg, collateralMint);
  await fundCollateral(cvg, collateralMint, mintAuthority, AMOUNT);

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
  const cvg = await convergence();
  const rfqProgram = cvg.programs().getRfq();

  const FUND_AMOUNT = 25;
  const WITHDRAW_AMOUNT = 10;

  const protocol = await cvg.protocol().get({});

  const collateralMint = await cvg
    .tokens()
    .findMintByAddress({ address: protocol.collateralMint });

  await initializeCollateral(cvg, collateralMint);

  await fundCollateral(cvg, collateralMint, mintAuthority, FUND_AMOUNT);

  await withdrawCollateral(cvg, ut, WITHDRAW_AMOUNT);

  const userTokensAccountAfterWithdraw = await cvg.tokens().refreshToken(ut);

  spok(t, userTokensAccountAfterWithdraw, {
    $topic: 'Withdraw Collateral',
    address: spokSamePubkey(ut.address),
    mintAddress: spokSamePubkey(collateralMint.address),
    amount: token(WITHDRAW_AMOUNT),
  });

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

//test('[rfqModule] it can create a RFQ', async (t: Test) => {
// test('[rfqModule] it can create a RFQ', async () => {
// const cvg = await convergence();

//const { rfq } = await createRfq(cvg);
// await createRfq(cvg);
//const foundRfq = await cvg.rfqs().findByAddress({ address: rfq.address });

//spok(t, rfq, {
//  $topic: 'Created RFQ',
//  model: 'rfq',
//  address: spokSamePubkey(foundRfq.address),
//});
// });

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
