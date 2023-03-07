#!/usr/bin/env node
/* eslint-disable no-console */
import { readFileSync } from 'fs';
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

type Options = any;

/// Constants

const DEFAULT_KEYPAIR_FILE = '/Users/pindaroso/.config/solana/dao.json';
//const DEFAULT_RPC_ENDPOINT = 'https://api.devnet.solana.com';
const DEFAULT_RPC_ENDPOINT = 'http://127.0.0.1:8899';

/// HELPERS

const createCvg = async (options: Options): Promise<Convergence> => {
  const user = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(readFileSync(options.keypairFile, 'utf8')))
  );
  const cvg = new Convergence(
    new Connection(options.rpcEndpoint, {
      commitment: 'confirmed',
    }),
    { skipPreflight: true }
  );
  cvg.use(keypairIdentity(user));

  if (options.verbose) {
    console.log('Using user:', user.publicKey.toString());
  }

  return cvg;
};

const addDefaultArgs = (cmd: any) => {
  cmd.option('--rpc-endpoint <value>', 'RPC endpoint', DEFAULT_RPC_ENDPOINT);
  cmd.option('--keypair-file <value>', 'Keypair file', DEFAULT_KEYPAIR_FILE);
  cmd.option('--verbose <value>', 'Verbose', false);
  return cmd;
};

// ACTIONS

const airdrop = async (options: any) => {
  console.log('Airdropping...');
  const cvg = await createCvg(options);
  const user = cvg.rpc().getDefaultFeePayer();
  const tx = await cvg.connection.requestAirdrop(
    user.publicKey,
    options.amount * LAMPORTS_PER_SOL
  );
  await cvg.connection.confirmTransaction(tx);
  console.log('Success!');
};

const createMint = async (options: any) => {
  console.log('Creating mint...');
  const cvg = await createCvg(options);
  const user = cvg.rpc().getDefaultFeePayer();
  const { mint, response } = await cvg.tokens().createMint({
    mintAuthority: user.publicKey,
    decimals: options.decimals,
  });
  console.log('Address:', mint.address.toString());
  console.log('Tx:', response.signature);
  console.log('Success!');
};

const createWallet = async (options: any) => {
  console.log('Creating wallet...');
  const cvg = await createCvg(options);
  const { token: wallet, response } = await cvg.tokens().createToken({
    mint: new PublicKey(options.mint),
    owner: new PublicKey(options.owner),
  });
  console.log('Address:', wallet.address.toString());
  console.log('Tx:', response.signature);
  console.log('Success!');
};

const mintTo = async (options: any) => {
  console.log('Minting to...');
  const cvg = await createCvg(options);
  const user = cvg.rpc().getDefaultFeePayer();
  const { response } = await cvg.tokens().mint({
    mintAddress: new PublicKey(options.mint),
    amount: token(options.amount),
    toToken: new PublicKey(options.wallet),
    mintAuthority: user.publicKey,
  });
  console.log('Tx:', response.signature);
  console.log('Success!');
};

const initializeProtocol = async (options: Options) => {
  console.log('Initializing protocol...');
  const cvg = await createCvg(options);
  const collateralMint = new PublicKey(options.collateralMint);
  const { response } = await cvg.protocol().initialize({ collateralMint });
  console.log('Tx:', response.signature);
  console.log('Success!');
};

const initializeRiskEngine = async (options: Options) => {
  console.log('Initializing risk engine...');
  const cvg = await createCvg(options);
  const { response } = await cvg.riskEngine().initializeConfig();
  console.log('Tx:', response.signature);
  console.log('Success!');
};

const addInstrument = async (options: Options) => {
  console.log('Adding instrument...');
  const cvg = await createCvg(options);
  const { response } = await cvg.protocol().addInstrument({
    authority: cvg.rpc().getDefaultFeePayer(),
    instrumentProgram: new PublicKey(options.instrumentProgram),
    canBeUsedAsQuote: options.canBeUsedAsQuote,
    validateDataAccountAmount: options.validateDataAccountAmount,
    prepareToSettleAccountAmount: options.prepareToSettleAccountAmount,
    settleAccountAmount: options.settleAccountAmount,
    revertPreparationAccountAmount: options.revertPreparationAccountAmount,
    cleanUpAccountAmount: options.cleanUpAccountAmount,
  });
  console.log('Tx:', response.signature);
  console.log('Success!');
};

