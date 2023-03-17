import { Command } from 'commander';

import { getRfq, getActiveRfqs, getAllRfqs, createRfq } from '../actions';

import { addCmd } from './helpers';

export const getAllRfqsCmd = (c: Command) =>
  addCmd(c, 'rfq:get-all', 'gets all RFQs', getAllRfqs);

export const getActiveRfqsCmd = (c: Command) =>
  addCmd(c, 'rfq:get-active', 'get active RFQs', getActiveRfqs);

export const getRfqCmd = (c: Command) =>
  addCmd(c, 'rfq:get', 'gets RFQ details', getRfq, [
    {
      flags: '--address <string>',
      description: 'RFQ address',
    },
  ]);

export const createRfqCmd = (c: Command) =>
  addCmd(c, 'rfq:create', 'creates RFQ', createRfq, [
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
      flags: '--active-window <number>',
      description: 'active window in seconds',
      defaultValue: '60',
    },
    {
      flags: '--collateral-token <string>',
      description: 'collateral token account address',
    },
    {
      flags: '--settlement-window <number>',
      description: 'settlement window in seconds',
      defaultValue: '60',
    },
  ]);
