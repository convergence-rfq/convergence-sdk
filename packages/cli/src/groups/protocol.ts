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
  changeBaseAssetParameters,
  addBaseAssetsFromJupiter,
  updateBaseAsset,
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
      flags: '--protocol-maker-fee <number>',
      description: 'protocol maker fee',
      defaultValue: '0',
    },
    {
      flags: '--protocol-taker-fee <number>',
      description: 'protocol taker fee',
      defaultValue: '0',
    },
    {
      flags: '--settlement-maker-fee <number>',
      description: 'settlement maker fee',
      defaultValue: '0',
    },
    {
      flags: '--settlement-taker-fee <number>',
      description: 'settlement taker fee',
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
      {
        flags: '--validate-response-account-amount <number>',
        description: 'amount of account passed to validate response CPI call',
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

const changeBaseAssetParametersCmd = (c: Command) =>
  addCmd(
    c,
    'change-base-asset-parameters',
    'change existing base asset parameters',
    changeBaseAssetParameters,
    [
      {
        flags: '--index <number>',
        description: 'base asset index',
      },
      {
        flags: '--enabled <string>',
        description: 'true to enable base asset, false to disable',
        defaultValue: null,
      },
      {
        flags: '--risk-category <string>',
        description: 'risk category',
        defaultValue: null,
      },
      {
        flags: '--oracle-source <string>',
        description: 'oracle source',
        defaultValue: null,
      },
      {
        flags: '--switchboard-oracle <string>',
        description: 'switchboard oracle, none to unset',
        defaultValue: null,
      },
      {
        flags: '--pyth-oracle <string>',
        description: 'pyth oracle, none to unset',
        defaultValue: null,
      },

      {
        flags: '--in-place-price <number>',
        description: 'in place price, -1 to unset',
        defaultValue: null,
      },
    ]
  );

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

const addBaseAssetsFromJupiterCmd = (c: Command) =>
  addCmd(
    c,
    'add-base-asset-from-jupiter',
    'adds baseAssets from jupiter',
    addBaseAssetsFromJupiter,
    [
      {
        flags: '--coin-gecko-api-key <string>',
        description: 'coin gecko api key',
      },
      {
        flags: '--birdeye-api-key <string>',
        description: 'birdeye api key',
      },
    ]
  );

const updateBaseAssetCmd = (c: Command) =>
  addCmd(c, 'update-base-asset', 'updates base asset', updateBaseAsset, [
    {
      flags: '--index <number>',
      description: 'index',
    },
    {
      flags: '--oracle-source <string>',
      description: 'oracle source - in-place | switchboard | pyth,',
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
      description:
        'risk category - "very-low" | "low" | "medium" | "high" | "very-high" | "custom-1" | "custom-2" | "custom-3"',
    },
  ]);

export const protocolGroup = (c: Command) => {
  const group = c.command('protocol');
  initializeProtocolCmd(group);
  addInstrumentCmd(group);
  addPrintTradeProviderCmd(group);
  addBaseAssetCmd(group);
  changeBaseAssetParametersCmd(group);
  registerMintCmd(group);
  getRegisteredMintsCmd(group);
  getCmd(group);
  getBaseAssetsCmd(group);
  closeCmd(group);
  addBaseAssetsFromJupiterCmd(group);
  updateBaseAssetCmd(group);
};
