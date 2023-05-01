import { makeCli } from '../src/cli';
import { Ctx, getKpFile } from '../../validator';

export const ENDPOINT = 'http://127.0.0.1:8899';
export const SWITCHBOARD_BTC_ORACLE =
  '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee';

export const TX_LABEL = 'Tx:';
export const ADDRESS_LABEL = 'Address:';
export const CTX = new Ctx();
export const COLLATERAL_MINT = CTX.collateralMint;

export const runCli = async (args: string[], user = 'dao') => {
  const cli = makeCli();
  return await cli.parseAsync(
    ['ts-node', './src/cli.ts']
      .concat(args)
      .concat(['--rpc-endpoint', ENDPOINT])
      .concat(['--keypair-file', getKpFile(user)])
  );
};
