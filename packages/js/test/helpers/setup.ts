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
  //@ts-ignore
  OptionType,
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
  Token,
  token,
  walletAdapterIdentity,
} from '@/index';
//@ts-ignore
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';

const {
  initializeAllAccountsInstructions,
  createEuroMetaInstruction,
  //@ts-ignore
  mintOptions,
} = instructions;

// CONSTANTS

export const SWITCHBOARD_BTC_ORACLE = new PublicKey(
  '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee'
);
export const SWITCHBOARD_SOL_ORACLE = new PublicKey(
  'GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR'
);

export const BTC_DECIMALS = 9;
export const SOL_DECIMALS = 9;
export const USDC_DECIMALS = 6;

// HELPERS

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

export const setupAccounts = async (
  cvg: Convergence,
  walletAmount: number,
  dao: PublicKey
) => {
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
  const { mint: solMint } = await cvg.tokens().createMint({
    mintAuthority: mintAuthority.publicKey,
    decimals: SOL_DECIMALS,
  });

  // Setup USDC wallets
  const { token: takerUSDCWallet } = await cvg
    .tokens()
    .createToken({ mint: usdcMint.address, owner: taker.publicKey });
  const { token: makerUSDCWallet } = await cvg
    .tokens()
    .createToken({ mint: usdcMint.address, owner: maker.publicKey });
  const { token: daoUSDCWallet } = await cvg
    .tokens()
    .createToken({ mint: usdcMint.address, owner: dao });

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
  await cvg.tokens().mint({
    mintAddress: usdcMint.address,
    amount: token(walletAmount),
    toToken: daoUSDCWallet.address,
    mintAuthority,
  });

  // Setup BTC wallets
  const { token: makerBTCWallet } = await cvg
    .tokens()
    .createToken({ mint: btcMint.address, owner: maker.publicKey });
  const { token: takerBTCWallet } = await cvg
    .tokens()
    .createToken({ mint: btcMint.address, owner: taker.publicKey });
  const { token: daoBTCWallet } = await cvg
    .tokens()
    .createToken({ mint: btcMint.address, owner: dao });

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
  await cvg.tokens().mint({
    mintAddress: btcMint.address,
    amount: token(walletAmount),
    toToken: daoBTCWallet.address,
    mintAuthority,
  });

  // Setup SOL wallets
  const { token: takerSOLWallet } = await cvg
    .tokens()
    .createToken({ mint: solMint.address, owner: taker.publicKey });

  // Mint SOL
  await cvg.tokens().mint({
    mintAddress: solMint.address,
    amount: token(walletAmount),
    toToken: takerSOLWallet.address,
    mintAuthority,
  });

  return {
    maker,
    taker,
    usdcMint,
    btcMint,
    solMint,
    makerUSDCWallet,
    makerBTCWallet,
    takerUSDCWallet,
    takerBTCWallet,
    takerSOLWallet,
    daoBTCWallet,
    daoUSDCWallet,
  };
};

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
  expiresIn: number,
  takerUSDCWallet: Token,
  makerUSDCWallet: Token
) => {
  //@ts-ignore
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

  const payer = convergence.rpc().getDefaultFeePayer();

  const provider = new anchor.AnchorProvider(
    convergence.connection,
    new anchor.Wallet(payer as Keypair),
    {}
  );
  anchor.setProvider(provider);

  const europeanProgram = createProgram(
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

  const { instructions: initializeIxs } =
    await initializeAllAccountsInstructions(
      europeanProgram,
      underlyingMint.address,
      stableMint.address,
      oracle,
      expiration,
      stableMint.decimals
    );
  const accountSetupTx = new web3.Transaction();
  initializeIxs.forEach((ix) => accountSetupTx.add(ix));
  await provider.sendAndConfirm(accountSetupTx);

  const {
    instruction: createIx,
    euroMeta,
    euroMetaKey,
  } = await createEuroMetaInstruction(
    europeanProgram,
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

  const createTx = new web3.Transaction().add(createIx);
  await provider.sendAndConfirm(createTx);

  //mintOptions

  //@ts-ignore
  const { token: takerOptionDest } = await convergence
    .tokens()
    .createToken({ mint: euroMeta.putOptionMint, owner: taker.publicKey });
  const { token: takerWriterDest } = await convergence
    .tokens()
    .createToken({ mint: euroMeta.putWriterMint, owner: taker.publicKey });

  const { token: makerOptionDest } = await convergence
    .tokens()
    .createToken({ mint: euroMeta.putOptionMint, owner: maker.publicKey });
  const { token: makerWriterDest } = await convergence
    .tokens()
    .createToken({ mint: euroMeta.putWriterMint, owner: maker.publicKey });

  // //@ts-ignore
  // const { token: makerOptionDest } = await convergence
  //   .tokens()
  //   .createToken({ mint: euroMeta.putOptionMint, owner: maker.publicKey });

  // const takerMinterCollateralKey = await getAssociatedTokenAddress(
  //   stableMint.address,
  //   taker.publicKey,
  //   undefined,
  //   TOKEN_PROGRAM_ID,
  //   ASSOCIATED_TOKEN_PROGRAM_ID
  // );
  // const takerOptionDestination = await getAssociatedTokenAddress(
  //   euroMeta.putOptionMint,
  //   taker.publicKey,
  //   undefined,
  //   TOKEN_PROGRAM_ID,
  //   ASSOCIATED_TOKEN_PROGRAM_ID
  // );
  // const takerWriterDestination = await getAssociatedTokenAddress(
  //   euroMeta.putWriterMint,
  //   taker.publicKey,
  //   undefined,
  //   TOKEN_PROGRAM_ID,
  //   ASSOCIATED_TOKEN_PROGRAM_ID
  // );

  // const makerMinterCollateralKey = await getAssociatedTokenAddress(
  //   stableMint.address,
  //   maker.publicKey,
  //   undefined,
  //   TOKEN_PROGRAM_ID,
  //   ASSOCIATED_TOKEN_PROGRAM_ID
  // );
  // const makerOptionDestination = await getAssociatedTokenAddress(
  //   euroMeta.putOptionMint,
  //   maker.publicKey,
  //   undefined,
  //   TOKEN_PROGRAM_ID,
  //   ASSOCIATED_TOKEN_PROGRAM_ID
  // );
  // const makerWriterDestination = await getAssociatedTokenAddress(
  //   euroMeta.putWriterMint,
  //   maker.publicKey,
  //   undefined,
  //   TOKEN_PROGRAM_ID,
  //   ASSOCIATED_TOKEN_PROGRAM_ID
  // );

  const { instruction: takerIx } = mintOptions(
    europeanProgram,
    euroMetaKey,
    euroMeta,
    takerUSDCWallet.address,
    takerOptionDest.address,
    takerWriterDest.address,
    new anchor.BN(1_000_000),
    OptionType.PUT
  );

  takerIx.keys[0] = {
    pubkey: taker.publicKey,
    isSigner: true,
    isWritable: false,
  };
  const takerTransaction = new web3.Transaction().add(takerIx);
  await provider.sendAndConfirm(takerTransaction, [taker]);

  const { instruction: makerIx } = mintOptions(
    europeanProgram,
    euroMetaKey,
    euroMeta,
    makerUSDCWallet.address,
    makerOptionDest.address,
    makerWriterDest.address,
    new anchor.BN(1_000_000),
    OptionType.PUT
  );

  makerIx.keys[0] = {
    pubkey: maker.publicKey,
    isSigner: true,
    isWritable: false,
  };
  const transaction = new web3.Transaction().add(makerIx);
  await provider.sendAndConfirm(transaction, [maker]);

  return {
    euroMeta,
    euroMetaKey,
    oracle,
  };
};
