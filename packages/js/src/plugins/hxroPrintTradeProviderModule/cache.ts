import { toHxroPrintTradeProviderConfig } from './models';
import { toHxroPrintTradeProviderConfigAccount } from './accounts';
import { Convergence } from '@/Convergence';
import { useCache } from '@/utils';

export const configCache = useCache(
  async (cvg: Convergence, commitment = 'confirmed') => {
    const configAddress = cvg.hxro().pdas().config();
    const account = await cvg.rpc().getAccount(configAddress, commitment);
    const configAccount = toHxroPrintTradeProviderConfigAccount(account);

    return toHxroPrintTradeProviderConfig(configAccount);
  }
);
