import test, { Test } from 'tape';
import spok from 'spok';
import {
  convergence,
  killStuckProcess,
  spokSamePubkey,
  initializeProtocol,
  initializeCollateral,
  // fundCollateral,
  // spokSameAmount,
} from '../helpers';
// import { PublicKey } from '@solana/web3.js';
// import { token } from '@/index';
// import { sol, amount } from '@/types';

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

// test('[collateralModule] it can fund collateral', async (t: Test) => {
//   const cvg = await convergence();
//   const rfqProgram = cvg.programs().getRfq();

//   const { collateralMint } = await initializeProtocol(cvg);
//   await initializeCollateral(cvg, collateralMint);
//   await fundCollateral(cvg, collateralMint);

//   const [collateralToken] = PublicKey.findProgramAddressSync(
//     [Buffer.from('collateral_token'), cvg.identity().publicKey.toBuffer()],
//     rfqProgram.address
//   );

//   const maybeAccount = await cvg.rpc().getAccount(collateralToken, 'confirmed');

//   const tokenAccount = await cvg
//     .tokens()
//     .findTokenByAddress({ address: maybeAccount.publicKey });

//   const balance = await cvg.rpc().getBalance(collateralToken, 'confirmed');

//   spok(t, tokenAccount, {
//     $topic: 'Fund Collateral',
//     amount: spokSameAmount(token(balance.basisPoints)),
//   });
// });
