import {
  Commitment,
  PublicKey,
  Connection,
  LAMPORTS_PER_SOL,
  Keypair,
} from '@solana/web3.js';
import { Program, web3 } from '@project-serum/anchor';
import * as anchor from '@project-serum/anchor';
import {
  createProgram,
  programId as psyoptionsEuropeanProgramId,
  instructions,
} from '@mithraic-labs/tokenized-euros';
import {
  IDL as PseudoPythIdl,
  Pyth,
} from '../../../../programs/pseudo_pyth_idl';
import {
  Convergence,
  keypairIdentity,
  KeypairSigner,
  Mint,
  toBigNumber,
  walletAdapterIdentity,
} from '@/index';

const { initializeAllAccountsInstructions, createEuroMetaInstruction } =
  instructions;

export const SWITCHBOARD_BTC_ORACLE = new PublicKey(
  '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee'
);

/**
 * HELPERS
 */

export type ConvergenceOptions = {
  commitment?: Commitment;
  rpcEndpoint?: string;
  solsToAirdrop?: number;
};

export const createCvg = (options: ConvergenceOptions = {}) => {
  const connection = new Connection(
    options.rpcEndpoint ?? 'http://127.0.0.1:8899',
    {
      commitment: options.commitment ?? 'confirmed',
    }
  );
  return Convergence.make(connection);
};

export const convergenceCli = async (options: ConvergenceOptions = {}) => {
  const cvg = createCvg(options);
  const wallet = await createWallet(cvg, options.solsToAirdrop);
  return cvg.use(keypairIdentity(wallet as Keypair));
};

export const convergenceUi = async (
  options: ConvergenceOptions = {},
  publicKey: PublicKey
) => {
  const cvg = createCvg(options);
  return cvg.use(walletAdapterIdentity({ publicKey }));
};

export const createWallet = async (
  cvg: Convergence,
  solsToAirdrop = 100
): Promise<KeypairSigner> => {
  const wallet = Keypair.generate();
  const tx = await cvg.connection.requestAirdrop(
    wallet.publicKey,
    solsToAirdrop * LAMPORTS_PER_SOL
  );
  await cvg.connection.confirmTransaction(tx);
  return wallet;
};

/**
 * CONSTANTS
 */

export const BTC_DECIMALS = 9;
export const USDC_DECIMALS = 6;

/**
 *  PSYOPTIONS EUROPEAN
 */
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
  underlyingAmountPerContract: number,
  expiresIn: number
) => {
  const payer = convergence.rpc().getDefaultFeePayer();

  const wallet = new anchor.Wallet(payer as Keypair);
  const provider = new anchor.AnchorProvider(
    convergence.connection,
    wallet,
    {}
  );

  const psyoptionsEuropeanProgram = createProgram(
    payer as Keypair,
    convergence.connection.rpcEndpoint,
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

  const expiration = new anchor.BN(Date.now() / 1_000 + expiresIn);

  const { instructions } = await initializeAllAccountsInstructions(
    psyoptionsEuropeanProgram,
    underlyingMint.address,
    stableMint.address,
    oracle,
    expiration,
    USDC_DECIMALS
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
      USDC_DECIMALS,
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
