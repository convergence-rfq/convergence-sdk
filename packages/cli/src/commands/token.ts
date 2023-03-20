import { Command } from 'commander';

import {
  createMint,
  createWallet,
  getMint,
  getWallet,
  mintTo,
} from '../actions';
import { addCmd } from './helpers';

export const createMintCmd = (c: Command) =>
  addCmd(c, 'token:create-mint', 'creates token mint', createMint, [
    {
      description: 'decimals',
      flags: '--decimals <number>',
    },
  ]);

export const getMintCmd = (c: Command) =>
  addCmd(c, 'token:get-mint', 'gets token mint', getMint, [
    {
      description: 'mint address',
      flags: '--address <string>',
    },
  ]);

export const createWalletCmd = (c: Command) =>
  addCmd(c, 'token:create-wallet', 'creates a token wallet', createWallet, [
    { flags: '--owner <string>', description: 'owner address' },
    { flags: '--mint <string>', description: 'mint address' },
  ]);

export const getWalletCmd = (c: Command) =>
  addCmd(c, 'token:get-wallet', 'gets a token wallet', getWallet, [
    { flags: '--address <string>', description: 'wallet address' },
  ]);

export const mintToCmd = (c: Command) =>
  addCmd(c, 'token:mint-to', 'mints tokens to wallet', mintTo, [
    { flags: '--mint <string>', description: 'mint address' },
    { flags: '--wallet <string>', description: 'wallet address' },
    { flags: '--amount <number>', description: 'mint amount' },
  ]);
