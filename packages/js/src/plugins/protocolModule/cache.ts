import { Convergence } from '../../Convergence';
import { useCache, DEFAULT_CACHE } from '../../utils';
import { toProtocolAccount } from './accounts';
import { toProtocol } from './models';

export const protocolCache = useCache(
  DEFAULT_CACHE,
  async (cvg: Convergence, commitment = 'confirmed') => {
    const address = cvg.protocol().pdas().protocol();
    const account = await cvg.rpc().getAccount(address, commitment);
    return toProtocol(toProtocolAccount(account));
  }
);
