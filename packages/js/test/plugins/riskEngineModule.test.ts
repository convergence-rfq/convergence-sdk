import test from 'tape';
import { convergence, killStuckProcess } from '../helpers';

killStuckProcess();

test('[riskEngineModule] it can create the risk engine client', async () => {
  const cvg = await convergence();
  cvg.riskEngine();
});
