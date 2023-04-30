import { Command } from 'commander';

import {
  initializeRiskEngineCmd,
  updateRiskEngineCmd,
  setRiskEngineInstrumentTypeCmd,
  setRiskEngineCategoriesInfoCmd,
  getRiskEngineConfigCmd,
  protocolGroup,
  collateralGroup,
  closeRiskEngineCmd,
  airdropGroup,
  rfqGroup,
  tokenGroup,
} from './commands';
import { VERSION } from './constants';

export const makeCli = (): Command => {
  const cmds = [
    airdropGroup,
    tokenGroup,
    protocolGroup,
    initializeRiskEngineCmd,
    getRiskEngineConfigCmd,
    updateRiskEngineCmd,
    closeRiskEngineCmd,
    setRiskEngineInstrumentTypeCmd,
    setRiskEngineCategoriesInfoCmd,
    collateralGroup,
    rfqGroup,
  ];

  const cli = new Command();
  cli.name('convergence').version(VERSION).description('Convergence RFQ CLI');
  cmds.map((cmd) => cmd(cli));

  return cli;
};
