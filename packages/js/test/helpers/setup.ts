import { Commitment, Connection, Keypair } from '@solana/web3.js';
import { LOCALHOST } from '@metaplex-foundation/amman-client';
import { amman } from './amman';
import {
  Convergence,
  keypairIdentity,
  CreateRfqInput,
  CancelRfqInput,
  KeypairSigner,
} from '@/index';

export type ConvergenceTestOptions = {
  rpcEndpoint?: string;
  commitment?: Commitment;
  solsToAirdrop?: number;
};

export const convergenceGuest = (options: ConvergenceTestOptions = {}) => {
  const connection = new Connection(options.rpcEndpoint ?? LOCALHOST, {
    commitment: options.commitment ?? 'confirmed',
  });
  return Convergence.make(connection);
};

export const convergence = async (options: ConvergenceTestOptions = {}) => {
  const cvg = convergenceGuest(options);
  const wallet = await createWallet(cvg, options.solsToAirdrop);
  return cvg.use(keypairIdentity(wallet as Keypair));
};

export const createWallet = async (
  cvg: Convergence,
  solsToAirdrop = 100
): Promise<KeypairSigner> => {
  const wallet = Keypair.generate();
  await amman.airdrop(cvg.connection, wallet.publicKey, solsToAirdrop);
  return wallet;
};

export const createRfq = async (
  cvg: Convergence,
  input: CreateRfqInput
) => {
  const { rfq } = await cvg.rfqs().create({
    ...input,
  });
  return rfq;
};

export const cancelRfq = async (cvg: Convergence, input: CancelRfqInput) => {
  const { rfq } = input;

  if (!rfq) {
    return;
  }

  await cvg.rfqs().cancelRfq({
    ...input
  });
};
