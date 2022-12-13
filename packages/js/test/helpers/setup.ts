import { Commitment, Connection, Keypair } from '@solana/web3.js';
import { LOCALHOST } from '@metaplex-foundation/amman-client';
import { amman } from './amman';
import { Convergence, token, keypairIdentity, KeypairSigner } from '@/index';

export type ConvergenceTestOptions = {
  commitment?: Commitment;
  rpcEndpoint?: string;
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

export const initializeProtocol = async (cvg: Convergence) => {
  const { mint: collateralMint } = await cvg.tokens().createMint();
  const signer = Keypair.generate();

  const { token: toToken } = await cvg
    .tokens()
    .createToken({ mint: collateralMint.address, token: signer });

  await cvg.tokens().mint({
    mintAddress: collateralMint.address,
    amount: token(42),
    toToken: toToken.address,
  });

  const { protocol } = await cvg.protocol().initialize({
    collateralMint: collateralMint.address,
  });

  return { protocol, collateralMint };
};
