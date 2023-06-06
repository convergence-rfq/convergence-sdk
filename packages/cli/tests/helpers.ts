import { makeCli } from '../src/cli';
import { Ctx, getKpFile } from '../../validator';

export const ENDPOINT = 'http://127.0.0.1:8899';

export const TX_LABEL = 'Tx:';
export const ADDRESS_LABEL = 'Address:';
export const CTX = new Ctx();
export const COLLATERAL_MINT = CTX.collateralMint;
export const SWITCHBOARD_BTC_ORACLE = CTX.switchboardBTCOracle;
export const PYTH_SOL_ORACLE = CTX.pythSOLOracle;

export const runCli = async (args: string[], user = 'dao') => {
  return await makeCli().parseAsync(
    ['ts-node', './src/cli.ts']
      .concat(args)
      .concat(['--rpc-endpoint', ENDPOINT])
      .concat(['--keypair-file', getKpFile(user)])
  );
};
