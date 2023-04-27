import { Commitment, Connection } from '@solana/web3.js';
import { PROGRAM_ID } from '@convergence-rfq/rfq';
import { v4 as uuidv4 } from 'uuid';

import { getUserKp, RPC_ENDPOINT, Ctx } from '../../validator';
import { Convergence, keypairIdentity, PublicKey } from '../src';

// This comes from the CPL fixtures used in validator
export const CTX = new Ctx();
export const BASE_MINT_DECIMALS = 9;
export const BASE_MINT_PK = new PublicKey(CTX.baseMint);
export const QUOTE_MINT_PK = new PublicKey(CTX.quoteMint);

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

// Default user is dao but could be maker or taker
export const createUserCvg = (user = 'dao'): Convergence => {
  const cvg = createCvg({ skipPreflight: true });
  return cvg.use(keypairIdentity(getUserKp(user)));
};

export const generatePk = async (): Promise<PublicKey> => {
  return await PublicKey.createWithSeed(PROGRAM_ID, uuidv4(), PROGRAM_ID);
};
