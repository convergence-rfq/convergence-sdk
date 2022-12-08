import test, { Test } from 'tape';
import spok from 'spok';
import {
  convergence,
  createRfq,
  initializeCollateral,
  fundCollateral,
  killStuckProcess,
  spokSamePubkey,
} from '../helpers';
import { Keypair } from '@solana/web3.js';
import { initializeCollateralBuilder } from '@/plugins';
import { bignum } from '@metaplex-foundation/beet';

killStuckProcess();

test('[collateralModule] it can initialize collateral', async (t: Test) => {
  const cvg = await convergence({
    rpcEndpoint: 'https://api.devnet.solana.com',
  });

  const protocol = new Keypair().publicKey;
  const collateralInfo = new Keypair().publicKey;
  const collateralToken = new Keypair().publicKey;
  const collateralMint = new Keypair().publicKey;

  const collateral = await cvg.collateral().initializeCollateral({
    protocol,
    collateralInfo,
    collateralToken,
    collateralMint,
  });

  spok(t, collateral, {
    $topic: 'Initialize Collateral',
    model: 'collateral',
    address: spokSamePubkey(collateral.address),
  });
});

test('[collateralModule] it can fund collateral', async (t: Test) => {
  const cvg = await convergence({
    rpcEndpoint: 'https://api.devnet.solana.com',
  });

  const userTokens = new Keypair().publicKey;
  const protocol = new Keypair().publicKey;
  const collateralInfo = new Keypair().publicKey;
  const collateralToken = new Keypair().publicKey;
  const amount: bignum = 1000;

  const collateral = await cvg.collateral().fundCollateral({
    userTokens,
    protocol,
    collateralInfo,
    collateralToken,
    amount,
  });

  spok(t, collateral, {
    $topic: 'Fund Collateral',
    model: 'collateral',
    address: spokSamePubkey(collateral.publicKey),
  });
});
