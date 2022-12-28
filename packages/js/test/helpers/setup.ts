import { Commitment, PublicKey, Connection, Keypair } from '@solana/web3.js';
import { LOCALHOST } from '@metaplex-foundation/amman-client';
import { amman } from './amman';
import {
  Convergence,
  token,
  keypairIdentity,
  KeypairSigner,
  Mint,
  Token,
} from '@/index';

export const SWITCHBOARD_BTC_ORACLE = new PublicKey(
  '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee'
);

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

/*
 * CONSTANTS
 */

export const BTC_DECIMALS = 9;
export const USDC_DECIMALS = 6;

/*
 * COLLATERAL
 */
export const fundCollateral = async (
  cvg: Convergence,
  collateralMint: Mint,
  mintAuthority: Keypair,
  amount: number
) => {
  const rfqProgram = cvg.programs().getRfq();

  const [protocol] = PublicKey.findProgramAddressSync(
    [Buffer.from('protocol')],
    rfqProgram.address
  );
  const [collateralToken] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), cvg.identity().publicKey.toBuffer()],
    rfqProgram.address
  );
  const [collateralInfo] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_info'), cvg.identity().publicKey.toBuffer()],
    rfqProgram.address
  );

  const { token: userTokens } = await cvg.tokens().createToken({
    mint: collateralMint.address,
  });

  await cvg.tokens().mint({
    mintAddress: collateralMint.address,
    amount: token(amount),
    toToken: userTokens.address,
    mintAuthority,
  });

  await cvg.collateral().fundCollateral({
    userTokens: userTokens.address,
    protocol,
    collateralInfo,
    collateralToken,
    amount,
  });

  return { userTokens };
};

export const withdrawCollateral = async (
  cvg: Convergence,
  userTokens: Token,
  amount: number
) => {
  const rfqProgram = cvg.programs().getRfq();

  const [protocol] = PublicKey.findProgramAddressSync(
    [Buffer.from('protocol')],
    rfqProgram.address
  );
  const [collateralInfo] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_info'), cvg.identity().publicKey.toBuffer()],
    rfqProgram.address
  );
  const [collateralToken] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), cvg.identity().publicKey.toBuffer()],
    rfqProgram.address
  );

  await cvg.collateral().withdrawCollateral({
    userTokens: userTokens.address,
    protocol,
    collateralInfo,
    collateralToken,
    amount,
  });
};

/**
 * PSYOPTIONS EUROPEAN
 */

export const intializePsyoptionsEuropeanInstrument = async () => {
  //const psyoptionsEuropeanInstrument = await cvg
  //await cvg.psyoptionsEuropeanInstrument().initialize({
  //  collateralMint: cvg.identity().publicKey,
  //});
  //spok(t, psyoptionsEuropeanInstrument, {
  //  $topic: 'Created PsyOptions European instrument',
  //  model: 'psyoptionsEuropeanInstrument',
  //  address: spokSamePubkey(psyoptionsEuropeanInstrument.address),
  //});
};
