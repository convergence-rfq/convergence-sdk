import test, { Test } from 'tape';
import spok from 'spok';
import {
  convergence,
  killStuckProcess,
  // spokSamePubkey,
  initializeProtocol,
  initializeCollateral,
  fundCollateral,
} from '../helpers';
import { PublicKey } from '@solana/web3.js';
// import { token } from '@/index';

killStuckProcess();

// test('[collateralModule] it can initialize collateral', async (t: Test) => {
//   const cvg = await convergence();
//   const { collateralMint } = await initializeProtocol(cvg);
//   const { collateral } = await initializeCollateral(cvg, collateralMint);

//   spok(t, collateral, {
//     $topic: 'Initialize Collateral',
//     model: 'collateral',
//     address: spokSamePubkey(collateral.address),
//   });
// });

// test('[collateralModule] it can fund collateral', async (t: Test) => {
//   const cvg = await convergence();
//   const rfqProgram = cvg.programs().getRfq();

//   const { collateralMint } = await initializeProtocol(cvg);

//   await initializeCollateral(cvg, collateralMint);
//   const amount = await fundCollateral(cvg, collateralMint);

//   const [collateralToken] = PublicKey.findProgramAddressSync(
//     [Buffer.from('collateral_token'), cvg.identity().publicKey.toBuffer()],
//     rfqProgram.address
//   );

//   const maybeAccount = await cvg.rpc().getAccount(collateralToken, 'confirmed');

//   const tokenAccount = await cvg
//     .tokens()
//     .findTokenByAddress({ address: maybeAccount.publicKey });

//   spok(t, tokenAccount, {
//     $topic: 'Fund Collateral',
//     model: 'token',
//     mintAddress: spokSamePubkey(collateralMint.address),
//     amount: token(amount),
//   });
// });

test('[collateralModule] it can withdraw collateral', async (t: Test) => {
  const cvg = await convergence();
  const rfqProgram = cvg.programs().getRfq();
  const amount = 25;

  const { collateralMint } = await initializeProtocol(cvg);
  await initializeCollateral(cvg, collateralMint);
  const { userTokens } = await fundCollateral(cvg, collateralMint, amount);

  const [protocol] = PublicKey.findProgramAddressSync(
    [Buffer.from('protocol')],
    rfqProgram.address
  );
  const [collateralInfo] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_info'), cvg.identity().publicKey.toBuffer()],
    rfqProgram.address
  );
  const [collateralToken] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), cvg.identity().publicKey.toBuffer()],
    rfqProgram.address
  );

  await cvg.collateral().withdrawCollateral({
    user: cvg.identity(),
    userTokens: userTokens.address,
    protocol,
    collateralInfo,
    collateralToken,
    amount: amount,
  });

  // spok(t, userTokens, {
  //   $topic: 'Withdraw Collateral',
  //   model: 'token',
  //   amount: token(amount - 1),
  // });

  spok(t, userTokens.amount, {
    $topic: 'Withdraw Collateral',
    basisPoints: amount,
  });
});
