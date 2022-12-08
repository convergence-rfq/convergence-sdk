import test, { Test } from 'tape';
import spok from 'spok';
import { Keypair } from '@solana/web3.js';
import { convergence, killStuckProcess, spokSamePubkey } from '../helpers';

killStuckProcess();

test('[protocolModule] it can initialize the protocol', async (t: Test) => {
  // TODO: This is not working bc we need to create these accounts beforehand
  const collateralMint = new Keypair();

  const cvg = await convergence();
  const { protocol } = await cvg.protocol().initialize({
    collateralMint: collateralMint.publicKey,
  });

  spok(t, protocol, {
    $topic: 'Initialize Protocol',
    model: 'protocol',
    address: spokSamePubkey(protocol.address),
  });
});
