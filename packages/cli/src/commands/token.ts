import { Command } from 'commander';

import {
  createMint,
  createWallet,
  getMint,
  getWallet,
  mintTo,
} from '../actions';
import { addCmd } from './helpers';

const createMintCmd = (c: Command) =>
  addCmd(c, 'create-mint', 'creates token mint', createMint, [
    {
      description: 'decimals',
      flags: '--decimals <number>',
    },
  ]);

const getMintCmd = (c: Command) =>
  addCmd(c, 'get-mint', 'gets token mint', getMint, [
    {
      description: 'mint address',
      flags: '--address <string>',
    },
  ]);

const createWalletCmd = (c: Command) =>
  addCmd(c, 'create-wallet', 'creates a token wallet', createWallet, [
    { flags: '--owner <string>', description: 'owner address' },
    { flags: '--mint <string>', description: 'mint address' },
  ]);

const getWalletCmd = (c: Command) =>
  addCmd(c, 'get-wallet', 'gets a token wallet', getWallet, [
    { flags: '--address <string>', description: 'wallet address' },
  ]);

const mintToCmd = (c: Command) =>
  addCmd(c, 'mint-to', 'mints tokens to wallet', mintTo, [
    { flags: '--mint <string>', description: 'mint address' },
    { flags: '--wallet <string>', description: 'wallet address' },
    { flags: '--amount <number>', description: 'mint amount' },
  ]);

export const tokenGroup = (c: Command) => {
  const group = c.command('token');
  createWalletCmd(group);
  createMintCmd(group);
  getMintCmd(group);
  createMintCmd(group);
  getWalletCmd(group);
  mintToCmd(group);
};
