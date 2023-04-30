import { Command } from 'commander';

import {
  initializeCollateral,
  fundCollateral,
  getCollateral,
} from '../actions';
import { addCmd } from './helpers';

const initializeCmd = (c: Command) =>
  addCmd(
    c,
    'initialize',
    'initializes collateral account',
    initializeCollateral
  );

const fundCmd = (c: Command) =>
  addCmd(c, 'fund', 'funds collateral account', fundCollateral, [
    {
      flags: '--amount <number>',
      description: 'amount',
    },
  ]);

const getCmd = (c: Command) =>
  addCmd(c, 'get', 'gets collateral account', getCollateral, [
    {
      flags: '--user <string>',
      description: 'user address',
    },
  ]);

export const collateralGroup = (c: Command) => {
  const group = c.command('collateral');
  initializeCmd(group);
  fundCmd(group);
  getCmd(group);
};
