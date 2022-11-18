import test, { Test } from 'tape';
import spok from 'spok';
import {
  convergence,
  createRfq,
  killStuckProcess,
  spokSamePubkey,
} from '../helpers';

killStuckProcess();

test('[rfqModule] it can create a RFQ', async (t: Test) => {
  const cvg = await convergence({
    rpcEndpoint: 'https://api.devnet.solana.com',
  });
  const originalRfq = await createRfq(cvg);
  const rfq = await cvg
    .rfqs()
    .findByAddress({ addresses: [originalRfq.address] });

  spok(t, rfq, {
    $topic: 'Loaded RFQ',
    model: 'rfq',
    address: spokSamePubkey(rfq.address),
  });
});