const setRiskEngineInstrumentType = async (options: Options) => {
  console.log('Setting risk engine instrument type...');
  const cvg = await createCvg(options);

  let instrumentType;
  if (options.type == 'spot') {
    instrumentType = InstrumentType.Spot;
  } else if (options.type == 'option') {
    instrumentType = InstrumentType.Option;
  } else {
    throw new Error('Invalid instrument type');
  }

  const { response } = await cvg.riskEngine().setInstrumentType({
    instrumentProgram: new PublicKey(options.program),
    instrumentType,
  });

  console.log('Tx:', response.signature);
  console.log('Success!');
};

const setRiskEngineCategoriesInfo = async (options: Options) => {
  console.log('Setting risk engine categories info...');
  const cvg = await createCvg(options);

  let riskCategoryIndex;
  if (options.category == 'very-low') {
    riskCategoryIndex = RiskCategory.VeryLow;
  } else if (options.category == 'low') {
    riskCategoryIndex = RiskCategory.Low;
  } else if (options.category == 'medium') {
    riskCategoryIndex = RiskCategory.Medium;
  } else if (options.category == 'high') {
    riskCategoryIndex = RiskCategory.High;
  } else if (options.category == 'very-high') {
    riskCategoryIndex = RiskCategory.VeryHigh;
  } else {
    throw new Error('Invalid risk category');
  }

  const newValue = options.newValue
    .split(',')
    .map((x: string) => parseFloat(x));

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
  console.log('Success!');
};

const addBaseAsset = async (options: Options) => {
  console.log('Adding base asset...');

  const cvg = await createCvg(options);
  const baseAssets = await cvg.protocol().getBaseAssets();

  let riskCategory;
  if (options.riskCategory === 'very-low') {
    riskCategory = RiskCategory.Low;
  } else if (options.riskCategory === 'low') {
    riskCategory = RiskCategory.Low;
  } else if (options.riskCategory === 'medium') {
    riskCategory = RiskCategory.Medium;
  } else if (options.riskCategory === 'high') {
    riskCategory = RiskCategory.High;
  } else if (options.riskCategory === 'very-high') {
    riskCategory = RiskCategory.VeryHigh;
  } else {
    throw new Error('Invalid risk category');
  }

  const { response } = await cvg.protocol().addBaseAsset({
    authority: cvg.rpc().getDefaultFeePayer(),
    index: { value: baseAssets.length },
    ticker: options.ticker,
    riskCategory,
    priceOracle: {
      __kind: options.oracleKind,
      address: new PublicKey(options.oracleAddress),
    },
  });
  console.log('Tx:', response.signature);

  console.log('Success!');
};

const registerMint = async (options: Options) => {
  console.log('Registering mint...');
  const cvg = await createCvg(options);
  const mint = new PublicKey(options.mint);

  let args;
  if (options.baseAssetIndex >= 0) {
    args = {
      baseAssetIndex: options.baseAssetIndex,
      mint,
    };
  } else {
    args = {
      mint,
    };
  }

  const { response } = await cvg.protocol().registerMint(args);
  console.log('Tx:', response.signature);
  console.log('Success!');
};

const getRegisteredMints = async (options: Options) => {
  console.log('Getting registered mints...');
  const cvg = await createCvg(options);
  const mints = await cvg.protocol().getRegisteredMints();
  mints.map((x: any) => console.log('Mint:', x.address.toString()));
  console.log('Success!');
};

const getBaseAssets = async (options: Options) => {
  console.log('Getting base assets...');
  const cvg = await createCvg(options);
  const baseAssets = await cvg.protocol().getBaseAssets();
  baseAssets.map((baseAsset: BaseAsset) =>
    console.log('Ticker:', baseAsset.ticker.toString())
  );
  console.log('Success!');
};

const airdropDevnetTokens = async (options: Options) => {
  console.log('Airdropping devnet tokens...');
  const cvg = await createCvg(options);
  const owner = new PublicKey(options.owner);
  const { collateralWallet, registeredMintWallets } = await devnetAirdrops(
    cvg,
    owner
  );
  console.log('Collateral wallet:', collateralWallet.address.toString());
  registeredMintWallets.map((wallet: any) => {
    console.log('Registered mint wallet:', wallet.address.toString());
  });
  console.log('Success!');
};

