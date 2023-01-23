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

console.log = console.log ?? undefined;

const RPC_ENDPOINT = 'http://127.0.0.1:8899';
const KEYPAIR =
  '/Users/pindaroso/code/convergence-sdk/packages/js/test/fixtures/dao.json'; // B7d6DombyjQSsPJdufiZg6eutmmYADkqDDGgQrd3LJPo

const user = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(readFileSync(KEYPAIR, 'utf8')))
);

const createCvg = async (): Promise<Convergence> => {
  const connection = new Connection(RPC_ENDPOINT, {
    commitment: 'confirmed',
  });
  const cvg = new Convergence(connection, { skipPreflight: true });
  cvg.use(keypairIdentity(user));

  if (RPC_ENDPOINT.indexOf('8899') > -1) {
    const tx = await cvg.connection.requestAirdrop(
      user.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    await cvg.connection.confirmTransaction(tx);
  }

  return cvg;
};

const setupMints = async () => {
  const cvg = await createCvg();
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

const initializeProtocol = async (options: any) => {
  console.log(options.makerFee.toString());
  console.log(options.takerFee.toString());
  console.log(options.collateralMint);
  const cvg = await createCvg();
  const collateralMint = new PublicKey(options.collateralMint);
  await cvg.protocol().initialize({ collateralMint });
};
const test = async () => {
  console.log('TESTING');
};

const program = new Command();
program.configureOutput({
  writeOut: (str) => process.stdout.write(`[OUT] ${str}`),
  writeErr: (str) => process.stdout.write(`[ERR] ${str}`),
  outputError: (str, write) => write(str),
});
program
  .name('convergence')
  .version('1.0.0')
  .description('Convergence RFQ CLI?');
program
  .command('initialize-protocol')
  .description('Initializes protocol with taker and maker fees')
  .option('--maker-fee <value>', 'Maker fee')
  .option('--taker-fee <value>', 'Taker fee')
  .option('--collateral-mint <value>', 'Collaterl mint public key')
  .action(initializeProtocol);
program.command('setup-mints').description('Setup mints').action(setupMints);
program.command('test').description('Test').action(test);
program.parse();
