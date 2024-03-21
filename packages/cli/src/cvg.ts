import { readFileSync } from 'fs';
import { Connection, Keypair } from '@solana/web3.js';
import { Convergence, keypairIdentity } from '@convergence-rfq/sdk';
import { resolveMaxRetriesArg, resolveTxPriorityArg } from './helpers';

export type Opts = any;

export const createCvg = async (opts: Opts): Promise<Convergence> => {
  const buffer = JSON.parse(readFileSync(opts.keypairFile, 'utf8'));
  const user = Keypair.fromSecretKey(new Uint8Array(buffer));
  const txPriorityString: string = opts.txPriorityFee;
  const maxRetriesString = opts.maxRetries;
  const maxRetries = resolveMaxRetriesArg(maxRetriesString);

  const txPriority = resolveTxPriorityArg(txPriorityString);
  const cvg = new Convergence(
    new Connection(opts.rpcEndpoint, {
      commitment: 'confirmed',
    }),
    {
      skipPreflight: opts.skipPreflight,
      transactionPriority: txPriority,
      maxRetries,
    }
  );
  cvg.use(keypairIdentity(user));
  return cvg;
};