/// CLI

const program = new Command();
program.name('convergence').version('4.0.8').description('Convergence RFQ CLI');

addDefaultArgs(
  program
    .command('airdrop')
    .description('Airdrops SOL to the current user')
    .option('--amount <value>', 'Amount to airdrop in SOL', '1')
    .action(airdrop)
);
addDefaultArgs(
  program
    .command('create-mint')
    .description('Creates mint')
    .requiredOption('--decimals <value>', 'Decimals')
    .action(createMint)
);
addDefaultArgs(
  program
    .command('create-wallet')
    .description('Creates wallet')
    .requiredOption('--owner <value>', 'Owner address')
    .requiredOption('--mint <value>', 'Mint address')
    .action(createWallet)
);
addDefaultArgs(
  program
    .command('mint-to')
    .description('Mints tokens to wallet')
    .requiredOption('--mint <value>', 'Mint address')
    .requiredOption('--wallet <value>', 'Wallet address')
    .requiredOption('--amount <value>', 'Mint amount')
    .action(mintTo)
);
addDefaultArgs(
  program
    .command('initialize-protocol')
    .description('Initializes protocol')
    .requiredOption('--collateral-mint <value>', 'Collateral mint address')
    .option('--maker-fee <value>', 'Maker fee')
    .option('--taker-fee <value>', 'Taker fee')
    .action(initializeProtocol)
);
addDefaultArgs(
  program
    .command('initialize-risk-engine')
    .description('Initializes risk engine')
    .action(initializeRiskEngine)
);
addDefaultArgs(
  program
    .command('set-risk-engine-instrument-type')
    .description('Sets risk engine instrument type')
    .option('--type <value>', 'Instrument type')
    .option('--program <value>', 'Instrument program')
    .action(setRiskEngineInstrumentType)
);
addDefaultArgs(
  program
    .command('set-risk-engine-risk-categories-info')
    .description('Sets risk engine risk categories info')
    .requiredOption('--category <value>', 'Category')
    .requiredOption('--new-value <value>', 'New value')
    .action(setRiskEngineCategoriesInfo)
);
addDefaultArgs(
  program
    .command('add-instrument')
    .description('Adds instrument')
    .option('--instrument-program <value>', 'Instrument program address')
    .option('--can-be-used-as-quote <value>', 'Can be used as quote')
    .option(
      '--validate-data-account-amount <value>',
      'Validate data account amount'
    )
    .option(
      '--prepare-to-settle-account-amount <value>',
      'Prepare to settle account amount'
    )
    .option('--settle-account-amount <value>', 'Settle account amount')
    .option(
      '--revert-preparation-account-amount <value>',
      'Revert preparation account amount'
    )
    .option('--clean-up-account-amount <value>', 'Clean up account amount')
    .action(addInstrument)
);
addDefaultArgs(
  program
    .command('add-base-asset')
    .description('Adds base asset')
    .requiredOption('--ticker <value>', 'Ticker')
    .requiredOption('--oracle-address <value>', 'Oracle address')
    .option('--oracle-kind <value>', 'Oracle kind', 'Switchboard')
    .option('--risk-category <value>', 'Risk category', 'very-low')
    .action(addBaseAsset)
);
addDefaultArgs(
  program
    .command('register-mint')
    .description('Registers mint')
    .requiredOption('--mint <value>', 'Mint address')
    .option('--base-asset-index <value>', 'Base asset index')
    .action(registerMint)
);
addDefaultArgs(
  program
    .command('get-registered-mints')
    .description('Get registered mints')
    .action(getRegisteredMints)
);
addDefaultArgs(
  program
    .command('get-base-assets')
    .description('Get base assets')
    .action(getBaseAssets)
);
addDefaultArgs(
  program
    .command('airdrop-devnet-tokens')
    .description('Airdrops devnet tokens')
    .requiredOption('--owner <value>', 'Owner address')
    .action(airdropDevnetTokens)
);

/// EXECUTE

program.parse();
