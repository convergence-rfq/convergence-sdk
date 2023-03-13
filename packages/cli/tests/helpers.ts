import { homedir } from 'os';
import fs from 'fs';
import { Keypair } from '@solana/web3.js';

import { makeCli } from '../src/cli';

export const ENDPOINT = 'http://127.0.0.1:8899';
export const BTC_ORACLE = '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee'; // Switchboard

export const TX = 'Tx:';
export const ADDRESS = 'Address:';

export const CTX_FILE = './tests/ctx.json';

export type Ctx = {
  baseMint: string;
  quoteMint: string;
  takerQuoteWallet: string;
  takerBaseWallet: string;
  makerQuoteWallet: string;
  makerBaseWallet: string;
};

export const readCtx = (): Ctx => {
  const json = fs.readFileSync(CTX_FILE, 'utf-8');
  return JSON.parse(json);
};

export const writeCtx = (ctx: Ctx) => {
  fs.writeFileSync(CTX_FILE, JSON.stringify(ctx));
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
