import test, { Test } from 'tape';
import spok from 'spok';
import {
  convergence,
  killStuckProcess,
  spokSamePubkey,
  initializeProtocol,
} from '../helpers';

killStuckProcess();

test('[protocolModule] it can initialize the protocol', async (t: Test) => {
  const cvg = await convergence();
  const { protocol } = await initializeProtocol(cvg);

  spok(t, protocol, {
    $topic: 'Initialize Protocol',
    model: 'protocol',
    address: spokSamePubkey(protocol.address),
  });
});
