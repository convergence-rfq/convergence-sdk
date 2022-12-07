import test, { Test } from 'tape';
import { convergence, killStuckProcess } from '../helpers';

killStuckProcess();

test('[riskEngineModule] it can create the risk engine client', async (t: Test) => {
  const cvg = await convergence();
  const { address } = cvg.programs().getRiskEngine();
  t.assert(address, 'Created Risk Engine Client');
});
