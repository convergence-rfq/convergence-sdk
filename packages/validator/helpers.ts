import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Keypair, Connection, PublicKey } from '@solana/web3.js';

import * as rfq from '@convergence-rfq/rfq';
import * as riskEngine from '@convergence-rfq/risk-engine';
import * as spotInstrument from '@convergence-rfq/spot-instrument';
import * as psyoptionsEuropeanInstrument from '@convergence-rfq/psyoptions-european-instrument';
import * as psyoptionsAmericanInstrument from '@convergence-rfq/psyoptions-american-instrument';

export type ChildProccess = ChildProcessWithoutNullStreams;

export const VALIDATOR = path.join(__dirname);
export const MANIFEST = path.join(VALIDATOR, 'ctx.json');

const PSYOPTIONS_AMERICAN = 'R2y9ip6mxmWUj4pt54jP2hz2dgvMozy9VTSwMWE7evs';
const PSYOPTIONS_EURO = 'FASQhaZQT53W9eT9wWnPoBFw8xzZDey9TbMmJj6jCQTs';
const SWITCHBOARD_BTC_ORACLE = '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee';
const SWITCHBOARD_SOL_ORACLE = 'GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR';
const PYTH_ORACLE = 'FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH';

const getBaseArgs = () => [
  '--account',
  SWITCHBOARD_BTC_ORACLE,
  path.join(__dirname, 'accounts/btc_20000_oracle_switchboard.json'),
  '--account',
  SWITCHBOARD_SOL_ORACLE,
  path.join(__dirname, 'accounts/sol_30_oracle_switchboard.json'),
  '--bpf-program',
  rfq.PROGRAM_ADDRESS,
  path.join(__dirname, 'programs/rfq.so'),
  '--bpf-program',
  spotInstrument.PROGRAM_ADDRESS,
  path.join(__dirname, 'programs/spot_instrument.so'),
  '--bpf-program',
  psyoptionsEuropeanInstrument.PROGRAM_ADDRESS,
  path.join(__dirname, 'programs/psyoptions_european_instrument.so'),
  '--bpf-program',
  PSYOPTIONS_AMERICAN,
  path.join(__dirname, 'programs/psy_american.so'),
  '--bpf-program',
  psyoptionsAmericanInstrument.PROGRAM_ADDRESS,
  path.join(__dirname, 'programs/psyoptions_american_instrument.so'),
  '--bpf-program',
  riskEngine.PROGRAM_ADDRESS,
  path.join(__dirname, 'programs/risk_engine.so'),
  '--bpf-program',
  PSYOPTIONS_EURO,
  path.join(__dirname, 'programs/euro_primitive.so'),
  '--bpf-program',
  PYTH_ORACLE,
  path.join(__dirname, 'programs/pseudo_pyth.so'),
  '--ledger',
  './test-ledger',
  '--reset',
  '--quiet',
];

const getAccountArgs = (name: string) => [
  '--account',
  getJsonPk(name),
  path.join(__dirname, `accounts/${name}.json`),
];

const getSetupCompleteArgs = () => [
  ...getAccountArgs('dao'),
  ...getAccountArgs('maker'),
  ...getAccountArgs('taker'),
  ...getAccountArgs('mint_authority'),
  ...getAccountArgs('base_mint'),
  ...getAccountArgs('quote_mint'),
  ...getAccountArgs('maker_base_wallet'),
  ...getAccountArgs('taker_base_wallet'),
  ...getAccountArgs('maker_quote_wallet'),
  ...getAccountArgs('taker_quote_wallet'),
];

const getBootstrapCompleteArgs = () => [
  ...getAccountArgs('protocol'),
  ...getAccountArgs('risk_engine'),
  ...getAccountArgs('base_asset'),
  ...getAccountArgs('risk_engine'),
  ...getAccountArgs('quote_registered_mint'),
  ...getAccountArgs('base_registered_mint'),
  ...getAccountArgs('maker_collateral_info'),
  ...getAccountArgs('taker_collateral_info'),
  ...getAccountArgs('taker_collateral_token'),
  ...getAccountArgs('maker_collateral_token'),
];

