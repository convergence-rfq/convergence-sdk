import { readFileSync } from 'fs';
import { Connection, Keypair } from '@solana/web3.js';
import { Convergence, keypairIdentity } from '@convergence-rfq/sdk';

export type Opts = any;

export const createCvg = async (opts: Opts): Promise<Convergence> => {
  const buffer = JSON.parse(readFileSync(opts.keypairFile, 'utf8'));
  const user: Keypair = Keypair.fromSecretKey(new Uint8Array(buffer));
  const cvg = new Convergence(
    new Connection(opts.rpcEndpoint, {
      commitment: 'confirmed',
    }),
    { skipPreflight: true }
  );
  cvg.use(keypairIdentity(user));
  return cvg;
};
