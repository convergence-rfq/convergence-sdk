import { Command } from 'commander';

import {
  airdrop,
  airdropDevnetTokens,
  initializeProtocol,
  getProtocol,
  getRiskEngineConfig,
  getRfqs,
  getBaseAssets,
  getRegisteredMints,
  createMint,
  createWallet,
  mintTo,
  registerMint,
  addBaseAsset,
  addInstrument,
  initializeRiskEngine,
  updateRiskEngine,
  setRiskEngineInstrumentType,
  setRiskEngineCategoriesInfo,
} from './actions';

export const airdropSolCmd = (cli: Command) =>
  cli
    .command('airdrop-sol')
    .description('Airdrops SOL to the current user')
    .option('--amount <number>', 'Amount to airdrop in SOL', '1')
    .action(airdrop);

export const airdropDevnetTokensCmd = (cli: Command) =>
  cli
    .command('airdrop-devnet-tokens')
    .description('Airdrops Devnet tokens')
    .requiredOption('--owner <string>', 'Owner address')
    .action(airdropDevnetTokens);

export const createMintCmd = (cli: Command) =>
  cli
    .command('create-mint')
    .description('Creates mint')
    .requiredOption('--decimals <value>', 'Decimals')
    .action(createMint);

export const createWalletCmd = (cli: Command) =>
  cli
    .command('create-wallet')
    .description('Creates wallet')
    .requiredOption('--owner <value>', 'Owner address')
    .requiredOption('--mint <value>', 'Mint address')
    .action(createWallet);

export const mintToCmd = (cli: Command) =>
  cli
    .command('mint-to')
    .description('Mints tokens to wallet')
    .requiredOption('--mint <string>', 'Mint address')
    .requiredOption('--wallet <string>', 'Wallet address')
    .requiredOption('--amount <number>', 'Mint amount')
    .action(mintTo);

export const initializeRiskEngineCmd = (cli: Command) =>
  cli
    .command('initialize-risk-engine')
    .description('Initializes risk engine')
    .option('--collateral-mint-decimals <number>', 'Collateral decimals', '6')
    .option(
      '--collateral-for-variable-size-rfq-creation <number>',
      'Collateral ',
      '1000000000'
    )
    .option(
      '--collateral-for-fixed-quote-amount-rfq-creation <number>',
      'Collateral',
      '2000000000'
    )
    .option(
      '--safety-price-shift-factor <number>',
      'Safety price shift factor',
      '0.01'
    )
    .option('--overall-safety-factor <number>', 'Overall Safety factor', '0.1')
    .action(initializeRiskEngine);

export const updateRiskEngineCmd = (cli: Command) =>
  cli
    .command('update-risk-engine')
    .description('Updates risk engine')
    .option('--collateral-mint-decimals <number>', 'Collateral decimals', '6')
    .option(
      '--collateral-for-variable-size-rfq-creation <number>',
      'Collateral ',
      '1000000000'
    )
    .option(
      '--collateral-for-fixed-quote-amount-rfq-creation <number>',
      'Collateral',
      '2000000000'
    )
    .option(
      '--safety-price-shift-factor <number>',
      'Safety price shift factor',
      '0.01'
    )
    .option('--overall-safety-factor <number>', 'Overall Safety factor', '0.1')
    .action(updateRiskEngine);

export const setRiskEngineInstrumentTypeCmd = (cli: Command) =>
  cli
    .command('set-risk-engine-instrument-type')
    .description('Sets risk engine instrument type')
    .option('--type <string>', 'Instrument type')
    .option('--program <string>', 'Instrument program')
    .action(setRiskEngineInstrumentType);

export const setRiskEngineCategoriesInfoCmd = (cli: Command) =>
  cli
    .command('set-risk-engine-risk-categories-info')
    .description('Sets risk engine risk categories info')
    .requiredOption('--category <string>', 'Category')
    .requiredOption('--new-value <value>', 'New value')
    .action(setRiskEngineCategoriesInfo);

export const getRiskEngineConfigCmd = (cli: Command) =>
  cli
    .command('get-risk-engine-config')
    .description('Get risk engine risk config')
    .action(getRiskEngineConfig);

export const initializeProtocolCmd = (cli: Command) =>
  cli
    .command('initialize-protocol')
    .description('Initializes protocol')
    .requiredOption('--collateral-mint <value>', 'Collateral mint address')
    .option('--maker-fee <number>', 'Maker fee')
    .option('--taker-fee <number>', 'Taker fee')
    .action(initializeProtocol);

export const addInstrumentCmd = (cli: Command) =>
  cli
    .command('add-instrument')
    .description('Adds instrument')
    .option('--instrument-program <string>', 'Instrument program address')
    .option('--can-be-used-as-quote <boolean>', 'Can be used as quote')
    .requiredOption(
      '--validate-data-account-amount <number>',
      'Validate data account amount'
    )
    .requiredOption(
      '--prepare-to-settle-account-amount <number>',
      'Prepare to settle account amount'
    )
    .requiredOption('--settle-account-amount <number>', 'Settle account amount')
    .requiredOption(
      '--revert-preparation-account-amount <number>',
      'Revert preparation account amount'
    )
    .requiredOption(
      '--clean-up-account-amount <number>',
      'Clean up account amount'
    )
    .action(addInstrument);

export const addBaseAssetCmd = (cli: Command) =>
  cli
    .command('add-base-asset')
    .description('Adds base asset')
    .requiredOption('--ticker <value>', 'Ticker')
    .requiredOption('--oracle-address <string>', 'Oracle address')
    .option('--oracle-kind <string>', 'Oracle kind', 'Switchboard')
    .option('--risk-category <string>', 'Risk category', 'very-low')
    .action(addBaseAsset);

export const registerMintCmd = (cli: Command) =>
  cli
    .command('register-mint')
    .description('Registers mint')
    .requiredOption('--mint <string>', 'Mint address')
    .option('--base-asset-index <number>', 'Base asset index')
    .action(registerMint);

export const getRegisteredMintsCmd = (cli: Command) =>
  cli
    .command('get-registered-mints')
    .description('Get registered mints')
    .action(getRegisteredMints);

export const getProtocolCmd = (cli: Command) =>
  cli.command('get-protocol').description('Get protocol').action(getProtocol);

export const getBaseAssetsCmd = (cli: Command) =>
  cli
    .command('get-base-assets')
    .description('Get base assets')
    .action(getBaseAssets);

export const getRfqsCmd = (cli: Command) =>
  cli.command('get-rfqs').description('Get RFQs').action(getRfqs);
