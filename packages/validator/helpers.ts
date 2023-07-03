import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Keypair } from '@solana/web3.js';

import * as rfq from '@convergence-rfq/rfq';
import * as riskEngine from '@convergence-rfq/risk-engine';
import * as spotInstrument from '@convergence-rfq/spot-instrument';
import * as psyoptionsEuropeanInstrument from '@convergence-rfq/psyoptions-european-instrument';
import * as psyoptionsAmericanInstrument from '@convergence-rfq/psyoptions-american-instrument';

export type ChildProccess = ChildProcessWithoutNullStreams;

export const RPC_ENDPOINT = 'http://127.0.0.1:8899';

export const FIXTURES = path.join(__dirname, 'fixtures');
export const DEPS = path.join(__dirname, 'dependencies');

const PSYOPTIONS_AMERICAN = 'R2y9ip6mxmWUj4pt54jP2hz2dgvMozy9VTSwMWE7evs';
const PSYOPTIONS_EURO = 'FASQhaZQT53W9eT9wWnPoBFw8xzZDey9TbMmJj6jCQTs';
const SWITCHBOARD_BTC_ORACLE = '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee';
const PYTH_SOL_ORACLE = 'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG';
const PYTH_ORACLE = 'FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH';

const getBaseArgs = () => [
  '--account',
  SWITCHBOARD_BTC_ORACLE,
  path.join(DEPS, 'btc_20000_oracle_switchboard.json'),
  '--account',
  PYTH_SOL_ORACLE,
  path.join(DEPS, 'sol_30_oracle_pyth.json'),

  '--bpf-program',
  PSYOPTIONS_AMERICAN,
  path.join(DEPS, 'psy_american.so'),
  '--bpf-program',
  PSYOPTIONS_EURO,
  path.join(DEPS, 'euro_primitive.so'),

  '--bpf-program',
  PYTH_ORACLE,
  path.join(DEPS, 'pseudo_pyth.so'),

  '--bpf-program',
  rfq.PROGRAM_ADDRESS,
  path.join(FIXTURES, 'programs/rfq.so'),
  '--bpf-program',
  spotInstrument.PROGRAM_ADDRESS,
  path.join(FIXTURES, 'programs/spot_instrument.so'),
  '--bpf-program',
  psyoptionsEuropeanInstrument.PROGRAM_ADDRESS,
  path.join(FIXTURES, 'programs/psyoptions_european_instrument.so'),
  '--bpf-program',
  psyoptionsAmericanInstrument.PROGRAM_ADDRESS,
  path.join(FIXTURES, 'programs/psyoptions_american_instrument.so'),
  '--bpf-program',
  riskEngine.PROGRAM_ADDRESS,
  path.join(FIXTURES, 'programs/risk_engine.so'),

  '--ledger',
  './test-ledger',
  '--reset',
  '--quiet',
];

export class Ctx {
  // Keypairs
  dao = getKeypairPk('dao');
  maker = getKeypairPk('maker');
  taker = getKeypairPk('taker');

  baseMintBTC = getKeypairPk('mint-btc');
  baseMintSOL = getKeypairPk('mint-sol');
  quoteMint = getKeypairPk('mint-usd-quote');
  collateralMint = getKeypairPk('mint-usd-collateral');

  // Wallets
  takerQuoteWallet = getAccountPk('token-account-usd-quote-taker');
  takerBaseWallet = getAccountPk('token-account-btc-taker');
  makerQuoteWallet = getAccountPk('token-account-usd-quote-maker');
  makerBaseWallet = getAccountPk('token-account-btc-maker');

  // Protocol
  protocol = getAccountPk('rfq-protocol');
  riskEngine = getAccountPk('risk-engine-config');
  baseAsset = getAccountPk('rfq-base-asset-btc');
  quoteRegisteredMint = getAccountPk('rfq-mint-info-usd-quote');
  baseRegisteredMint = getAccountPk('rfq-mint-info-btc');
  makerCollateralInfo = getAccountPk('rfq-collateral-info-maker');
  takerCollateralInfo = getAccountPk('rfq-collateral-info-taker');
  makerCollateralToken = getAccountPk('rfq-collateral-token-maker');
  takerCollateralToken = getAccountPk('rfq-collateral-token-taker');

  // Switchboard
  switchboardBTCOracle = getDepAccountPk('btc_20000_oracle_switchboard');

  // Pyth
  pythSOLOracle = getDepAccountPk('sol_30_oracle_pyth');
}

export const getAccountPk = (user: string): string => {
  const f = path.join(FIXTURES, 'accounts', user + '.json');
  const fileContent = fs.readFileSync(f, 'utf-8');
  const json = JSON.parse(fileContent);
  return json.pubkey;
};

export const getDepAccountPk = (user: string): string => {
  const f = path.join(DEPS, user + '.json');
  const fileContent = fs.readFileSync(f, 'utf-8');
  const json = JSON.parse(fileContent);
  return json.pubkey;
};

export const getKpFile = (user: string): string => {
  return path.join(FIXTURES, 'keypairs', `${user}.json`);
};

export const getKeypairPk = (user: string) => {
  const owner = getUserKp(user);
  return owner.publicKey.toString();
};

export const getUserKp = (user: string) => {
  const buffer = JSON.parse(fs.readFileSync(getKpFile(user), 'utf8'));
  return Keypair.fromSecretKey(new Uint8Array(buffer));
};

export const spawnValidator = (done = () => {}): ChildProccess => {
  const args = getBaseArgs();
  args.push('--account-dir', path.join(FIXTURES, 'accounts'));

  const validator = spawn('solana-test-validator', args);
  validator.on('exit', process.exit);
  validator.stdout.on('data', (data: any) => {
    if (data.toString().trim() === 'Waiting for fees to stabilize 2...') {
      done();
    }
  });

  return validator;
};
