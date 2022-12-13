// import { Keypair } from '@solana/web3.js';
import test from 'tape';
//import test, { Test } from 'tape';
//import spok from 'spok';
import { Keypair } from '@solana/web3.js';
//import { bignum } from '@metaplex-foundation/beet';
import { convergence, killStuckProcess, initializeProtocol } from '../helpers';
// import { Signer } from '@/types';

killStuckProcess();

//test('[collateralModule] it can initialize collateral', async (t: Test) => {
test('[collateralModule] it can initialize collateral', async () => {
  const cvg = await convergence();
  const { collateralMint, protocol } = await initializeProtocol(cvg);
  const user = Keypair.generate();

  await cvg.collateral().initializeCollateral({
    user: user.publicKey,
    protocol: protocol.address,
    collateralMint: collateralMint.address,
  });
});

//test('[collateralModule] it can fund collateral', async (t: Test) => {
//  const cvg = await convergence();
//
//  const user: Signer = new Keypair();
//  const collateralMint = new Keypair();
//  const userTokens = new Keypair();
//  const collateralInfo = new Keypair();
//  const collateralToken = new Keypair();
//  const amount: bignum = 1000;
//
//  const { protocol } = await cvg.protocol().initialize({
//    owner: user.publicKey,
//    collateralMint: collateralMint.publicKey,
//  });
//
//  const { collateral } = await cvg.collateral().initializeCollateral({
//    user,
//    protocol: protocol.address,
//    collateralInfo: collateralInfo.publicKey,
//    collateralToken: collateralToken.publicKey,
//    collateralMint: collateralMint.publicKey,
//  });
//
//  await cvg.collateral().fundCollateral({
//    userTokens: userTokens.publicKey,
//    protocol: protocol.address,
//    collateralInfo: collateral.address,
//    collateralToken: collateralToken.publicKey,
//    amount,
//  });
//
//  spok(t, collateral, {
//    $topic: 'Fund Collateral',
//    model: 'collateral',
//    address: spokSamePubkey(collateral.address),
//  });
// });
