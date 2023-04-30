import { Command } from 'commander';

import {
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
  getAllRfqsCmd,
  getActiveRfqsCmd,
  collateralGroup,
  createRfqCmd,
  getRfqCmd,
  getWalletCmd,
  getMintCmd,
  closeRiskEngineCmd,
  airdropGroup,
} from './commands';
import { VERSION } from './constants';

export const makeCli = (): Command => {
  const cmds = [
    airdropGroup,
    createMintCmd,
    getMintCmd,
    createWalletCmd,
    getWalletCmd,
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
    closeRiskEngineCmd,
    setRiskEngineInstrumentTypeCmd,
    setRiskEngineCategoriesInfoCmd,
    collateralGroup,
    createRfqCmd,
    getRfqCmd,
    getAllRfqsCmd,
    getActiveRfqsCmd,
  ];

  const cli = new Command();
  cli.name('convergence').version(VERSION).description('Convergence RFQ CLI');
  cmds.map((cmd) => cmd(cli));

  return cli;
};
