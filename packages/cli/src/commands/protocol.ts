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
  addCmd(c, 'protocol:initialize', 'Initializes protocol', initializeProtocol, [
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
  addCmd(
    c,
    'protocol:add-instrument',
    'Adds protocol instrument',
    addInstrument,
    commonOptions
  );

export const addBaseAssetCmd = (c: Command) =>
  addCmd(
    c,
    'protocol:add-base-asset',
    'Adds protocol base asset',
    addBaseAsset,
    [
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
    ]
  );

export const registerMintCmd = (c: Command) =>
  addCmd(c, 'protocol:register-mint', 'Registers protocol mint', registerMint, [
    { flags: '--mint <string>', description: 'Mint address' },
    {
      flags: '--base-asset-index <number>',
      description: 'Base asset index',
      // NOTE: This is a hack to make the command work without this option
      defaultValue: null,
    },
  ]);

export const getRegisteredMintsCmd = (c: Command) =>
  addCmd(
    c,
    'protocol:get-registered-mints',
    'Gets protocol registered mints',
    getRegisteredMints
  );

export const getProtocolConfigCmd = (c: Command) =>
  addCmd(c, 'protocol:get-config', 'Gets protocol config', getProtocol);

export const getBaseAssetsCmd = (c: Command) =>
  addCmd(
    c,
    'protocol:get-base-assets',
    'Gets protocol base assets',
    getBaseAssets
  );
