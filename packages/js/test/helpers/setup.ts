import { readFileSync } from 'fs';
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
  token,
  walletAdapterIdentity,
} from '@/index';

const { initializeAllAccountsInstructions, createEuroMetaInstruction } =
  instructions;

export const SWITCHBOARD_BTC_ORACLE = new PublicKey(
  '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee'
);
export const SWITCHBOARD_SOL_ORACLE = new PublicKey(
  'GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR'
);

/**
 * HELPERS
 */

export type ConvergenceTestOptions = {
  commitment?: Commitment;
  skipPreflight?: boolean;
  rpcEndpoint?: string;
  solsToAirdrop?: number;
};

export const createCvg = (options: ConvergenceTestOptions = {}) => {
  const connection = new Connection(
    options.rpcEndpoint ?? 'http://127.0.0.1:8899',
    {
      commitment: options.commitment ?? 'confirmed',
    }
  );
  return Convergence.make(connection, { skipPreflight: options.skipPreflight });
};

export const convergenceCli = async (options: ConvergenceTestOptions = {}) => {
  const cvg = createCvg(options);
  const wallet = await createWallet(cvg, options.solsToAirdrop);
  return cvg.use(keypairIdentity(wallet as Keypair));
};

export const convergenceUi = async (
  options: ConvergenceTestOptions = {},
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

export const setupAccounts = async (cvg: Convergence, walletAmount: number) => {
  const mintAuthority = Keypair.generate();
  const maker = Keypair.fromSecretKey(
    new Uint8Array(
      JSON.parse(readFileSync('./test/fixtures/maker.json', 'utf8'))
    )
  );
  const taker = Keypair.fromSecretKey(
    new Uint8Array(
      JSON.parse(readFileSync('./test/fixtures/taker.json', 'utf8'))
    )
  );

  // Setup wallets
  const walletTx = await cvg.connection.requestAirdrop(
    maker.publicKey,
    1 * LAMPORTS_PER_SOL
  );
  await cvg.connection.confirmTransaction(walletTx);

  const takerTx = await cvg.connection.requestAirdrop(
    taker.publicKey,
    1 * LAMPORTS_PER_SOL
  );
  await cvg.connection.confirmTransaction(takerTx);

  // Setup mints
  const { mint: usdcMint } = await cvg.tokens().createMint({
    mintAuthority: mintAuthority.publicKey,
    decimals: USDC_DECIMALS,
  });
  const { mint: btcMint } = await cvg.tokens().createMint({
    mintAuthority: mintAuthority.publicKey,
    decimals: BTC_DECIMALS,
  });

  // Setup USDC wallets
  const { token: takerUSDCWallet } = await cvg
    .tokens()
    .createToken({ mint: usdcMint.address, owner: taker.publicKey });
  const { token: makerUSDCWallet } = await cvg
    .tokens()
    .createToken({ mint: usdcMint.address, owner: maker.publicKey });

  // Mint USDC
  await cvg.tokens().mint({
    mintAddress: usdcMint.address,
    amount: token(walletAmount),
    toToken: makerUSDCWallet.address,
    mintAuthority,
  });
  await cvg.tokens().mint({
    mintAddress: usdcMint.address,
    amount: token(walletAmount),
    toToken: takerUSDCWallet.address,
    mintAuthority,
  });

  // Setup BTC wallets
  const { token: makerBTCWallet } = await cvg
    .tokens()
    .createToken({ mint: btcMint.address, owner: maker.publicKey });
  const { token: takerBTCWallet } = await cvg
    .tokens()
    .createToken({ mint: btcMint.address, owner: taker.publicKey });

  // Mint BTC
  await cvg.tokens().mint({
    mintAddress: btcMint.address,
    amount: token(walletAmount),
    toToken: takerBTCWallet.address,
    mintAuthority,
  });
  await cvg.tokens().mint({
    mintAddress: btcMint.address,
    amount: token(walletAmount),
    toToken: makerBTCWallet.address,
    mintAuthority,
  });

  return {
    maker,
    taker,
    usdcMint,
    btcMint,
    makerBTCWallet,
    makerUSDCWallet,
    takerBTCWallet,
    takerUSDCWallet,
  };
};

/**
 * CONSTANTS
 */

export const BTC_DECIMALS = 9;
export const USDC_DECIMALS = 9;

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

  const provider = new anchor.AnchorProvider(
    convergence.connection,
    new anchor.Wallet(payer as Keypair),
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
    stableMint.decimals * -1
  );

  const expiration = new anchor.BN(Date.now() / 1_000 + expiresIn);

  const { instructions } = await initializeAllAccountsInstructions(
    psyoptionsEuropeanProgram,
    underlyingMint.address,
    stableMint.address,
    oracle,
    expiration,
    stableMint.decimals
  );
  const { instruction, euroMeta, euroMetaKey } =
    await createEuroMetaInstruction(
      psyoptionsEuropeanProgram,
      underlyingMint.address,
      underlyingMint.decimals,
      stableMint.address,
      stableMint.decimals,
      expiration,
      toBigNumber(underlyingAmountPerContract),
      toBigNumber(strikePrice),
      stableMint.decimals,
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
