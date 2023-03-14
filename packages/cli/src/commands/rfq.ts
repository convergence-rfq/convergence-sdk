import { Command } from 'commander';

import { getRfqs, createRfq } from '../actions';

import { addCmd } from './helpers';

export const getRfqsCmd = (c: Command) =>
  addCmd(c, 'rfq:get-all', 'Get all RFQs', getRfqs);

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
