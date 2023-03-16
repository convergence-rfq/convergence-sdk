import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  token,
  toRiskCategoryInfo,
  toScenario,
  devnetAirdrops,
  legsToInstruments,
  SpotInstrument,
} from '@convergence-rfq/sdk';

import { createCvg, Opts } from './cvg';
import {
  getInstrumentType,
  getRiskCategory,
  getSide,
  getOrderType,
  getSize,
} from './helpers';
import {
  logPk,
  logResponse,
  logBaseAsset,
  logRfq,
  logProtocol,
  logInstrument,
  logTx,
  logError,
  logRiskEngineConfig,
  logRegisteredMint,
} from './logger';

// Utils

export const createMint = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const user = cvg.rpc().getDefaultFeePayer();
  const { mint, response } = await cvg.tokens().createMint({
    mintAuthority: user.publicKey,
    decimals: opts.decimals,
  });
  logPk(mint.address);
  logResponse(response);
};

export const createWallet = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const { token: wallet, response } = await cvg.tokens().createToken({
    mint: new PublicKey(opts.mint),
    owner: new PublicKey(opts.owner),
  });
  logPk(wallet.address);
  logResponse(response);
};

export const mintTo = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const user = cvg.rpc().getDefaultFeePayer();
  try {
    const { response } = await cvg.tokens().mint({
      mintAddress: new PublicKey(opts.mint),
      amount: token(opts.amount),
      toToken: new PublicKey(opts.wallet),
      mintAuthority: user.publicKey,
    });
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

// Protocol

export const initializeProtocol = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const collateralMint = new PublicKey(opts.collateralMint);
  const { response } = await cvg.protocol().initialize({ collateralMint });
  logResponse(response);
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
  logResponse(response);
};

const capitalize = (input: string) =>
  input.charAt(0).toUpperCase() + input.slice(1);

export const addBaseAsset = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const baseAssets = await cvg.protocol().getBaseAssets();
  const riskCategory = getRiskCategory(opts.riskCategory);
  const { response } = await cvg.protocol().addBaseAsset({
    authority: cvg.rpc().getDefaultFeePayer(),
    index: { value: baseAssets.length },
    ticker: opts.ticker,
    riskCategory,
    priceOracle: {
      // @ts-ignore
      __kind: capitalize(opts.oracleKind),
      address: new PublicKey(opts.oracleAddress),
    },
  });
  logResponse(response);
};

export const registerMint = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const getMintArgs = () => {
    const mint = new PublicKey(opts.mint);
    return opts.baseAssetIndex >= 0
      ? { baseAssetIndex: opts.baseAssetIndex, mint }
      : { mint };
  };
  const { response } = await cvg.protocol().registerMint(getMintArgs());
  logResponse(response);
};

export const getRegisteredMints = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const mints = await cvg.protocol().getRegisteredMints();
  mints.map(logRegisteredMint);
};

export const getBaseAssets = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const baseAssets = await cvg.protocol().getBaseAssets();
  baseAssets.map(logBaseAsset);
};

export const getProtocol = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const protocol = await cvg.protocol().get();
  logProtocol(protocol);
};

// Rfqs

export const getAllRfqs = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  // NOTE: Paging is not implemented yet
  const rfqs = await cvg.rfqs().findRfqs({ page: 0, pageCount: 10 });
  rfqs.map(logRfq);
};

export const getActiveRfqs = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  // NOTE: Paging is not implemented yet
  const rfqs = await cvg.rfqs().findRfqsByActive({});
  rfqs.map((r) => r.map(logRfq));
};

export const getRfq = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const rfq = await cvg
    .rfqs()
    .findRfqByAddress({ address: new PublicKey(opts.address) });
  logRfq(rfq);
  const legs = await legsToInstruments(cvg, rfq.legs);
  legs.map(logInstrument);
};

export const createRfq = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const [baseMint, quoteMint] = await Promise.all([
    cvg.tokens().findMintByAddress({ address: new PublicKey(opts.baseMint) }),
    cvg.tokens().findMintByAddress({ address: new PublicKey(opts.quoteMint) }),
  ]);
  const { rfq, response } = await cvg.rfqs().createAndFinalize({
    instruments: [
      new SpotInstrument(cvg, baseMint, {
        amount: opts.amount,
        side: getSide(opts.side),
      }),
    ],
    taker: cvg.rpc().getDefaultFeePayer(),
    orderType: getOrderType(opts.orderType),
    fixedSize: getSize(opts.size),
    quoteAsset: new SpotInstrument(cvg, quoteMint).toQuoteAsset(),
    activeWindow: opts.activeWindow,
    settlingWindow: opts.settlingWindow,
  });
  logPk(rfq.address);
  logResponse(response);
};

// Collateral

export const initializeCollateralAccount = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const { collateral, response } = await cvg.collateral().initialize({});
  logPk(collateral.address);
  logResponse(response);
};

export const fundCollateralAccount = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const { response } = await cvg.collateral().fund({ amount: opts.amount });
  logResponse(response);
};

// Risk engine

export const initializeRiskEngine = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const { response } = await cvg.riskEngine().initializeConfig({
    collateralMintDecimals: opts.collateralMintDecimals,
    collateralForVariableSizeRfqCreation:
      opts.collateralForVariableSizeRfqCreation,
    collateralForFixedQuoteAmountRfqCreation:
      opts.collateralForFixedQuoteAmountRfqCreation,
    safetyPriceShiftFactor: opts.safetyPriceShiftFactor,
    overallSafetyFactor: opts.overallSafetyFace,
  });
  logResponse(response);
};

export const updateRiskEngine = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const { response } = await cvg.riskEngine().updateConfig({
    collateralMintDecimals: opts.collateralMintDecimals,
    collateralForVariableSizeRfqCreation:
      opts.collateralForVariableSizeRfqCreation,
    collateralForFixedQuoteAmountRfqCreation:
      opts.collateralForFixedQuoteAmountRfqCreation,
    safetyPriceShiftFactor: opts.safetyPriceShiftFactor,
    overallSafetyFactor: opts.overallSafetyFace,
  });
  logResponse(response);
};

export const getRiskEngineConfig = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const config = await cvg.riskEngine().fetchConfig();
  logRiskEngineConfig(config);
};

export const setRiskEngineInstrumentType = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const { response } = await cvg.riskEngine().setInstrumentType({
    instrumentProgram: new PublicKey(opts.program),
    instrumentType: getInstrumentType(opts.type),
  });
  logResponse(response);
};

export const setRiskEngineCategoriesInfo = async (opts: Opts) => {
  const newValue = opts.newValue.split(',').map((x: string) => parseFloat(x));
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
        riskCategoryIndex: getRiskCategory(opts.category),
      },
    ],
  });
  logResponse(response);
};

// Devnet and localnet helpers

export const airdrop = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const user = cvg.rpc().getDefaultFeePayer();
  const tx = await cvg.connection.requestAirdrop(
    user.publicKey,
    opts.amount * LAMPORTS_PER_SOL
  );
  await cvg.connection.confirmTransaction(tx);
  logTx(tx);
};

export const airdropDevnetTokens = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const owner = new PublicKey(opts.owner);
  const { collateralWallet, registeredMintWallets } = await devnetAirdrops(
    cvg,
    owner
  );
  logPk(collateralWallet.address);
  registeredMintWallets.map((wallet: any) => logPk(wallet.address));
};
