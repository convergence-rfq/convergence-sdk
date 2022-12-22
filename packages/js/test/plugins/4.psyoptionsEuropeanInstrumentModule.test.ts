import test, { Test } from 'tape';
//import spok from 'spok';
import {
  convergence,
  killStuckProcess,
  //createRfq,
  //spokSamePubkey,
} from '../helpers';

killStuckProcess();

//test('[psyoptionsEuropeanInstrumentModule] it can create a PsyOptions European instrument', async (t: Test) => {
test('[psyoptionsEuropeanInstrumentModule] it can create a PsyOptions European instrument', async () => {
  const cvg = await convergence();

  //const { rfq } = await createRfq(cvg);
  //const psyoptionsEuropeanInstrument = await cvg
  await cvg.psyoptionsEuropeanInstrument().initialize({
    collateralMint: cvg.identity().publicKey,
  });

  //spok(t, psyoptionsEuropeanInstrument, {
  //  $topic: 'Created PsyOptions European instrument',
  //  model: 'psyoptionsEuropeanInstrument',
  //  address: spokSamePubkey(psyoptionsEuropeanInstrument.address),
  //});
});
