import path from 'path';
import fs from 'fs';
import { Keypair, Connection, PublicKey } from '@solana/web3.js';

import { makeCli } from '../../src/cli';

export const ENDPOINT = 'http://127.0.0.1:8899';
export const BTC_ORACLE = '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee'; // Switchboard

export const TX = 'Tx:';
export const ADDRESS = 'Address:';

export const MANIFEST = path.join(__dirname, '..', 'validator', 'ctx.json');

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
  makerCollateral = '';
  takerCollateral = '';
  makerTokenAccount = '';
  takerTokenAccount = '';
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
  const f = path.join(__dirname, '..', 'validator', 'accounts', `${name}.json`);
  fs.writeFileSync(f, JSON.stringify(account));
};

const camelToSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

export const writeCtx = async (ctx: Ctx) => {
  const con = new Connection(ENDPOINT, 'confirmed');

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

export const readCtx = (): Ctx => {
  const json = fs.readFileSync(MANIFEST, 'utf-8');
  const data = JSON.parse(json);
  const ctx = new Ctx();
  return { ...ctx, ...data };
};

export const getJsonPk = (user: string): string => {
  const f = path.join(__dirname, '..', 'validator', 'accounts', user + '.json');
  const fileContent = fs.readFileSync(f, 'utf-8');
  const json = JSON.parse(fileContent);
  return json.pubkey;
};

export const getKpFile = (user: string): string => {
  const validUsers = ['taker', 'maker', 'mint_authority', 'dao'];
  if (validUsers.includes(user)) {
    return path.join(__dirname, '..', 'validator', 'keys', `${user}.json`);
  }
  throw new Error('Invalid user');
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
