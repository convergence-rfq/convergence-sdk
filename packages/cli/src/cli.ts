import { Command } from 'commander';

import {
  riskEngineGroup,
  protocolGroup,
  collateralGroup,
  airdropGroup,
  rfqGroup,
  tokenGroup,
} from './groups';
import { VERSION } from './constants';

export const makeCli = (): Command => {
  const cmds = [
    airdropGroup,
    tokenGroup,
    protocolGroup,
    riskEngineGroup,
    collateralGroup,
    rfqGroup,
  ];

  const cli = new Command();
  cli.name('convergence').version(VERSION).description('Convergence RFQ CLI');
  cmds.map((cmd) => cmd(cli));

  return cli;
};
