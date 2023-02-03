import { readFileSync } from 'fs';
import { Test } from 'tape';
import spok from 'spok';
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
  OptionType,
} from '@mithraic-labs/tokenized-euros';
import * as psyoptionsAmerican from '@mithraic-labs/psy-american';
import * as spl from '@solana/spl-token';
import { OptionMarketWithKey } from '@mithraic-labs/psy-american';
import {
  IDL as PseudoPythIdl,
  Pyth,
} from '../../../../programs/pseudo_pyth_idl';
import {
  DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ,
  DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ,
  DEFAULT_MINT_DECIMALS,
  DEFAULT_OVERALL_SAFETY_FACTOR,
  DEFAULT_SAFETY_PRICE_SHIFT_FACTOR,
  Convergence,
  keypairIdentity,
  KeypairSigner,
  Mint,
  toBigNumber,
  token,
  walletAdapterIdentity,
  Signer,
} from '@/index';
const {
  initializeAllAccountsInstructions,
  createEuroMetaInstruction,
  mintOptions,
} = instructions;
import { makeConfirmOptionsFinalizedOnMainnet } from '@/types';
import { TransactionBuilder } from '@/utils';

// CONSTANTS

export const SWITCHBOARD_BTC_ORACLE = new PublicKey(
  '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee'
);
export const SWITCHBOARD_SOL_ORACLE = new PublicKey(
  'GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR'
);

export const RPC_ENDPOINT = 'https://api.devnet.solana.com'; // 'http://127.0.0.1:8899'

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
  const connection = new Connection(options.rpcEndpoint ?? RPC_ENDPOINT, {
    commitment: options.commitment ?? 'confirmed',
  });
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
  expiresIn: number
) => {
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

  const makerStableMintToken = convergence
    .tokens()
    .pdas()
    .associatedTokenAccount({
      mint: stableMint.address,
      owner: maker.publicKey,
    });
  const takerStableMintToken = convergence
    .tokens()
    .pdas()
    .associatedTokenAccount({
      mint: stableMint.address,
      owner: taker.publicKey,
    });

  const makerPutMinterCollateralKey = makerStableMintToken;
  const takerPutMinterCollateralKey = takerStableMintToken;

  const makerPutOptionDestination = await spl.getOrCreateAssociatedTokenAccount(
    convergence.connection,
    payer as Keypair,
    euroMeta.putOptionMint,
    maker.publicKey
  );
  const makerPutWriterDestination = await spl.getOrCreateAssociatedTokenAccount(
    convergence.connection,
    payer as Keypair,
    euroMeta.putWriterMint,
    maker.publicKey
  );

  const takerPutOptionDestination = await spl.getOrCreateAssociatedTokenAccount(
    convergence.connection,
    payer as Keypair,
    euroMeta.putOptionMint,
    taker.publicKey
  );
  const takerPutWriterDestination = await spl.getOrCreateAssociatedTokenAccount(
    convergence.connection,
    payer as Keypair,
    euroMeta.putWriterMint,
    taker.publicKey
  );

  const { instruction: ix1 } = mintOptions(
    europeanProgram,
    euroMetaKey,
    euroMeta,
    makerPutMinterCollateralKey,
    makerPutOptionDestination.address,
    makerPutWriterDestination.address,
    new anchor.BN(1_000_000),
    OptionType.PUT
  );
  const { instruction: ix2 } = mintOptions(
    europeanProgram,
    euroMetaKey,
    euroMeta,
    takerPutMinterCollateralKey,
    takerPutOptionDestination.address,
    takerPutWriterDestination.address,
    new anchor.BN(1_000_000),
    OptionType.PUT
  );

  ix1.keys[0] = {
    pubkey: maker.publicKey,
    isSigner: true,
    isWritable: false,
  };
  ix2.keys[0] = {
    pubkey: taker.publicKey,
    isSigner: true,
    isWritable: false,
  };

  const txBuilder = TransactionBuilder.make().setFeePayer(payer);

  txBuilder.add(
    {
      instruction: ix1,
      signers: [maker],
    },
    {
      instruction: ix2,
      signers: [taker],
    }
  );

  const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(convergence);

  await txBuilder.sendAndConfirm(convergence, confirmOptions);

  return {
    provider,
    europeanProgram,
    euroMeta,
    euroMetaKey,
    oracle,
  };
};

const psyOptionsAmericanLocalNetProgramId = new anchor.web3.PublicKey(
  'R2y9ip6mxmWUj4pt54jP2hz2dgvMozy9VTSwMWE7evs'
);

