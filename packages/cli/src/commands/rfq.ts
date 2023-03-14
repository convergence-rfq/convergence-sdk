import { Command } from 'commander';

import { getRfq, getActiveRfqs, getAllRfqs, createRfq } from '../actions';

import { addCmd } from './helpers';

export const getAllRfqsCmd = (c: Command) =>
  addCmd(c, 'rfq:get-all', 'Get all RFQs', getAllRfqs);

export const getActiveRfqsCmd = (c: Command) =>
  addCmd(c, 'rfq:get-active', 'Get all RFQs', getActiveRfqs);

export const getRfqCmd = (c: Command) =>
  addCmd(c, 'rfq:get', 'Get RFQ', getRfq, [
    {
      flags: '--address <string>',
      description: 'RFQ address',
    },
  ]);

export const createRfqCmd = (c: Command) =>
  addCmd(c, 'rfq:create', 'Create RFQ', createRfq, [
    {
      flags: '--quote-mint <string>',
      description: 'Quote mint',
    },
    {
      flags: '--base-mint <string>',
      description: 'Base mint',
    },
    {
      flags: '--side <string>',
      description: 'Side',
    },
    {
      flags: '--size <string>',
      description: 'Size',
    },
    {
      flags: '--amount <number>',
      description: 'Amount',
    },
    {
      flags: '--order-type <string>',
      description: 'Order type',
    },
    {
      flags: '--active-window <number>',
      description: 'Active window in seconds',
      defaultValue: '60',
    },
    {
      flags: '--settlement-window <number>',
      description: 'Settlement window in seconds',
      defaultValue: '60',
    },
  ]);
