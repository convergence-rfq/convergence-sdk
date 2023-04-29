import { Command } from 'commander';

import {
  initializeCollateralAccount,
  fundCollateralAccount,
  getCollateralAccount,
} from '../actions';

import { addCmd } from './helpers';

export const initializeCollateralAccountCmd = (c: Command) =>
  addCmd(
    c,
    'collateral:initialize-account',
    'initializes collateral account',
    initializeCollateralAccount
  );

export const fundCollateralAccountCmd = (c: Command) =>
  addCmd(
    c,
    'collateral:fund-account',
    'funds collateral account',
    fundCollateralAccount,
    [
      {
        flags: '--amount <number>',
        description: 'amount',
      },
    ]
  );

export const getCollateralAccountCmd = (c: Command) =>
  addCmd(
    c,
    'collateral:get-account',
    'gets collateral account',
    getCollateralAccount,
    [
      {
        flags: '--user <string>',
        description: 'user address',
      },
    ]
  );
