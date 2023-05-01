import { Command } from 'commander';

import { airdrop, airdropDevnetTokens } from '../actions';
import { addCmd } from '../helpers';

const solCmd = (c: Command) =>
  addCmd(c, 'sol', 'airdrops SOL to the current user', airdrop, [
    {
      flags: '--amount <number>',
      description: 'amount to airdrop in SOL',
      defaultValue: '1',
    },
  ]);

const devnetTokensCmd = (c: Command) =>
  addCmd(c, 'devnet-tokens', 'airdrops Devnet tokens', airdropDevnetTokens, [
    {
      flags: '--owner <string>',
      description: 'owner address',
    },
  ]);

export const airdropGroup = (c: Command) => {
  const group = c.command('airdrop');
  solCmd(group);
  devnetTokensCmd(group);
};
