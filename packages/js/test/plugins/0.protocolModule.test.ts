import test, { Test } from 'tape';
import spok from 'spok';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ADDRESS as SPOT_INSTRUMENT_PROGRAM_ADDRESS } from '@convergence-rfq/spot-instrument';
//import { PROGRAM_ADDRESS as PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ADDRESS } from '@convergence-rfq/psyoptions-european-instrument';
import {
  convergence,
  killStuckProcess,
  spokSamePubkey,
  initializeProtocol,
  mintAuthority,
} from '../helpers';

killStuckProcess();

test('[protocolModule] it can initialize the protocol', async (t: Test) => {
  const cvg = await convergence();
  const { protocol } = await initializeProtocol(cvg, mintAuthority);

  spok(t, protocol, {
    $topic: 'Initialize Protocol',
    model: 'protocol',
    address: spokSamePubkey(protocol.address),
  });

  const authority = cvg.rpc().getDefaultFeePayer();

  const validateDataAccountAmount = 1;
  const prepareToSettleAccountAmount = 7;
  const settleAccountAmount = 3;
  const revertPreparationAccountAmount = 3;
  const cleanUpAccountAmount = 4;
  const canBeUsedAsQuote = true;

  await cvg.protocol().addInstrument({
    authority,
    protocol: protocol.address,
    instrumentProgram: new PublicKey(SPOT_INSTRUMENT_PROGRAM_ADDRESS),
    canBeUsedAsQuote: true,
    validateDataAccountAmount,
    canBeUsedAsQuote,
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

  //await cvg.protocol().addInstrument({
  //  authority,
  //  protocol: protocol.address,
  //  instrumentProgram: new PublicKey(
  //    PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ADDRESS
  //  ),
  //  validateDataAccountAmount,
  //  prepareToSettleAccountAmount,
  //  settleAccountAmount,
  //  revertPreparationAccountAmount,
  //  cleanUpAccountAmount,
  //});
});
