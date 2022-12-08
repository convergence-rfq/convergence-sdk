import test, { Test } from 'tape';
import spok from 'spok';
import {
  convergence,
  createRfq,
  killStuckProcess,
  spokSamePubkey,
} from '../helpers';
import { Keypair } from '@solana/web3.js';

killStuckProcess();

test('[rfqModule] it can create an RFQ', async (t: Test) => {
  const cvg = await convergence({
    rpcEndpoint: 'https://api.devnet.solana.com',
  });
  const originalRfq = await createRfq(cvg);
  const rfq = await cvg
    .rfqs()
    .findByAddresses({ addresses: [originalRfq.address] });

  spok(t, rfq, {
    $topic: 'Loaded RFQ',
    model: 'rfq',
    address: spokSamePubkey(rfq.address),
  });
});

test('[rfqModule] it can cancel an RFQ', async (t: Test) => {
  const cvg = await convergence({
    rpcEndpoint: 'https://api.devnet.solana.com',
  });

  const protocol = new Keypair().publicKey;
  const rfqPubkey = new Keypair().publicKey;
  const quoteMint = new Keypair().publicKey;

  const originalRfq = await createRfq(cvg, {
    protocol,
    rfq: rfqPubkey,
    quoteMint,
  });
  await cvg.rfqs().cancelRfq({
    protocol,
    rfq: originalRfq.address,
  });
  const rfq = await cvg.rfqs().findRfqByAddress({ rfq: originalRfq.address });

  spok(t, rfq, {
    $topic: 'Loaded RFQ',
    model: 'rfq',
    address: spokSamePubkey(rfq.address),
  });
});

test('[rfqModule] it can respond to an RFQ', async (t: Test) => {
  const cvg = await convergence({
    rpcEndpoint: 'https://api.devnet.solana.com',
  });
  const originalRfq = await createRfq(cvg);
  await cvg.rfqs().respond({ rfq: originalRfq.rfq });
  const rfq = await cvg
    .rfqs()
    .findRfqByAddress({ address: originalRfq.address });

  spok(t, rfq, {
    $topic: 'Loaded RFQ',
    model: 'rfq',
    address: spokSamePubkey(rfq.address),
  });
});
