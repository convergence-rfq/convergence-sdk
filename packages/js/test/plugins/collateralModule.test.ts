import test, { Test } from 'tape';
import spok from 'spok';
import {
  convergence,
  killStuckProcess,
  spokSamePubkey,
  initializeProtocol,
  initializeCollateral,
} from '../helpers';

killStuckProcess();

test('[collateralModule] it can initialize collateral', async (t: Test) => {
  const cvg = await convergence();

  const { collateralMint } = await initializeProtocol(cvg);
  const { collateral } = await initializeCollateral(cvg, collateralMint);

  spok(t, collateral, {
    $topic: 'Initialize Collateral',
    model: 'collateral',
    address: spokSamePubkey(collateral.address),
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
//});
