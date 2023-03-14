import { homedir } from 'os';
import { Command } from 'commander';

import {
  airdropSolCmd,
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
  getProtocolConfigCmd,
  getBaseAssetsCmd,
  getRfqsCmd,
  airdropDevnetTokensCmd,
  fundCollateralAccountCmd,
  initializeCollateralAccountCmd,
  createRfqCmd,
} from './commands';

const VERSION = '4.0.24-rc.5';

const DEFAULT_KEYPAIR_FILE = `${homedir()}/.config/solana/id.json`;
const DEFAULT_RPC_ENDPOINT =
  'https://muddy-white-morning.solana-devnet.quiknode.pro/637131a6924513d7c83c65efc75e55a9ba2517e9/';

const addDefaultArgs = (cmd: any) => {
  cmd.option('--rpc-endpoint <string>', 'RPC endpoint', DEFAULT_RPC_ENDPOINT);
  cmd.option('--keypair-file <string>', 'Keypair file', DEFAULT_KEYPAIR_FILE);
  cmd.option('--verbose <boolean>', 'Verbose', false);
  return cmd;
};

export const makeCli = (): Command => {
  const cmds = [
    airdropSolCmd,
    airdropDevnetTokensCmd,
    createMintCmd,
    createWalletCmd,
    mintToCmd,
    initializeProtocolCmd,
    getProtocolConfigCmd,
    addInstrumentCmd,
    addBaseAssetCmd,
    getBaseAssetsCmd,
    registerMintCmd,
    getRegisteredMintsCmd,
    initializeRiskEngineCmd,
    getRiskEngineConfigCmd,
    updateRiskEngineCmd,
    setRiskEngineInstrumentTypeCmd,
    setRiskEngineCategoriesInfoCmd,
    initializeCollateralAccountCmd,
    fundCollateralAccountCmd,
    createRfqCmd,
    getRfqsCmd,
  ];

  const cli = new Command();
  cli.name('convergence').version(VERSION).description('Convergence RFQ CLI');
  cmds.map((c) => addDefaultArgs(c(cli)));

  return cli;
};
