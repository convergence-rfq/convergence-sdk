import test, { Test } from 'tape';
import spok from 'spok';
import { Keypair } from '@solana/web3.js';
import { convergence, killStuckProcess, spokSamePubkey } from '../helpers';
import { token } from '@/index';

killStuckProcess();

test('[protocolModule] it can initialize the protocol', async (t: Test) => {
  const cvg = await convergence();
  const { mint } = await cvg.tokens().createMint();

  const signer = Keypair.generate();

  const { token: toToken } = await cvg
    .tokens()
    .createToken({ mint: mint.address, token: signer });

  await cvg.tokens().mint({
    mintAddress: mint.address,
    amount: token(42),
    toToken: toToken.address,
  });

  const { protocol } = await cvg.protocol().initialize({
    collateralMint: mint.address,
  });

  spok(t, protocol, {
    $topic: 'Initialize Protocol',
    model: 'protocol',
    address: spokSamePubkey(protocol.address),
  });
});
