import { Command } from 'commander';

import {
  riskEngineGroup,
  protocolGroup,
  collateralGroup,
  airdropGroup,
  rfqGroup,
  tokenGroup,
  hxroGroup,
  spotInstrumentGroup,
} from './groups';

export const makeCli = (): Command => {
  const cmds = [
    airdropGroup,
    tokenGroup,
    protocolGroup,
    riskEngineGroup,
    collateralGroup,
    rfqGroup,
    hxroGroup,
    spotInstrumentGroup,
  ];

  const cli = new Command();
  cli
    .name('convergence')
    .version(process.env.npm_package_version || 'local')
    .description('Convergence RFQ CLI');
  cmds.map((cmd) => cmd(cli));

  return cli;
};
