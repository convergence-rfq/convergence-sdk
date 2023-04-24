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

export const RPC_ENDPOINT = 'http://127.0.0.1:8899';

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

// const getSetupCompleteArgs = () => [
//   ...getAccountArgs('account-dao'),
//   ...getAccountArgs('account-maker'),
//   ...getAccountArgs('account-taker'),
//   ...getAccountArgs('mint-authority'),
//   ...getAccountArgs('mint-btc'),
//   ...getAccountArgs('mint-usd-quote'),
//   ...getAccountArgs('token-account-btc-maker'),
//   ...getAccountArgs('token-account-btc-taker'),
//   ...getAccountArgs('token-account-usd-quote-maker'),
//   ...getAccountArgs('token-account-usd-quote-taker'),
// ];

// const getBootstrapCompleteArgs = () => [
//   ...getAccountArgs('rfq-protocol'),
//   ...getAccountArgs('risk-engine-config'),
//   ...getAccountArgs('rfq-base-asset-btc'),
//   ...getAccountArgs('rfq-mint-info-usd-quote'),
//   ...getAccountArgs('rfq-mint-info-btc'),
//   ...getAccountArgs('rfq-collateral-info-maker'),
//   ...getAccountArgs('rfq-collateral-info-taker'),
//   ...getAccountArgs('rfq-collateral-token-taker'),
//   ...getAccountArgs('rfq-collateral-token-maker'),
// ];

export class Ctx {
  dao = getPk('dao');
  maker = getPk('maker');
  taker = getPk('taker');
  mintAuthority = getPk('mint_authority');

  // Setup complete
  baseMint = getJsonPk('mint-btc');
  quoteMint = getJsonPk('rfq-mint-info-usd-quote');
  takerQuoteWallet = getJsonPk('token-account-usd-quote-taker');
  takerBaseWallet = getJsonPk('token-account-btc-taker');
  makerQuoteWallet = getJsonPk('token-account-usd-quote-maker');
  makerBaseWallet = getJsonPk('token-account-btc-maker');

  // Bootstrap complete
  protocol = getJsonPk('rfq-protocol');
  riskEngine = getJsonPk('risk-engine-config');
  baseAsset = getJsonPk('rfq-base-asset-btc');
  quoteRegisteredMint = getJsonPk('rfq-mint-info-usd-quote');
  baseRegisteredMint = getJsonPk('rfq-mint-info-btc');
  makerCollateralInfo = getJsonPk('rfq-collateral-info-maker');
  takerCollateralInfo = getJsonPk('rfq-collateral-info-taker');
  makerCollateralToken = getJsonPk('rfq-collateral-token-maker');
  takerCollateralToken = getJsonPk('rfq-collateral-token-taker');
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
  bootstrap = false,
): ChildProccess => {
  const args = getBaseArgs();
  args.push("--account-dir"); //accounts
  args.push(path.join(__dirname, 'accounts'),)
 
  const validator = spawn('solana-test-validator',args);

  validator.on('exit', process.exit);
  
  validator.stdout.on('data', (data: any) => {
    if (data.toString().trim() === 'Waiting for fees to stabilize 2...') {
      done();
    }
  });

  return validator;
};
