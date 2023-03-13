/* eslint-disable no-console */
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  RiskCategory,
  InstrumentType,
  BaseAsset,
  token,
  toRiskCategoryInfo,
  toScenario,
  devnetAirdrops,
  Rfq,
} from '@convergence-rfq/sdk';

import { createCvg, Opts } from './cvg';

export const airdrop = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const user = cvg.rpc().getDefaultFeePayer();
  const tx = await cvg.connection.requestAirdrop(
    user.publicKey,
    opts.amount * LAMPORTS_PER_SOL
  );
  await cvg.connection.confirmTransaction(tx);
  console.log('Tx:', tx);
};

export const createMint = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const user = cvg.rpc().getDefaultFeePayer();
  const { mint, response } = await cvg.tokens().createMint({
    mintAuthority: user.publicKey,
    decimals: opts.decimals,
  });
  console.log('Address:', mint.address.toString());
  console.log('Tx:', response.signature);
};

export const createWallet = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const { token: wallet, response } = await cvg.tokens().createToken({
    mint: new PublicKey(opts.mint),
    owner: new PublicKey(opts.owner),
  });
  console.log('Address:', wallet.address.toString());
  console.log('Tx:', response.signature);
};

export const mintTo = async (opts: Opts) => {
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

export const initializeProtocol = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const collateralMint = new PublicKey(opts.collateralMint);
  const { response } = await cvg.protocol().initialize({ collateralMint });
  console.log('Tx:', response.signature);
};

export const initializeRiskEngine = async (opts: Opts) => {
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

export const updateRiskEngine = async (opts: Opts) => {
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

export const addInstrument = async (opts: Opts) => {
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

export const setRiskEngineInstrumentType = async (opts: Opts) => {
  const getInstrumentType = (type: string) => {
    switch (type) {
      case 'spot':
        return InstrumentType.Spot;
      case 'option':
        return InstrumentType.Option;
      default:
        throw new Error('Invalid instrument type');
    }
  };

  const cvg = await createCvg(opts);
  const { response } = await cvg.riskEngine().setInstrumentType({
    instrumentProgram: new PublicKey(opts.program),
    instrumentType: getInstrumentType(opts.type),
  });

  console.log('Tx:', response.signature);
};

export const setRiskEngineCategoriesInfo = async (opts: Opts) => {
  const newValue = opts.newValue.split(',').map((x: string) => parseFloat(x));

  const getRiskCategoryIndex = (category: string) => {
    switch (category) {
      case 'very-low':
        return RiskCategory.VeryLow;
      case 'low':
        return RiskCategory.Low;
      case 'medium':
        return RiskCategory.Medium;
      case 'high':
        return RiskCategory.High;
      case 'very-high':
        return RiskCategory.VeryHigh;
      default:
        throw new Error('Invalid risk category');
    }
  };

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
        riskCategoryIndex: getRiskCategoryIndex(opts.category),
      },
    ],
  });

  console.log('Tx:', response.signature);
};

export const addBaseAsset = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const baseAssets = await cvg.protocol().getBaseAssets();

  const riskCategories: any = {
    low: RiskCategory.Low,
    medium: RiskCategory.Medium,
    high: RiskCategory.High,
  };
  riskCategories['very-low'] = RiskCategory.Low;
  riskCategories['very-high'] = RiskCategory.VeryHigh;

  const riskCategory = riskCategories[opts.riskCategory];
  if (!riskCategory) {
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

export const registerMint = async (opts: Opts) => {
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

export const getRegisteredMints = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const mints = await cvg.protocol().getRegisteredMints();
  mints.map((x: any) => console.log('Address:', x.address.toString()));
};

export const getBaseAssets = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const baseAssets = await cvg.protocol().getBaseAssets();
  baseAssets.map((baseAsset: BaseAsset) => {
    console.log('Address:', baseAsset.address.toString());
    console.log('Index:', baseAsset.index.value);
    console.log('Ticker:', baseAsset.ticker.toString());
    console.log('Oracle:', baseAsset.priceOracle.address.toString());
    console.log('Risk category:', parseInt(baseAsset.riskCategory.toString()));
  });
};

export const getProtocol = async (opts: Opts) => {
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

  for (let k = 0; k < p.instruments.length; k++) {
    const i = p.instruments[k];
    console.log('Instrument:', i.programKey.toString());
    console.log('Enabled:', i.enabled);
    console.log('Can be used as quote:', i.canBeUsedAsQuote);
    console.log('Validate data accounts:', i.validateDataAccountAmount);
    console.log('Prepare to settle accounts:', i.prepareToSettleAccountAmount);
    console.log('Settle accounts:', i.settleAccountAmount);
    console.log(
      'Revert preparation accounts:',
      i.revertPreparationAccountAmount
    );
    console.log('Clean up accounts:', i.cleanUpAccountAmount);
  }
};

export const getRfqs = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const rfqs: Rfq[] = await cvg.rfqs().findRfqs({ page: 0, pageCount: 10 });
  for (let i = 0; i < rfqs.length; i++) {
    const r = rfqs[i];
    console.log('Address:', r.address.toString());
  }
};

export const getRiskEngineConfig = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const r = await cvg.riskEngine().fetchConfig();
  console.log('Address:', r.address.toString());
  console.log(
    'Collateral for variable size RFQ creation:',
    r.collateralForVariableSizeRfqCreation.toString()
  );
  console.log(
    'Collateral for fixed quote amount RFQ creation:',
    r.collateralForFixedQuoteAmountRfqCreation.toString()
  );
  console.log('Collateral mint decimals:', r.collateralMintDecimals.toString());
  console.log(
    'Safety price shift factor:',
    r.safetyPriceShiftFactor.toString()
  );
  console.log('Overall safety factor:', r.overallSafetyFactor.toString());

  for (let i = 0; i < r.riskCategoriesInfo.length; i++) {
    const c = r.riskCategoriesInfo[i];
    console.log('Interest rate:', c.interestRate.toString());
    console.log(
      'Annualized 30 day volatility:',
      c.annualized30DayVolatility.toString()
    );
    console.log(
      `Scenario per settlement period (base asset price Δ/vol Δ): [${c.scenarioPerSettlementPeriod
        .map((x: any) => {
          return [x.baseAssetPriceChange, x.volatilityChange].join('/');
        })
        .join(', ')}]`
    );
  }
};

export const airdropDevnetTokens = async (opts: Opts) => {
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
