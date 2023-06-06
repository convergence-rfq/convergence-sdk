import { Commitment, Connection } from '@solana/web3.js';
import { PROGRAM_ID } from '@convergence-rfq/rfq';
import { v4 as uuidv4 } from 'uuid';

import { getUserKp, RPC_ENDPOINT } from '../../validator';
import {
  Convergence,
  keypairIdentity,
  PublicKey,
  removeDecimals,
} from '../src';

const DEFAULT_COMMITMENT = 'confirmed';
const DEFAULT_SKIP_PREFLIGHT = true;

export type ConvergenceTestOptions = {
  commitment?: Commitment;
  skipPreflight?: boolean;
  rpcEndpoint?: string;
  solsToAirdrop?: number;
};

export const createCvg = (options: ConvergenceTestOptions = {}) => {
  const connection = new Connection(options.rpcEndpoint ?? RPC_ENDPOINT, {
    commitment: options.commitment ?? DEFAULT_COMMITMENT,
  });
  return Convergence.make(connection, { skipPreflight: options.skipPreflight });
};

// Default user is dao but could be maker or taker
export const createUserCvg = (user = 'dao'): Convergence => {
  const cvg = createCvg({ skipPreflight: DEFAULT_SKIP_PREFLIGHT });
  return cvg.use(keypairIdentity(getUserKp(user)));
};

export const generatePk = async (): Promise<PublicKey> => {
  return await PublicKey.createWithSeed(PROGRAM_ID, uuidv4(), PROGRAM_ID);
};

export const sleep = (seconds: number) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

export const fetchTokenAmount = async (
  cvg: Convergence,
  mintAddress: PublicKey,
  owner: PublicKey
) => {
  const takerBtcBefore = await cvg.tokens().findTokenWithMintByMint({
    mint: mintAddress,
    address: owner,
    addressType: 'owner',
  });
  return removeDecimals(
    takerBtcBefore.amount.basisPoints,
    takerBtcBefore.amount.currency.decimals
  );
};
