#!/usr/bin/env node
/* eslint-disable no-console */
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { Command } from 'commander';
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  Convergence,
  RiskCategory,
  InstrumentType,
  BaseAsset,
  keypairIdentity,
  token,
  toRiskCategoryInfo,
  toScenario,
  devnetAirdrops,
} from '@convergence-rfq/sdk';

type Opts = any;

/// Constants

const DEFAULT_KEYPAIR_FILE = `${homedir()}/.config/solana/id.json`;
const DEFAULT_RPC_ENDPOINT = 'https://api.devnet.solana.com';

/// HELPERS

const createCvg = async (opts: Opts): Promise<Convergence> => {
  const buffer = JSON.parse(readFileSync(opts.keypairFile, 'utf8'));
  const user = Keypair.fromSecretKey(new Uint8Array(buffer));
  const cvg = new Convergence(
    new Connection(opts.rpcEndpoint, {
      commitment: 'confirmed',
    }),
    { skipPreflight: true }
  );
  cvg.use(keypairIdentity(user));
  return cvg;
};

const addDefaultArgs = (cmd: any) => {
  cmd.option('--rpc-endpoint <string>', 'RPC endpoint', DEFAULT_RPC_ENDPOINT);
  cmd.option('--keypair-file <string>', 'Keypair file', DEFAULT_KEYPAIR_FILE);
  cmd.option('--verbose <boolean>', 'Verbose', false);
  return cmd;
};

// ACTIONS

const airdrop = async (opts: any) => {
  const cvg = await createCvg(opts);
  const user = cvg.rpc().getDefaultFeePayer();
  const tx = await cvg.connection.requestAirdrop(
    user.publicKey,
    opts.amount * LAMPORTS_PER_SOL
  );
  await cvg.connection.confirmTransaction(tx);
  console.log('Tx:', tx);
};

const createMint = async (opts: any) => {
  const cvg = await createCvg(opts);
  const user = cvg.rpc().getDefaultFeePayer();
  const { mint, response } = await cvg.tokens().createMint({
    mintAuthority: user.publicKey,
    decimals: opts.decimals,
  });
  console.log('Address:', mint.address.toString());
  console.log('Tx:', response.signature);
};

const createWallet = async (opts: any) => {
  const cvg = await createCvg(opts);
  const { token: wallet, response } = await cvg.tokens().createToken({
    mint: new PublicKey(opts.mint),
    owner: new PublicKey(opts.owner),
  });
  console.log('Address:', wallet.address.toString());
  console.log('Tx:', response.signature);
};

const mintTo = async (opts: any) => {
  const cvg = await createCvg(opts);
  const user = cvg.rpc().getDefaultFeePayer();
  const { response } = await cvg.tokens().mint({
    mintAddress: new PublicKey(opts.mint),
    amount: token(opts.amount),
    toToken: new PublicKey(opts.wallet),
    mintAuthority: user.publicKey,
  });
  console.log('Tx:', response.signature);
};

const initializeProtocol = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const collateralMint = new PublicKey(opts.collateralMint);
  const { response } = await cvg.protocol().initialize({ collateralMint });
  console.log('Tx:', response.signature);
};

const initializeRiskEngine = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const {
    collateralMintDecimals,
    collateralForVariableSizeRfqCreation,
    collateralForFixedQuoteAmountRfqCreation,
    safetyPriceShiftFactor,
    overallSafetyFactor,
  } = opts;
  const { response } = await cvg.riskEngine().initializeConfig({
    collateralMintDecimals,
    collateralForVariableSizeRfqCreation,
    collateralForFixedQuoteAmountRfqCreation,
    safetyPriceShiftFactor,
    overallSafetyFactor,
  });
  console.log('Tx:', response.signature);
};

const updateRiskEngine = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const {
    collateralMintDecimals,
    collateralForVariableSizeRfqCreation,
    collateralForFixedQuoteAmountRfqCreation,
    safetyPriceShiftFactor,
    overallSafetyFactor,
  } = opts;
  const { response } = await cvg.riskEngine().updateConfig({
    collateralMintDecimals,
    collateralForVariableSizeRfqCreation,
    collateralForFixedQuoteAmountRfqCreation,
    safetyPriceShiftFactor,
    overallSafetyFactor,
  });
  console.log('Tx:', response.signature);
};

const addInstrument = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const { response } = await cvg.protocol().addInstrument({
    authority: cvg.rpc().getDefaultFeePayer(),
    instrumentProgram: new PublicKey(opts.instrumentProgram),
    canBeUsedAsQuote: opts.canBeUsedAsQuote,
    validateDataAccountAmount: opts.validateDataAccountAmount,
    prepareToSettleAccountAmount: opts.prepareToSettleAccountAmount,
    settleAccountAmount: opts.settleAccountAmount,
    revertPreparationAccountAmount: opts.revertPreparationAccountAmount,
    cleanUpAccountAmount: opts.cleanUpAccountAmount,
  });
  console.log('Tx:', response.signature);
};