export const initializePsyoptionsAmerican = async (
  convergence: Convergence,
  underlyingMint: Mint,
  quoteMint: Mint,
  taker: Signer,
  maker: Signer,
  quoteAmountPerContract: anchor.BN,
  underlyingAmountPerContract: anchor.BN,
  expiresIn: number
) => {
  const payer = taker;

  const provider = new anchor.AnchorProvider(
    convergence.connection,
    new anchor.Wallet(payer as Keypair),
    {}
  );
  anchor.setProvider(provider);

  const AmericanProgram = psyoptionsAmerican.createProgram(
    psyOptionsAmericanLocalNetProgramId,
    provider
  );

  const expiration = new anchor.BN(Date.now() / 1_000 + expiresIn);

  const { optionMarketKey, optionMintKey, writerMintKey } =
    await psyoptionsAmerican.instructions.initializeMarket(AmericanProgram, {
      expirationUnixTimestamp: expiration,
      quoteAmountPerContract,
      quoteMint: quoteMint.address,
      underlyingAmountPerContract,
      underlyingMint: underlyingMint.address,
    });

  const op = (await psyoptionsAmerican.getOptionByKey(
    AmericanProgram,
    optionMarketKey
  )) as OptionMarketWithKey;

  const takerOptionToken = await spl.createAssociatedTokenAccount(
    convergence.connection,
    taker as Keypair,
    optionMintKey,
    taker.publicKey
  );

  await spl.createAssociatedTokenAccount(
    convergence.connection,
    maker as Keypair,
    optionMintKey,
    maker.publicKey
  );

  await spl.createAssociatedTokenAccount(
    convergence.connection,
    maker as Keypair,
    writerMintKey,
    maker.publicKey
  );

  const takerWriterToken = await spl.createAssociatedTokenAccount(
    convergence.connection,
    taker as Keypair,
    writerMintKey,
    taker.publicKey
  );
  const takerUnderlyingToken = await spl.getAssociatedTokenAddress(
    underlyingMint.address,
    taker.publicKey
  );

  // const makerUnderlyingToken = await spl.getAssociatedTokenAddress(
  //   underlyingMint.address,
  //   maker.publicKey
  // );

  const optionMint = await convergence
    .tokens()
    .findMintByAddress({ address: optionMintKey });

  const ix1 = await psyoptionsAmerican.instructions.mintOptionV2Instruction(
    AmericanProgram,
    takerOptionToken,
    takerWriterToken,
    takerUnderlyingToken,
    new anchor.BN(10),
    op as psyoptionsAmerican.OptionMarketWithKey
  );
  ix1.signers.push(taker as Keypair);
  const tnx1 = new anchor.web3.Transaction();
  tnx1.add(ix1.ix);
  await provider.sendAndConfirm(tnx1, ix1.signers);
  // const ix2 = await psyoptionsAmerican.instructions.mintOptionV2Instruction(
  //   AmericanProgram,
  //   makerOptionToken,
  //   makerWriterToken,
  //   makerUnderlyingToken,
  //   new anchor.BN(10),
  //   op as psyoptionsAmerican.OptionMarketWithKey
  // );
  // ix2.signers.push(maker as Keypair);
  // const tnx2 = new anchor.web3.Transaction();
  // tnx2.add(ix2.ix);
  // await provider.sendAndConfirm(tnx2, ix2.signers);
  return {
    op,
    optionMarketKey,
    optionMint,
  };
};

export const assertInitRiskEngineConfig = (
  cvg: Convergence,
  t: Test,
  output: any
) => {
  t.same(
    output.config.address.toString(),
    cvg.riskEngine().pdas().config().toString(),
    'config address'
  );
  t.same(
    output.config.collateralForFixedQuoteAmountRfqCreation.toString(),
    DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ.toString(),
    'default collateral for fixed quote amount rfq'
  );
  t.same(
    output.config.collateralForVariableSizeRfqCreation.toString(),
    DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ.toString(),
    'default collateral for variable size rfq'
  );
  t.same(
    output.config.safetyPriceShiftFactor.toString(),
    DEFAULT_SAFETY_PRICE_SHIFT_FACTOR.toString(),
    'default safety price shift factor'
  );
  t.same(
    output.config.overallSafetyFactor.toString(),
    DEFAULT_OVERALL_SAFETY_FACTOR.toString(),
    'overall safety factor'
  );
  t.same(
    output.config.collateralMintDecimals.toString(),
    DEFAULT_MINT_DECIMALS.toString(),
    'collateral mint decimals'
  );
  t.assert(output.response.signature.length > 0, 'signature present');
  spok(t, output.config, {
    $topic: 'config model',
    model: 'config',
  });
};
