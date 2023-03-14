import { Command } from 'commander';

import { initializeCollateralAccount, fundCollateralAccount } from '../actions';

import { addCmd } from './helpers';
export const initializeCollateralAccountCmd = (c: Command) =>
  addCmd(
    c,
    'initialize-collateral-account',
    'Initializes collateral account',
    initializeCollateralAccount
  );

export const fundCollateralAccountCmd = (c: Command) =>
  addCmd(
    c,
    'fund-collateral-account',
    'Funds collateral account',
    fundCollateralAccount,
    [
      {
        flags: '--amount <number>',
        description: 'Amount',
      },
    ]
  );
