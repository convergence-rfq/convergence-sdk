import { Convergence } from '../../Convergence';
import { useCache } from '../../utils';
import { toConfigAccount } from './accounts';
import { assertConfig, toConfig } from './models';

export const riskEngineConfigCache = useCache(
  async (cvg: Convergence, commitment = 'confirmed') => {
    const account = await cvg
      .rpc()
      .getAccount(cvg.riskEngine().pdas().config(), commitment);

    const config = toConfig(toConfigAccount(account));
    assertConfig(config);

    return config;
  }
);
