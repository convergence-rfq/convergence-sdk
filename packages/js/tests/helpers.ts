import { Commitment, Connection } from '@solana/web3.js';

import { getKeypair } from '../../validator';
import { Convergence, keypairIdentity } from '../src';

const RPC_ENDPOINT = 'http://127.0.0.1:8899';

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

export const createSdk = async (user = 'dao'): Promise<Convergence> => {
  const cvg = createCvg();
  return cvg.use(keypairIdentity(getKeypair(user)));
};
