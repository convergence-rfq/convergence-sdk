import test, { Test } from 'tape';
import spok from 'spok';
import {
  convergence,
  killStuckProcess,
  createRfq,
  spokSamePubkey,
} from '../helpers';

killStuckProcess();

test('[rfqModule] it can create a RFQ', async (t: Test) => {
  const cvg = await convergence();

  const { rfq } = await createRfq(cvg);
  const foundRfq = await cvg.rfqs().findByAddress({ address: rfq.address });

  spok(t, rfq, {
    $topic: 'Created RFQ',
    model: 'rfq',
    address: spokSamePubkey(foundRfq.address),
  });
});

//test('[rfqModule] it can find RFQs by addresses', async (t: Test) => {
//  const cvg = await convergence();
//
//  const { rfq: rfq1 } = await createRfq(cvg);
//  const { rfq: rfq2 } = await createRfq(cvg);
//  const { rfq: rfq3 } = await createRfq(cvg);
//
//  const [foundRfq1, foundRfq2, foundRfq3] = await cvg
//    .rfqs()
//    .findByAddresses({ addresses: [rfq1.address, rfq2.address, rfq3.address] });
//
//  spok(t, rfq1, {
//    $topic: 'Created RFQ',
//    model: 'rfq',
//    address: spokSamePubkey(foundRfq1.address),
//  });
//  spok(t, rfq2, {
//    $topic: 'Created RFQ',
//    model: 'rfq',
//    address: spokSamePubkey(foundRfq2.address),
//  });
//  spok(t, rfq3, {
//    $topic: 'Created RFQ',
//    model: 'rfq',
//    address: spokSamePubkey(foundRfq3.address),
//  });
//});

//test('[rfqModule] it can cancel an RFQ', async (_t: Test) => {
//await convergence();
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
//});

//test('[rfqModule] it can respond to an RFQ', async (t: Test) => {
//  const cvg = await convergence();
//  const originalRfq = await createRfq(cvg);
//  await cvg.rfqs().respond({ address: originalRfq.address });
//  const rfq = await cvg
//    .rfqs()
//    .findByAddress({ addresses: [originalRfq.address] });
//
//  spok(t, rfq, {
//    $topic: 'Loaded RFQ',
//    model: 'rfq',
//    address: spokSamePubkey(rfq.address),
//  });
//});
