import test, { Test } from 'tape';
import { PublicKey } from '@solana/web3.js';
import spok from 'spok';
import {
  convergence,
  killStuckProcess,
  spokSamePubkey,
  initializeCollateral,
  fundCollateral,
  mintAuthority,
  withdrawCollateral,
  ut,
} from '../helpers';
import { token } from '@/index';

killStuckProcess();

test('[collateralModule] it can initialize collateral', async (t: Test) => {
  const cvg = await convergence();
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
  const cvg = await convergence();
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
