import { Command } from 'commander';
import {
  initializeProtocol,
  addBaseAsset,
  addInstrument,
  registerMint,
  getRegisteredMints,
  getProtocol,
  getBaseAssets,
} from '../actions';

import { addCmd } from './helpers';

const commonOptions = [
  {
    flags: '--instrument-program <string>',
    description: 'Instrument program address',
  },
  {
    flags: '--can-be-used-as-quote <boolean>',
    description: 'Can be used as quote',
  },
  {
    flags: '--validate-data-account-amount <number>',
    description: 'Validate data account amount',
  },
  {
    flags: '--prepare-to-settle-account-amount <number>',
    description: 'Prepare to settle account amount',
  },
  {
    flags: '--settle-account-amount <number>',
    description: 'Settle account amount',
  },
  {
    flags: '--revert-preparation-account-amount <number>',
    description: 'Revert preparation account amount',
  },
  {
    flags: '--clean-up-account-amount <number>',
    description: 'Clean up account amount',
  },
];

export const initializeProtocolCmd = (c: Command) =>
  addCmd(c, 'initialize-protocol', 'Initializes protocol', initializeProtocol, [
    {
      flags: '--collateral-mint <string>',
      description: 'Collateral mint address',
    },
    {
      flags: '--maker-fee <number>',
      description: 'Maker fee',
      defaultValue: '0',
    },
    {
      flags: '--taker-fee <number>',
      description: 'Taker fee',
      defaultValue: '0',
    },
  ]);

export const addInstrumentCmd = (c: Command) =>
  addCmd(c, 'add-instrument', 'Adds instrument', addInstrument, commonOptions);

export const addBaseAssetCmd = (c: Command) =>
  addCmd(c, 'add-base-asset', 'Adds base asset', addBaseAsset, [
    {
      flags: '--ticker <string>',
      description: 'Ticker',
    },
    {
      flags: '--oracle-address <string>',
      description: 'Oracle address',
    },
    {
      flags: '--oracle-kind <string>',
      description: 'Oracle kind',
      defaultValue: 'Switchboard',
    },
    {
      flags: '--risk-category <string>',
      description: 'Risk category',
      defaultValue: 'medium',
    },
  ]);

export const registerMintCmd = (c: Command) =>
  addCmd(c, 'register-mint', 'Registers mint', registerMint, [
    { flags: '--mint <string>', description: 'Mint address' },
    {
      flags: '--base-asset-index <number>',
      description: 'Base asset index',
      // NOTE: This is a hack to make the command work without this option
      defaultValue: null,
    },
  ]);

export const getRegisteredMintsCmd = (c: Command) =>
  addCmd(c, 'get-registered-mints', 'Get registered mints', getRegisteredMints);

export const getProtocolCmd = (c: Command) =>
  addCmd(c, 'get-protocol', 'Get protocol', getProtocol);

export const getBaseAssetsCmd = (c: Command) =>
  addCmd(c, 'get-base-assets', 'Get base assets', getBaseAssets);
