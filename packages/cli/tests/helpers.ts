import { PublicKey } from '@solana/web3.js';
import { v4 as uuidv4 } from 'uuid';
import { PROGRAM_ID } from '@convergence-rfq/rfq';

import { makeCli } from '../src/cli';
import { Ctx, getKpFile } from '../../validator';

export const ENDPOINT = 'http://127.0.0.1:8899';
export const BTC_ORACLE = '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee'; // Switchboard

export const TX = 'Tx:';
export const ADDRESS = 'Address:';
export const CTX = new Ctx();

export const generatePk = async (): Promise<PublicKey> => {
  return await PublicKey.createWithSeed(PROGRAM_ID, uuidv4(), PROGRAM_ID);
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
