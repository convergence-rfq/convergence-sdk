import { homedir } from 'os';
import path from 'path';
import fs from 'fs';
import { Keypair, Connection, PublicKey } from '@solana/web3.js';

import { makeCli } from '../src/cli';

export const ENDPOINT = 'http://127.0.0.1:8899';
export const BTC_ORACLE = '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee'; // Switchboard

export const TX = 'Tx:';
export const ADDRESS = 'Address:';

export const CTX_FILE = path.join(
  __dirname,
  'validator',
  'accounts',
  'manifest.json'
);

export class Ctx {
  baseMint = '';
  quoteMint = '';
  takerQuoteWallet = '';
  takerBaseWallet = '';
  makerQuoteWallet = '';
  makerBaseWallet = '';
}

class SolanaAccount {
  pubkey: string;
  account: {
    lamports: number;
    data: string[];
  };
  owner: string;
  executable = false;
  rentEpoch = 0;

  constructor(
    pubkey: string,
    owner: string,
    account: any,
    executable = false,
    rentEpoch = 0
  ) {
    this.pubkey = pubkey;
    this.account = account;
    this.owner = owner;
    this.executable = executable;
    this.rentEpoch = rentEpoch;
  }
}

const writeAccount = async (
  connection: Connection,
  pk: string,
  name: string
) => {
  const accountInfo = await connection.getAccountInfo(new PublicKey(pk));
  if (accountInfo === null) {
    return;
  }
  const account = new SolanaAccount(pk, accountInfo.owner.toString(), {
    lamports: accountInfo?.lamports,
    data: [accountInfo.data.toString('base64'), 'base64'],
  });
  const f = path.join(__dirname, 'validator', 'accounts', `${name}.json`);
  fs.writeFileSync(f, JSON.stringify(account));
};

export const writeCtx = async (ctx: Ctx) => {
  const con = new Connection(ENDPOINT, 'confirmed');
  writeAccount(con, ctx.baseMint, 'base_mint');
  writeAccount(con, ctx.quoteMint, 'quote_mint');
  writeAccount(con, ctx.takerQuoteWallet, 'taker_quote_wallet');
  writeAccount(con, ctx.takerBaseWallet, 'taker_base_wallet');
  fs.writeFileSync(CTX_FILE, JSON.stringify(ctx));
};

export const readCtx = (): Ctx => {
  const json = fs.readFileSync(CTX_FILE, 'utf-8');
  return JSON.parse(json);
};

export const getKpFile = (user: string) => {
  switch (user) {
    case 'taker':
      return `${homedir()}/.config/solana/taker.json`;
    case 'maker':
      return `${homedir()}/.config/solana/maker.json`;
    case 'mint-authority':
      return `${homedir()}/.config/solana/mint-authority.json`;
    case 'dao':
      return `${homedir()}/.config/solana/id.json`;
    default:
      throw new Error('Invalid user');
  }
};

export const getPk = (user: string) => {
  const buffer = JSON.parse(fs.readFileSync(getKpFile(user), 'utf8'));
  const owner = Keypair.fromSecretKey(new Uint8Array(buffer));
  return owner.publicKey.toString();
};

export const runCli = async (args: string[], user = 'dao') => {
  const cli = makeCli();
  return await cli.parseAsync(
    ['ts-node', './src/cli.ts']
      .concat(args)
      .concat(['--rpc-endpoint', ENDPOINT])
      .concat(['--keypair-file', getKpFile(user)])
  );
};