const setRiskEngineInstrumentType = async (opts: Opts) => {
  let instrumentType;
  if (opts.type == 'spot') {
    instrumentType = InstrumentType.Spot;
  } else if (opts.type == 'option') {
    instrumentType = InstrumentType.Option;
  } else {
    throw new Error('Invalid instrument type');
  }

  const cvg = await createCvg(opts);
  const { response } = await cvg.riskEngine().setInstrumentType({
    instrumentProgram: new PublicKey(opts.program),
    instrumentType,
  });

  console.log('Tx:', response.signature);
};

const setRiskEngineCategoriesInfo = async (opts: Opts) => {
  const newValue = opts.newValue.split(',').map((x: string) => parseFloat(x));

  let riskCategoryIndex;
  if (opts.category == 'very-low') {
    riskCategoryIndex = RiskCategory.VeryLow;
  } else if (opts.category == 'low') {
    riskCategoryIndex = RiskCategory.Low;
  } else if (opts.category == 'medium') {
    riskCategoryIndex = RiskCategory.Medium;
  } else if (opts.category == 'high') {
    riskCategoryIndex = RiskCategory.High;
  } else if (opts.category == 'very-high') {
    riskCategoryIndex = RiskCategory.VeryHigh;
  } else {
    throw new Error('Invalid risk category');
  }

  const cvg = await createCvg(opts);
  const { response } = await cvg.riskEngine().setRiskCategoriesInfo({
    changes: [
      {
        newValue: toRiskCategoryInfo(newValue[0], newValue[1], [
          toScenario(newValue[2], newValue[3]),
          toScenario(newValue[4], newValue[5]),
          toScenario(newValue[6], newValue[7]),
          toScenario(newValue[8], newValue[9]),
          toScenario(newValue[10], newValue[11]),
          toScenario(newValue[12], newValue[13]),
        ]),
        riskCategoryIndex,
      },
    ],
  });

  console.log('Tx:', response.signature);
};

const addBaseAsset = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const baseAssets = await cvg.protocol().getBaseAssets();

  let riskCategory;
  if (opts.riskCategory === 'very-low') {
    riskCategory = RiskCategory.Low;
  } else if (opts.riskCategory === 'low') {
    riskCategory = RiskCategory.Low;
  } else if (opts.riskCategory === 'medium') {
    riskCategory = RiskCategory.Medium;
  } else if (opts.riskCategory === 'high') {
    riskCategory = RiskCategory.High;
  } else if (opts.riskCategory === 'very-high') {
    riskCategory = RiskCategory.VeryHigh;
  } else {
    throw new Error('Invalid risk category');
  }

  const { response } = await cvg.protocol().addBaseAsset({
    authority: cvg.rpc().getDefaultFeePayer(),
    index: { value: baseAssets.length },
    ticker: opts.ticker,
    riskCategory,
    priceOracle: {
      __kind: opts.oracleKind,
      address: new PublicKey(opts.oracleAddress),
    },
  });
  console.log('Tx:', response.signature);
};

const registerMint = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const mint = new PublicKey(opts.mint);

  let args;
  if (opts.baseAssetIndex >= 0) {
    args = {
      baseAssetIndex: opts.baseAssetIndex,
      mint,
    };
  } else {
    args = {
      mint,
    };
  }

  const { response } = await cvg.protocol().registerMint(args);
  console.log('Tx:', response.signature);
};

const getRegisteredMints = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const mints = await cvg.protocol().getRegisteredMints();
  mints.map((x: any) => console.log('Address:', x.address.toString()));
};

const getBaseAssets = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const baseAssets = await cvg.protocol().getBaseAssets();
  baseAssets.map((baseAsset: BaseAsset) =>
    console.log('Ticker:', baseAsset.ticker.toString())
  );
};

