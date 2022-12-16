import test, { Test } from 'tape';
import { PublicKey } from '@solana/web3.js';
import spok from 'spok';
import {
  convergence,
  killStuckProcess,
  spokSamePubkey,
  initializeProtocol,
  initializeCollateral,
  fundCollateral,
  withdrawCollateral,
} from '../helpers';
import { token } from '@/index';

killStuckProcess();

test('[collateralModule] it can initialize collateral', async (t: Test) => {
  const cvg = await convergence();
  const { collateralMint } = await initializeProtocol(cvg);
  const { collateral } = await initializeCollateral(cvg, collateralMint);

  const collateralMaybeAccount = await cvg
    .rpc()
    .getAccount(collateral.address, 'confirmed');

  const collateralAccount = await cvg
    .collateral()
    .findByAddress({ address: collateralMaybeAccount.publicKey });

  spok(t, collateral, {
    $topic: 'Initialize Collateral',
    model: 'collateral',
    address: spokSamePubkey(collateralAccount.address),
  });
});

test('[collateralModule] it can fund collateral', async (t: Test) => {
  const cvg = await convergence();
  const rfqProgram = cvg.programs().getRfq();
  const amount = 25;

  const { collateralMint } = await initializeProtocol(cvg);

  await initializeCollateral(cvg, collateralMint);

  await fundCollateral(cvg, collateralMint, amount);

  const [collateralToken] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), cvg.identity().publicKey.toBuffer()],
    rfqProgram.address
  );

  const collateralTokenMaybeAccount = await cvg
    .rpc()
    .getAccount(collateralToken, 'confirmed');

  const collateralTokenAccount = await cvg
    .tokens()
    .findTokenByAddress({ address: collateralTokenMaybeAccount.publicKey });

  spok(t, collateralTokenAccount, {
    $topic: 'Fund Collateral',
    model: 'token',
    mintAddress: spokSamePubkey(collateralMint.address),
    amount: token(amount),
  });
});

test('[collateralModule] it can withdraw collateral', async (t: Test) => {
  const cvg = await convergence();
  const rfqProgram = cvg.programs().getRfq();

  const amount = 25;

  const { collateralMint } = await initializeProtocol(cvg);

  await initializeCollateral(cvg, collateralMint);

  const { userTokens } = await fundCollateral(cvg, collateralMint, amount);

  await withdrawCollateral(cvg, userTokens, amount);

  const userTokensMaybeAccount = await cvg
    .rpc()
    .getAccount(userTokens.address, 'confirmed');

  const userTokensAccountAfterWithdraw = await cvg
    .tokens()
    .findTokenByAddress({ address: userTokensMaybeAccount.publicKey });

  spok(t, userTokensAccountAfterWithdraw, {
    $topic: 'Withdraw Collateral',
    address: spokSamePubkey(userTokens.address),
    mintAddress: spokSamePubkey(collateralMint.address),
    amount: token(amount),
  });

  const [collateralToken] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), cvg.identity().publicKey.toBuffer()],
    rfqProgram.address
  );

  const collateralTokenMaybeAccount = await cvg
    .rpc()
    .getAccount(collateralToken, 'confirmed');

  const collateralTokenAccount = await cvg
    .tokens()
    .findTokenByAddress({ address: collateralTokenMaybeAccount.publicKey });

  spok(t, collateralTokenAccount, {
    $topic: 'Withdraw Collateral',
    address: spokSamePubkey(collateralToken),
    mintAddress: spokSamePubkey(collateralMint.address),
    amount: token(0),
  });
});
