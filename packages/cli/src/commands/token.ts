import { Command } from 'commander';

import { createMint, createWallet, mintTo } from '../actions';
import { addCmd } from './helpers';

export const createMintCmd = (c: Command) =>
  addCmd(c, 'token:create-mint', 'creates a token mint', createMint, [
    {
      description: 'decimals',
      flags: '--decimals <value>',
    },
  ]);

export const createWalletCmd = (c: Command) =>
  addCmd(c, 'token:create-wallet', 'creates a token wallet', createWallet, [
    { flags: '--owner <string>', description: 'owner address' },
    { flags: '--mint <string>', description: 'mint address' },
  ]);

export const mintToCmd = (c: Command) =>
  addCmd(c, 'token:mint-to', 'mints tokens to wallet', mintTo, [
    { flags: '--mint <string>', description: 'mint address' },
    { flags: '--wallet <string>', description: 'wallet address' },
    { flags: '--amount <number>', description: 'mint amount' },
  ]);
