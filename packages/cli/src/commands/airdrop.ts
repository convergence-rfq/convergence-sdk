import { Command } from 'commander';

import { airdrop, airdropDevnetTokens } from '../actions';
import { addCmd } from './helpers';

export const airdropSolCmd = (c: Command) =>
  addCmd(c, 'airdrop-sol', 'Airdrops SOL to the current user', airdrop, [
    {
      flags: '--amount <number>',
      description: 'Amount to airdrop in SOL',
      defaultValue: '1',
    },
  ]);

export const airdropDevnetTokensCmd = (c: Command) =>
  addCmd(
    c,
    'airdop-devnet-tokens',
    'Airdrops Devnet tokens',
    airdropDevnetTokens,
    [
      {
        flags: '--owner <string>',
        description: 'Owner address',
      },
    ]
  );
