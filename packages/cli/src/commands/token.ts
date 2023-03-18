import { Command } from 'commander';

import { createMint, createWallet, mintTo } from '../actions';
import { addCmd } from './helpers';

export const createMintCmd = (c: Command) =>
  addCmd(c, 'token:create-mint', 'Creates a token mint', createMint, [
    {
      description: 'Decimals',
      flags: '--decimals <value>',
    },
  ]);

export const createWalletCmd = (c: Command) =>
  addCmd(c, 'token:create-wallet', 'Creates a token wallet', createWallet, [
    { flags: '--owner <string>', description: 'Owner address' },
    { flags: '--mint <string>', description: 'Mint address' },
  ]);

export const mintToCmd = (c: Command) =>
  addCmd(c, 'token:mint-to', 'Mints tokens to wallet', mintTo, [
    { flags: '--mint <string>', description: 'Mint address' },
    { flags: '--wallet <string>', description: 'Wallet address' },
    { flags: '--amount <number>', description: 'Mint amount' },
  ]);