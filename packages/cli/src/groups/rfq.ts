import { Command } from 'commander';

import { getRfq, getActiveRfqs, getAllRfqs, createRfq } from '../actions';
import { addCmd } from '../helpers';

const getAllCmd = (c: Command) =>
  addCmd(c, 'get-all', 'gets all RFQs', getAllRfqs);

const getActiveCmd = (c: Command) =>
  addCmd(c, 'get-active', 'get active RFQs', getActiveRfqs);

const getCmd = (c: Command) =>
  addCmd(c, 'get', 'gets RFQ details', getRfq, [
    {
      flags: '--address <string>',
      description: 'RFQ address',
    },
  ]);

const createCmd = (c: Command) =>
  addCmd(c, 'create', 'creates RFQ', createRfq, [
    {
      flags: '--quote-mint <string>',
      description: 'quote mint',
    },
    {
      flags: '--base-mint <string>',
      description: 'base mint',
    },
    {
      flags: '--side <string>',
      description: 'side',
    },
    {
      flags: '--size <string>',
      description: 'size',
    },
    {
      flags: '--amount <number>',
      description: 'amount',
    },
    {
      flags: '--order-type <string>',
      description: 'order type',
    },
    {
      flags: '--collateral-info <string>',
      description: 'collateral info account',
    },
    {
      flags: '--collateral-token <string>',
      description: 'collateral token account',
    },
    {
      flags: '--order-type <string>',
      description: 'order type',
    },
    {
      flags: '--active-window <number>',
      description: 'active window in seconds',
      defaultValue: '60',
    },
    {
      flags: '--settlement-window <number>',
      description: 'settlement window in seconds',
      defaultValue: '60',
    },
  ]);

export const rfqGroup = (c: Command) => {
  const group = c.command('rfq');
  getActiveCmd(group);
  getAllCmd(group);
  getCmd(group);
  createCmd(group);
};
