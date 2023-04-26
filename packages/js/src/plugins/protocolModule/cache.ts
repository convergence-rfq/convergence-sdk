import { Commitment } from '@solana/web3.js';
import { Convergence } from '../../Convergence';
import { useCache } from '../../utils';
import { toProtocol } from './models';
import { toProtocolAccount } from './accounts';

export const protocolAccountCache = useCache(
  300,
  async (cvg: Convergence, commitment: Commitment | undefined) => {
    const address = cvg.protocol().pdas().protocol();
    const account = await cvg.rpc().getAccount(address, commitment);
    return toProtocol(toProtocolAccount(account));
  }
);