const getProtocol = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const p = await cvg.protocol().get();
  console.log('Address:', p.address.toString());
  console.log('Authority:', p.authority.toString());
  console.log('Active:', p.active);
  console.log('Risk engine:', p.riskEngine.toString());
  console.log('Collateral mint:', p.collateralMint.toString());
  console.log(`Taker fee: ${p.settleFees.takerBps.toString()} bps`);
  console.log(`Maker fee: ${p.settleFees.makerBps.toString()} bps`);
  console.log(`Taker default fee: ${p.defaultFees.takerBps.toString()} bps`);
  console.log(`Maker default fee: ${p.defaultFees.makerBps.toString()} bps`);
  //instruments: [
  //  {
  //    programKey: [PublicKey [PublicKey(HNHBtGzS58xJarSbz5XbEjTTEFbAQUHdP8TjQmwjx1gW)]],
  //    enabled: true,
  //    canBeUsedAsQuote: true,
  //    validateDataAccountAmount: 1,
  //    prepareToSettleAccountAmount: 7,
  //    settleAccountAmount: 3,
  //    revertPreparationAccountAmount: 3,
  //    cleanUpAccountAmount: 4
};

const airdropDevnetTokens = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const owner = new PublicKey(opts.owner);
  const { collateralWallet, registeredMintWallets } = await devnetAirdrops(
    cvg,
    owner
  );
  console.log('Collateral wallet:', collateralWallet.address.toString());
  registeredMintWallets.map((wallet: any) => {
    console.log('Registered mint wallet:', wallet.address.toString());
  });
};

/// CLI

export const makeCli = (): Command => {
  const cli = new Command();
  cli
    .name('convergence')
    .version('4.0.23-rc.7')
    .description('Convergence RFQ CLI');

  const cmds = [
    /// Devnet
    cli
      .command('airdrop')
      .description('Airdrops SOL to the current user')
      .option('--amount <value>', 'Amount to airdrop in SOL', '1')
      .action(airdrop),
    /// Utils
    cli
      .command('create-mint')
      .description('Creates mint')
      .requiredOption('--decimals <value>', 'Decimals')
      .action(createMint),
    cli
      .command('create-wallet')
      .description('Creates wallet')
      .requiredOption('--owner <value>', 'Owner address')
      .requiredOption('--mint <value>', 'Mint address')
      .action(createWallet),
    cli
      .command('mint-to')
      .description('Mints tokens to wallet')
      .requiredOption('--mint <value>', 'Mint address')
      .requiredOption('--wallet <value>', 'Wallet address')
      .requiredOption('--amount <value>', 'Mint amount')
      .action(mintTo),
    /// Risk engine
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
      .option(
        '--overall-safety-factor <number>',
        'Overall Safety factor',
        '0.1'
      )
      .action(initializeRiskEngine),
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
      .option(
        '--overall-safety-factor <number>',
        'Overall Safety factor',
        '0.1'
      )
      .action(updateRiskEngine),
    cli
      .command('set-risk-engine-instrument-type')
      .description('Sets risk engine instrument type')
      .option('--type <value>', 'Instrument type')
      .option('--program <value>', 'Instrument program')
      .action(setRiskEngineInstrumentType),
    cli
      .command('set-risk-engine-risk-categories-info')
      .description('Sets risk engine risk categories info')
      .requiredOption('--category <value>', 'Category')
      .requiredOption('--new-value <value>', 'New value')
      .action(setRiskEngineCategoriesInfo),
    /// Protocol
    cli
      .command('initialize-protocol')
      .description('Initializes protocol')
      .requiredOption('--collateral-mint <value>', 'Collateral mint address')
      .option('--maker-fee <value>', 'Maker fee')
      .option('--taker-fee <value>', 'Taker fee')
      .action(initializeProtocol),
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
      .requiredOption(
        '--settle-account-amount <number>',
        'Settle account amount'
      )
      .requiredOption(
        '--revert-preparation-account-amount <number>',
        'Revert preparation account amount'
      )
      .requiredOption(
        '--clean-up-account-amount <number>',
        'Clean up account amount'
      )
      .action(addInstrument),
    cli
      .command('add-base-asset')
      .description('Adds base asset')
      .requiredOption('--ticker <value>', 'Ticker')
      .requiredOption('--oracle-address <value>', 'Oracle address')
      .option('--oracle-kind <value>', 'Oracle kind', 'Switchboard')
      .option('--risk-category <value>', 'Risk category', 'very-low')
      .action(addBaseAsset),
    cli
      .command('register-mint')
      .description('Registers mint')
      .requiredOption('--mint <value>', 'Mint address')
      .option('--base-asset-index <value>', 'Base asset index')
      .action(registerMint),
    cli
      .command('get-registered-mints')
      .description('Get registered mints')
      .action(getRegisteredMints),
    cli.command('get-protocol').description('Get protocol').action(getProtocol),
    cli
      .command('get-base-assets')
      .description('Get base assets')
      .action(getBaseAssets),
    cli
      .command('airdrop-devnet-tokens')
      .description('Airdrops devnet tokens')
      .requiredOption('--owner <value>', 'Owner address')
      .action(airdropDevnetTokens),
  ];

  cmds.map(addDefaultArgs);
  return cli;
};
