import { Commitment, Connection } from '@solana/web3.js';

import { getKeypair, RPC_ENDPOINT } from '../../validator';
import { Convergence, keypairIdentity } from '../src';

export type ConvergenceTestOptions = {
  commitment?: Commitment;
  skipPreflight?: boolean;
  rpcEndpoint?: string;
  solsToAirdrop?: number;
};

export const createCvg = (options: ConvergenceTestOptions = {}) => {
  const connection = new Connection(options.rpcEndpoint ?? RPC_ENDPOINT, {
    commitment: options.commitment ?? 'confirmed',
  });
  return Convergence.make(connection, { skipPreflight: options.skipPreflight });
};

// Default user is dao but could be maker, taker or mint_authority
export const createSdk = async (user = 'dao'): Promise<Convergence> => {
  const cvg = createCvg();
  return cvg.use(keypairIdentity(getKeypair(user)));
};
