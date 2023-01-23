/* eslint-disable no-console */
import { readFileSync } from 'fs';
import { Command } from 'commander';
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Convergence, keypairIdentity } from '@convergence-rfq/sdk';

type Options = any;

const DEFAULT_RPC_ENDPOINT = 'http://127.0.0.1:8899';
const DEFAULT_KEYPAIR_FILE = '/Users/pindaroso/.config/solana/dao.json';

// ACTIONS

const airdrop = async (options: any) => {
  const cvg = await createCvg(options);
  const user = cvg.rpc().getDefaultFeePayer();
  const tx = await cvg.connection.requestAirdrop(
    user.publicKey,
    options.amount * LAMPORTS_PER_SOL
  );
  await cvg.connection.confirmTransaction(tx);
};

const setupMints = async (options: any) => {
  const cvg = await createCvg(options);
  const user = cvg.rpc().getDefaultFeePayer();
  const { mint: usdcMint } = await cvg.tokens().createMint({
    mintAuthority: user.publicKey,
    decimals: 6,
  });
  const { mint: btcMint } = await cvg.tokens().createMint({
    mintAuthority: user.publicKey,
    decimals: 9,
  });

  console.log(`BTC: ${btcMint.address.toString()}`);
  console.log(`USDC: ${usdcMint.address.toString()}`);
};

const initializeProtocol = async (options: Options) => {
  const cvg = await createCvg(options);
  const collateralMint = new PublicKey(options.collateralMint);
  await cvg.protocol().initialize({ collateralMint });
};

/// HELPERS

const createCvg = async (options: Options): Promise<Convergence> => {
  const secret = JSON.parse(readFileSync(options.keypairFile, 'utf8'));
  const user = Keypair.fromSecretKey(new Uint8Array(secret));
  const connection = new Connection(options.rpcEndpoint, {
    commitment: 'confirmed',
  });
  const cvg = new Convergence(connection, { skipPreflight: true });
  cvg.use(keypairIdentity(user));
  return cvg;
};

const addDefaultArgs = (cmd: any) => {
  cmd.option('--rpc-endpoint <value>', 'RPC endpoint', DEFAULT_RPC_ENDPOINT);
  cmd.option('--keypair-file <value>', 'Keypair file', DEFAULT_KEYPAIR_FILE);
  return cmd;
};

/// CLI

const program = new Command();
program.name('convergence').version('1.0.0').description('Convergence RFQ CLI');

const airdropCommand = program
  .command('airdrop')
  .description('Airdrops SOL to the current user')
  .option('--amount <value>', 'Amount to airdrop in SOL')
  .action(airdrop);
const initializeProtocolCommand = program
  .command('initialize-protocol')
  .description('Initializes protocol with taker and maker fees')
  .option('--maker-fee <value>', 'Maker fee')
  .option('--taker-fee <value>', 'Taker fee')
  .option('--collateral-mint <value>', 'Collaterl mint public key')
  .action(initializeProtocol);
const setupMintsCommand = program
  .command('setup-mints')
  .description('Setup mints')
  .action(setupMints);

addDefaultArgs(initializeProtocolCommand);
addDefaultArgs(setupMintsCommand);
addDefaultArgs(airdropCommand);

/// EXECUTE

program.parse();
