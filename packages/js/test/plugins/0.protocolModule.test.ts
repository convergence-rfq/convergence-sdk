import test, { Test } from 'tape';
import spok from 'spok';
import { Keypair } from '@solana/web3.js';
import {
  convergence,
  killStuckProcess,
  spokSamePubkey,
  initializeProtocol,
} from '../helpers';

killStuckProcess();

test('[protocolModule] it can initialize the protocol', async (t: Test) => {
  const cvg = await convergence();
  const { protocol, authority } = await initializeProtocol(cvg);

  spok(t, protocol, {
    $topic: 'Initialize Protocol',
    model: 'protocol',
    address: spokSamePubkey(protocol.address),
  });

  const instrumentProgram = Keypair.generate();
  const validateDataAccountAmount = 0;
  const prepareToSettleAccountAmount = 0;
  const settleAccountAmount = 0;
  const revertPreparationAccountAmount = 0;
  const cleanUpAccountAmount = 0;

  await cvg.protocol().addInstrument({
    authority,
    protocol: protocol.address,
    instrumentProgram: instrumentProgram.publicKey,
    validateDataAccountAmount,
    prepareToSettleAccountAmount,
    settleAccountAmount,
    revertPreparationAccountAmount,
    cleanUpAccountAmount,
  });

  //spok(t, protocol, {
  //  $topic: 'Add Instrument',
  //  model: 'protocol',
  //  address: spokSamePubkey(protocol.address),
  //});
});
