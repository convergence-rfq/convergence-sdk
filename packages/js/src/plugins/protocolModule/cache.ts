import { Convergence } from '../../Convergence';
import { useCache } from '../../utils';
import { toProtocolAccount } from './accounts';
import { toProtocol } from './models';

export const protocolCache = useCache(
  async (cvg: Convergence, commitment = 'confirmed') => {
    const address = cvg.protocol().pdas().protocol();
    const account = await cvg.rpc().getAccount(address, commitment);
    return toProtocol(toProtocolAccount(account));
  }
);

export const baseAssetsCache = useCache(async (cvg: Convergence) => {
  const baseAssets = await cvg.protocol().getBaseAssets();
  return baseAssets;
});

export const registeredMintsCache = useCache(async (cvg: Convergence) => {
  const registeredMints = await cvg.protocol().getRegisteredMints();
  return registeredMints;
});
