import { Command } from 'commander';
import {
  initializeProtocol,
  addBaseAsset,
  addInstrument,
  registerMint,
  getRegisteredMints,
  getProtocol,
  getBaseAssets,
  closeProtocol,
  addPrintTradeProvider,
} from '../actions';

import { addCmd } from '../helpers';

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

const initializeProtocolCmd = (c: Command) =>
  addCmd(c, 'initialize', 'initializes protocol', initializeProtocol, [
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

const addInstrumentCmd = (c: Command) =>
  addCmd(
    c,
    'add-instrument',
    'adds protocol instrument',
    addInstrument,
    commonOptions
  );

const addPrintTradeProviderCmd = (c: Command) =>
  addCmd(
    c,
    'add-print-trade-provider',
    'adds print trade provider to the protocol',
    addPrintTradeProvider,
    [
      {
        flags: '--print-trade-provider-program <string>',
        description: 'print trade provider program address',
      },
      {
        flags: '--settlement-can-expire <boolean>',
        description: 'settlement can expire',
      },
    ]
  );

const closeCmd = (c: Command) =>
  addCmd(c, 'close', 'closes protocol configuration', closeProtocol);

const addBaseAssetCmd = (c: Command) =>
  addCmd(c, 'add-base-asset', 'adds protocol base asset', addBaseAsset, [
    {
      flags: '--ticker <string>',
      description: 'ticker',
    },
    {
      flags: '--oracle-source <string>',
      description: 'oracle source',
      defaultValue: null,
    },
    {
      flags: '--oracle-price <number>',
      description: 'oracle price',
      defaultValue: null,
    },
    {
      flags: '--oracle-address <string>',
      description: 'oracle address',
      defaultValue: null,
    },
    {
      flags: '--risk-category <string>',
      description: 'risk category',
      defaultValue: 'medium',
    },
  ]);

const registerMintCmd = (c: Command) =>
  addCmd(c, 'register-mint', 'registers protocol mint', registerMint, [
    { flags: '--mint <string>', description: 'mint address' },
    {
      flags: '--base-asset-index <number>',
      description: 'base asset index',
      // NOTE: This is a hack to make the command work without this option
      defaultValue: null,
    },
  ]);

const getRegisteredMintsCmd = (c: Command) =>
  addCmd(
    c,
    'get-registered-mints',
    'gets protocol registered mints',
    getRegisteredMints
  );

const getCmd = (c: Command) =>
  addCmd(c, 'get', 'gets protocol config', getProtocol);

const getBaseAssetsCmd = (c: Command) =>
  addCmd(c, 'get-base-assets', 'gets protocol base assets', getBaseAssets);

export const protocolGroup = (c: Command) => {
  const group = c.command('protocol');
  initializeProtocolCmd(group);
  addInstrumentCmd(group);
  addPrintTradeProviderCmd(group);
  addBaseAssetCmd(group);
  registerMintCmd(group);
  getRegisteredMintsCmd(group);
  getCmd(group);
  getBaseAssetsCmd(group);
  closeCmd(group);
};
