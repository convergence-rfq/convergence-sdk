import test from 'tape';
//import test, { Test } from 'tape';
//import spok from 'spok';
import { Keypair, PublicKey } from '@solana/web3.js';
//import { bignum } from '@metaplex-foundation/beet';
//import { convergence, killStuckProcess, spokSamePubkey } from '../helpers';
import { convergence, killStuckProcess, initializeProtocol } from '../helpers';
import { Signer } from '@/types';

killStuckProcess();

//test('[collateralModule] it can initialize collateral', async (t: Test) => {
test('[collateralModule] it can initialize collateral', async () => {
  const cvg = await convergence();
  const { collateralMint } = await initializeProtocol(cvg);

  const rfqProgram = cvg.programs().getRfq();

  // TODO: Swap out with a real PDA client, also, is there a way to get this from Solita?
  const [protocol] = await PublicKey.findProgramAddress(
    [Buffer.from('protocol')],
    rfqProgram.address
  );

  const user: Signer = new Keypair();

  const [collateralToken] = await PublicKey.findProgramAddress(
    [Buffer.from('collateral_token'), user.publicKey.toBuffer()],
    rfqProgram.address
  );

  const [collateralInfo] = await PublicKey.findProgramAddress(
    [Buffer.from('collateral_info'), user.publicKey.toBuffer()],
    rfqProgram.address
  );

  // TODO: Mint must be protocol collateral mint!!!
  //const { token: toToken } = await cvg
  //  .tokens()
  //  //.createToken({ mint: mint.address, token: user, owner: user.publicKey });
  //  .createToken({ mint: mint.address, owner: user.publicKey });

  //await cvg.tokens().mint({
  //  mintAddress: mint.address,
  //  amount: token(42),
  //  toToken: toToken.address,
  //});

  await cvg.collateral().initializeCollateral({
    user,
    protocol,
    collateralToken,
    collateralInfo,
    collateralMint: collateralMint.address,
  });

  //spok(t, collateral, {
  //  $topic: 'Initialize Collateral',
  //  model: 'collateral',
  //  address: spokSamePubkey(collateral.address),
  //});
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
