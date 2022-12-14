import test, { Test } from 'tape';
import spok from 'spok';
import {
  convergence,
  killStuckProcess,
  spokSamePubkey,
  initializeProtocol,
  initializeCollateral,
  // spokSameAmount,
} from '../helpers';
import { PublicKey } from '@solana/web3.js';
import { token } from '@/index';

killStuckProcess();

test('[collateralModule] it can initialize collateral', async (t: Test) => {
  const cvg = await convergence();
  const { collateralMint } = await initializeProtocol(cvg);
  const user = cvg.identity();

  const rfqProgram = cvg.programs().getRfq();

  const [protocol] = PublicKey.findProgramAddressSync(
    [Buffer.from('protocol')],
    rfqProgram.address
  );
  const [collateralInfo] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_info'), user.publicKey.toBuffer()],
    rfqProgram.address
  );
  const [collateralToken] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), user.publicKey.toBuffer()],
    rfqProgram.address
  );

  const { collateral } = await cvg.collateral().initializeCollateral({
    user,
    protocol,
    collateralMint: collateralMint.address,
    collateralInfo,
    collateralToken,
  });

  spok(t, collateral, {
    $topic: 'Initialize Collateral',
    model: 'collateral',
    address: spokSamePubkey(collateral.address),
  });
});

test('[collateralModule] it can fund collateral', async (t: Test) => {
  const cvg = await convergence();
  const user = cvg.identity();
  const { collateralMint } = await initializeProtocol(cvg);
  const rfqProgram = cvg.programs().getRfq();

  const {} = await initializeCollateral(cvg, collateralMint);

  const [protocol] = PublicKey.findProgramAddressSync(
    [Buffer.from('protocol')],
    rfqProgram.address
  );
  const [collateralInfo] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_info'), user.publicKey.toBuffer()],
    rfqProgram.address
  );
  const [collateralToken] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), user.publicKey.toBuffer()],
    rfqProgram.address
  );

  const { token: userTokens } = await cvg
    .tokens()
    .createToken({ mint: collateralMint.address });

  await cvg.tokens().mint({
    mintAddress: collateralMint.address,
    amount: token(42),
    toToken: userTokens.address,
  });

  const amount = 25;

  await cvg.collateral().fundCollateral({
    user,
    userTokens: userTokens.address,
    protocol,
    collateralInfo,
    collateralToken,
    amount,
  });

  // const balance = await cvg.rpc().getBalance(collateralToken, 'confirmed');

  // spok(t, collateral, {
  //   $topic: 'Fund Collateral',
  //   model: 'collateral',
  //   address: spokSamePubkey(collateral.address),
  //   lockedTokensAmount: spokSameAmount(balance),
  // });
});
