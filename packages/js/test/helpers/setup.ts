import { Commitment, PublicKey, Connection, Keypair } from '@solana/web3.js';
import { Program, web3 } from '@project-serum/anchor';
import * as anchor from '@project-serum/anchor';
import {
  createProgram,
  programId as psyoptionsEuropeanProgramId,
  instructions,
} from '@mithraic-labs/tokenized-euros';
import { LOCALHOST } from '@metaplex-foundation/amman-client';
import {
  IDL as PseudoPythIdl,
  Pyth,
} from '../../../../programs/pseudo_pyth_idl';
import { amman } from './amman';
import {
  Convergence,
  keypairIdentity,
  KeypairSigner,
  Mint,
  toBigNumber,
} from '@/index';

const { initializeAllAccountsInstructions, createEuroMetaInstruction } =
  instructions;

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

const createPriceFeed = async (
  oracleProgram: Program<Pyth>,
  initPrice: number,
  expo: number
) => {
  const conf = toBigNumber((initPrice / 10) * 10 ** -expo);
  const collateralTokenFeed = new web3.Account();

  if (!oracleProgram?.provider?.publicKey) {
    throw new Error('oracleProgram not initialized');
  }

  await oracleProgram.rpc.initialize(
    toBigNumber(initPrice * 10 ** -expo),
    expo,
    conf,
    {
      accounts: { price: collateralTokenFeed.publicKey },
      signers: [collateralTokenFeed],
      instructions: [
        web3.SystemProgram.createAccount({
          fromPubkey: oracleProgram.provider.publicKey,
          newAccountPubkey: collateralTokenFeed.publicKey,
          space: 3312,
          lamports:
            await oracleProgram.provider.connection.getMinimumBalanceForRentExemption(
              3312
            ),
          programId: oracleProgram.programId,
        }),
      ],
    }
  );
  return collateralTokenFeed.publicKey;
};

export const initializeNewOptionMeta = async (
  convergence: Convergence,
  underlyingMint: Mint,
  stableMint: Mint,
  strikePrice: number,
  underlyingAmountPerContract: number
) => {
  const payer = convergence.rpc().getDefaultFeePayer();
  const { connection } = convergenceGuest();

  const wallet = new anchor.Wallet(payer as Keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {});

  const psyoptionsEuropeanProgram = createProgram(
    payer as Keypair,
    connection.rpcEndpoint,
    new PublicKey(psyoptionsEuropeanProgramId)
  );
  const pseudoPythProgram = new Program(
    PseudoPythIdl,
    new PublicKey('FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH'),
    provider
  );

  const oracle = await createPriceFeed(
    pseudoPythProgram,
    17_000,
    BTC_DECIMALS * -1
  );

  const expireIn = 1_000;
  const expiration = new anchor.BN(Date.now() / 1_000 + expireIn);

  const { instructions } = await initializeAllAccountsInstructions(
    psyoptionsEuropeanProgram,
    underlyingMint.address,
    stableMint.address,
    oracle,
    expiration,
    8
  );
  const { instruction, euroMeta, euroMetaKey } =
    await createEuroMetaInstruction(
      psyoptionsEuropeanProgram,
      underlyingMint.address,
      BTC_DECIMALS,
      stableMint.address,
      USDC_DECIMALS,
      expiration,
      toBigNumber(underlyingAmountPerContract),
      toBigNumber(strikePrice),
      8,
      oracle
    );
  const transaction = new web3.Transaction().add(...instructions, instruction);

  await provider.sendAndConfirm(transaction);

  return {
    euroMeta,
    euroMetaKey,
    oracle,
  };
};
