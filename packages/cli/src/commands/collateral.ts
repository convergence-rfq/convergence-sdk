import { Command } from 'commander';

import { initializeCollateralAccount, fundCollateralAccount } from '../actions';

import { addCmd } from './helpers';

export const initializeCollateralAccountCmd = (c: Command) =>
  addCmd(
    c,
    'collateral:initialize-account',
    'Initializes collateral account',
    initializeCollateralAccount
  );

export const fundCollateralAccountCmd = (c: Command) =>
  addCmd(
    c,
    'collateral:fund-account',
    'Funds collateral account',
    fundCollateralAccount,
    [
      {
        flags: '--amount <number>',
        description: 'Amount',
      },
    ]
  );
