import { homedir } from 'os';
import { Command } from 'commander';

import {
  airdropCmd,
  createMintCmd,
  createWalletCmd,
  mintToCmd,
  initializeRiskEngineCmd,
  updateRiskEngineCmd,
  setRiskEngineInstrumentTypeCmd,
  setRiskEngineCategoriesInfoCmd,
  getRiskEngineConfigCmd,
  initializeProtocolCmd,
  addInstrumentCmd,
  addBaseAssetCmd,
  registerMintCmd,
  getRegisteredMintsCmd,
  getProtocolCmd,
  getBaseAssetsCmd,
  getRfqsCmd,
  airdropDevnetTokensCmd,
} from './commands';

const VERSION = '4.0.24-rc.1';

const DEFAULT_KEYPAIR_FILE = `${homedir()}/.config/solana/id.json`;
const DEFAULT_RPC_ENDPOINT = 'https://api.devnet.solana.com';

const addDefaultArgs = (cmd: any) => {
  cmd.option('--rpc-endpoint <string>', 'RPC endpoint', DEFAULT_RPC_ENDPOINT);
  cmd.option('--keypair-file <string>', 'Keypair file', DEFAULT_KEYPAIR_FILE);
  cmd.option('--verbose <boolean>', 'Verbose', false);
  return cmd;
};

export const makeCli = (): Command => {
  const cli = new Command();
  cli.name('convergence').version(VERSION).description('Convergence RFQ CLI');

  const cmds = [
    airdropCmd(cli),
    createMintCmd(cli),
    createWalletCmd(cli),
    mintToCmd(cli),
    initializeRiskEngineCmd(cli),
    updateRiskEngineCmd(cli),
    setRiskEngineInstrumentTypeCmd(cli),
    setRiskEngineCategoriesInfoCmd(cli),
    getRiskEngineConfigCmd(cli),
    initializeProtocolCmd(cli),
    addInstrumentCmd(cli),
    addBaseAssetCmd(cli),
    registerMintCmd(cli),
    getRegisteredMintsCmd(cli),
    getProtocolCmd(cli),
    getBaseAssetsCmd(cli),
    getRfqsCmd(cli),
    airdropDevnetTokensCmd(cli),
  ];

  cmds.map(addDefaultArgs);
  return cli;
};
