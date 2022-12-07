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
  const cvg = await convergence();
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

test('[rfqModule] it can cancel an RFQ', async (_t: Test) => {
  await convergence();
  //const originalRfq = await createRfq(cvg);
  //await cvg.rfqs().cancelRfq({ address: originalRfq.address });
  //const rfq = await cvg
  //  .rfqs()
  //  .findByAddress({ addresses: [originalRfq.address] });

  //spok(t, rfq, {
  //  $topic: 'Loaded RFQ',
  //  model: 'rfq',
  //  address: spokSamePubkey(rfq.address),
  //});
});

test('[rfqModule] it can respond to an RFQ', async (t: Test) => {
  const cvg = await convergence({
    rpcEndpoint: 'https://api.devnet.solana.com',
  });
  const originalRfq = await createRfq(cvg);
  await cvg.rfqs().respond({ address: originalRfq.address });
  const rfq = await cvg
    .rfqs()
    .findByAddress({ addresses: [originalRfq.address] });

  spok(t, rfq, {
    $topic: 'Loaded RFQ',
    model: 'rfq',
    address: spokSamePubkey(rfq.address),
  });
});
