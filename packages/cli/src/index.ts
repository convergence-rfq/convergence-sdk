/* eslint-disable no-console */
import { readFileSync } from 'fs';
import { Command } from 'commander';
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Convergence, keypairIdentity, token } from '@convergence-rfq/sdk';

type Options = any;

const DEFAULT_KEYPAIR_FILE = '/Users/pindaroso/.config/solana/dao.json';
const DEFAULT_RPC_ENDPOINT = 'http://127.0.0.1:8899';

// ACTIONS

const airdrop = async (options: any) => {
  console.log('Airdropping...');
  const cvg = await createCvg(options);
  const user = cvg.rpc().getDefaultFeePayer();
  const tx = await cvg.connection.requestAirdrop(
    user.publicKey,
    options.amount * LAMPORTS_PER_SOL
  );
  await cvg.connection.confirmTransaction(tx);
  console.log('Success!');
};

const createMint = async (options: any) => {
  console.log('Creating mint...');
  const cvg = await createCvg(options);
  const user = cvg.rpc().getDefaultFeePayer();
  const { mint } = await cvg.tokens().createMint({
    mintAuthority: user.publicKey,
    decimals: options.decimals,
  });
  console.log(`Address: ${mint.address.toString()}`);
  console.log('Success!');
};

const createWallet = async (options: any) => {
  console.log('Creating wallet...');
  const cvg = await createCvg(options);
  const { token: wallet } = await cvg.tokens().createToken({
    mint: new PublicKey(options.mint),
    owner: new PublicKey(options.owner),
  });
  console.log('Address:', wallet.address.toString());
  console.log('Success!');
};

const mintTo = async (options: any) => {
  console.log('Minting to...');
  const cvg = await createCvg(options);
  const user = cvg.rpc().getDefaultFeePayer();
  await cvg.tokens().mint({
    mintAddress: new PublicKey(options.mint),
    amount: token(options.amount),
    toToken: new PublicKey(options.wallet),
    mintAuthority: user.publicKey,
  });
  console.log('Success!');
};

const initializeProtocol = async (options: Options) => {
  console.log('Initializing protocol...');
  const cvg = await createCvg(options);
  const collateralMint = new PublicKey(options.collateralMint);
  await cvg.protocol().initialize({ collateralMint });
  console.log('Success!');
};

/// HELPERS

const createCvg = async (options: Options): Promise<Convergence> => {
  const secret = JSON.parse(readFileSync(options.keypairFile, 'utf8'));
  const user = Keypair.fromSecretKey(new Uint8Array(secret));
  if (options.verbose) {
    console.log('User:', user.publicKey.toString());
  }
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
  cmd.option('--verbose <value>', 'Verbose', false);
  return cmd;
};

/// CLI

const program = new Command();
program.name('convergence').version('1.0.0').description('Convergence RFQ CLI');

const airdropCmd = program
  .command('airdrop')
  .description('Airdrops SOL to the current user')
  .option('--amount <value>', 'Amount to airdrop in SOL')
  .action(airdrop);
const createMintCmd = program
  .command('create-mint')
  .description('Create mint')
  .option('--decimals <value>', 'Decimals')
  .action(createMint);
const createWalletCmd = program
  .command('create-wallet')
  .description('Create wallet')
  .option('--owner <value>', 'Owner address')
  .option('--mint <value>', 'Mint address')
  .action(createWallet);
const mintToCmd = program
  .command('mint-to')
  .description('Mints tokens to wallet')
  .option('--mint <value>', 'Mint address')
  .option('--wallet <value>', 'Wallet address')
  .option('--amount <value>', 'Mint amount')
  .action(mintTo);
const initializeProtocolCmd = program
  .command('initialize-protocol')
  .description('Initializes protocol')
  .option('--maker-fee <value>', 'Maker fee')
  .option('--taker-fee <value>', 'Taker fee')
  .option('--collateral-mint <value>', 'Collateral mint address')
  .action(initializeProtocol);

addDefaultArgs(airdropCmd);
addDefaultArgs(createMintCmd);
addDefaultArgs(createWalletCmd);
addDefaultArgs(mintToCmd);
addDefaultArgs(initializeProtocolCmd);

/// EXECUTE

program.parse();
