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
    description: 'instrument program address',
  },
  {
    flags: '--can-be-used-as-quote <boolean>',
    description: 'can be used as quote',
  },
  {
    flags: '--validate-data-account-amount <number>',
    description: 'validate data account amount',
  },
  {
    flags: '--prepare-to-settle-account-amount <number>',
    description: 'prepare to settle account amount',
  },
  {
    flags: '--settle-account-amount <number>',
    description: 'settle account amount',
  },
  {
    flags: '--revert-preparation-account-amount <number>',
    description: 'revert preparation account amount',
  },
  {
    flags: '--clean-up-account-amount <number>',
    description: 'clean up account amount',
  },
];

export const initializeProtocolCmd = (c: Command) =>
  addCmd(c, 'protocol:initialize', 'initializes protocol', initializeProtocol, [
    {
      flags: '--collateral-mint <string>',
      description: 'collateral mint address',
    },
    {
      flags: '--maker-fee <number>',
      description: 'maker fee',
      defaultValue: '0',
    },
    {
      flags: '--taker-fee <number>',
      description: 'taker fee',
      defaultValue: '0',
    },
  ]);

export const addInstrumentCmd = (c: Command) =>
  addCmd(
    c,
    'protocol:add-instrument',
    'adds protocol instrument',
    addInstrument,
    commonOptions
  );

export const addBaseAssetCmd = (c: Command) =>
  addCmd(
    c,
    'protocol:add-base-asset',
    'adds protocol base asset',
    addBaseAsset,
    [
      {
        flags: '--ticker <string>',
        description: 'ticker',
      },
      {
        flags: '--oracle-address <string>',
        description: 'oracle address',
      },
      {
        flags: '--oracle-kind <string>',
        description: 'oracle kind',
        defaultValue: 'switchboard',
      },
      {
        flags: '--risk-category <string>',
        description: 'risk category',
        defaultValue: 'medium',
      },
    ]
  );

export const registerMintCmd = (c: Command) =>
  addCmd(c, 'protocol:register-mint', 'registers protocol mint', registerMint, [
    { flags: '--mint <string>', description: 'mint address' },
    {
      flags: '--base-asset-index <number>',
      description: 'base asset index',
      // NOTE: This is a hack to make the command work without this option
      defaultValue: null,
    },
  ]);

export const getRegisteredMintsCmd = (c: Command) =>
  addCmd(
    c,
    'protocol:get-registered-mints',
    'gets protocol registered mints',
    getRegisteredMints
  );

export const getProtocolConfigCmd = (c: Command) =>
  addCmd(c, 'protocol:get-config', 'gets protocol config', getProtocol);

export const getBaseAssetsCmd = (c: Command) =>
  addCmd(
    c,
    'protocol:get-base-assets',
    'gets protocol base assets',
    getBaseAssets
  );