export class Ctx {
  dao = getPk('dao');
  maker = getPk('maker');
  taker = getPk('taker');
  mintAuthority = getPk('mint_authority');

  // Setup complete
  baseMint = '';
  quoteMint = '';
  takerQuoteWallet = '';
  takerBaseWallet = '';
  makerQuoteWallet = '';
  makerBaseWallet = '';

  // Bootstrap complete
  protocol = '';
  riskEngine = '';
  baseAsset = '';
  quoteRegisteredMint = '';
  baseRegisteredMint = '';
  makerCollateralInfo = '';
  takerCollateralInfo = '';
  makerCollateralToken = '';
  takerCollateralToken = '';
}

class SolanaAccount {
  pubkey: string;
  account: {
    lamports: number;
    data: string[];
    owner: string;
    executable: boolean;
    rentEpoch: number;
  };

  constructor(pubkey: string, account: any) {
    this.pubkey = pubkey;
    this.account = account;
  }
}

const writeAccount = async (con: Connection, pk: string, name: string) => {
  const accountInfo = await con.getAccountInfo(new PublicKey(pk));
  if (accountInfo === null) {
    throw new Error('Account not found');
  }
  const { owner, lamports, executable, rentEpoch, data } = accountInfo;
  const account = new SolanaAccount(pk, {
    owner,
    executable,
    rentEpoch,
    lamports,
    data: [data.toString('base64'), 'base64'],
  });
  const f = path.join(VALIDATOR, 'accounts', `${name}.json`);
  fs.writeFileSync(f, JSON.stringify(account));
};

const camelToSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

export const writeCtx = async (ctx: Ctx) => {
  const con = new Connection('http://127.0.0.1:8899', 'confirmed');

  for (const key in ctx) {
    if (ctx.hasOwnProperty(key)) {
      const snakeCaseKey = camelToSnakeCase(key);
      // @ts-ignore
      const pk = ctx[key];
      if (pk.length) {
        await writeAccount(con, pk, snakeCaseKey);
      }
    }
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(ctx));
};

export const getJsonPk = (user: string): string => {
  const f = path.join(VALIDATOR, 'accounts', user + '.json');
  const fileContent = fs.readFileSync(f, 'utf-8');
  const json = JSON.parse(fileContent);
  return json.pubkey;
};

export const getKpFile = (user: string): string => {
  const validUsers = ['taker', 'maker', 'mint_authority', 'dao'];
  if (validUsers.includes(user)) {
    return path.join(VALIDATOR, 'keys', `${user}.json`);
  }
  throw new Error('Invalid user');
};

export const getPk = (user: string) => {
  const owner = getKeypair(user);
  return owner.publicKey.toString();
};

export const getKeypair = (user: string) => {
  const buffer = JSON.parse(fs.readFileSync(getKpFile(user), 'utf8'));
  return Keypair.fromSecretKey(new Uint8Array(buffer));
};

export const readCtx = (): Ctx => {
  const json = fs.readFileSync(MANIFEST, 'utf-8');
  const data = JSON.parse(json);
  const ctx = new Ctx();
  return { ...ctx, ...data };
};

export const spawnValidator = (
  done = () => {},
  setup = false,
  bootstrap = false
): ChildProccess => {
  const args = getBaseArgs();

  if (setup && bootstrap) {
    throw new Error('Cannot run both setup and bootstrap');
  }

  if (!setup || bootstrap) {
    args.push(...getSetupCompleteArgs());
  }

  if (!setup && !bootstrap) {
    args.push(...getBootstrapCompleteArgs());
  }

  const validator = spawn('solana-test-validator', args);
  validator.on('exit', process.exit);

  validator.stdout.on('data', (data: any) => {
    if (data.toString().trim() === 'Waiting for fees to stabilize 2...') {
      done();
    }
  });

  return validator;
};
