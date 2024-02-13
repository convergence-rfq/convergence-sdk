import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  token,
  toRiskCategoryInfo,
  toScenario,
  devnetAirdrops,
  PriceOracle,
  SpotLegInstrument,
  SpotQuoteInstrument,
  addBaseAssetBuilder,
  registerMintBuilder,
  TransactionBuilder,
} from '@convergence-rfq/sdk';

import { createCvg, Opts } from './cvg';
import { getInstrumentType, getSigConfirmation, getSize } from './helpers';
import {
  logPk,
  logResponse,
  logBaseAsset,
  logRfq,
  logProtocol,
  // logInstrument,
  logTx,
  logError,
  logTokenAccount,
  logRiskEngineConfig,
  logRegisteredMint,
  logCollateral,
  logToken,
  logMint,
} from './logger';
import { CoinGeckoResponse, JupTokenList } from './types';

export const createMint = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const { mint, response } = await cvg.tokens().createMint({
      mintAuthority: cvg.rpc().getDefaultFeePayer().publicKey,
      decimals: opts.decimals,
    });
    logPk(mint.address);
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

export const getMint = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const mint = await cvg.tokens().findMintByAddress({
      address: new PublicKey(opts.address),
    });
    logMint(mint);
  } catch (e) {
    logError(e);
  }
};

export const createWallet = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const { token: wallet, response } = await cvg.tokens().createToken({
      mint: new PublicKey(opts.mint),
      owner: new PublicKey(opts.owner),
    });
    logPk(wallet.address);
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

export const getWallet = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const token = await cvg.tokens().findTokenByAddress({
      address: new PublicKey(opts.address),
    });
    logToken(token);
  } catch (e) {
    logError(e);
  }
};

export const mintTo = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const { response } = await cvg.tokens().mint({
      mintAddress: new PublicKey(opts.mint),
      amount: token(opts.amount),
      toToken: new PublicKey(opts.wallet),
      mintAuthority: cvg.rpc().getDefaultFeePayer().publicKey,
    });
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

export const initializeProtocol = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const { response, protocol } = await cvg.protocol().initialize({
      collateralMint: new PublicKey(opts.collateralMint),
      protocolTakerFee: opts.protocolTakerFee,
      protocolMakerFee: opts.protocolMakerFee,
      settlementTakerFee: opts.settlementTakerFee,
      settlementMakerFee: opts.settlementMakerFee,
    });
    logPk(protocol.address);
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

export const addInstrument = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
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
  } catch (e) {
    logError(e);
  }
};

export const addBaseAsset = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const baseAssets = await cvg.protocol().getBaseAssets();
    const { oracleSource } = opts;

    let priceOracle: PriceOracle;
    if (oracleSource === 'in-place') {
      priceOracle = {
        source: 'in-place',
        price: opts.oraclePrice,
      };
    } else {
      priceOracle = {
        source: oracleSource,
        address: new PublicKey(opts.oracleAddress),
      };
    }

    const { response } = await cvg.protocol().addBaseAsset({
      authority: cvg.rpc().getDefaultFeePayer(),
      index: baseAssets.length,
      ticker: opts.ticker,
      riskCategory: opts.riskCategory,
      priceOracle,
    });
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

export const updateBaseAsset = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const {
    enabled,
    index,
    oracleSource,
    oraclePrice,
    oracleAddress,
    riskCategory,
  } = opts;
  if (!oraclePrice && !oracleAddress) {
    throw new Error('Either oraclePrice or oracleAddress must be provided');
  }
  if (!riskCategory) {
    throw new Error('riskCategory must be provided');
  }
  try {
    const { response } = await cvg.protocol().updateBaseAsset({
      authority: cvg.rpc().getDefaultFeePayer(),
      enabled,
      index,
      priceOracle: {
        source: oracleSource,
        price: oraclePrice,
        address: oracleAddress ? new PublicKey(opts.oracleAddress) : undefined,
      },
      riskCategory,
    });
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

export const registerMint = async (opts: Opts) => {
  const getMintArgs = () => {
    const mint = new PublicKey(opts.mint);
    return opts.baseAssetIndex >= 0
      ? { baseAssetIndex: opts.baseAssetIndex, mint }
      : { mint };
  };
  const cvg = await createCvg(opts);
  try {
    const { response } = await cvg.protocol().registerMint(getMintArgs());
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

export const getRegisteredMints = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const mints = await cvg.protocol().getRegisteredMints();
    mints.map(logRegisteredMint);
  } catch (e) {
    logError(e);
  }
};

export const getBaseAssets = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const baseAssets = await cvg.protocol().getBaseAssets();
    baseAssets.map(logBaseAsset);
  } catch (e) {
    logError(e);
  }
};

export const closeProtocol = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const { response } = await cvg.protocol().close();
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

export const getProtocol = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const protocol = await cvg.protocol().get();
    logProtocol(protocol);
  } catch (e) {
    logError(e);
  }
};

// Rfqs

export const getAllRfqs = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    // NOTE: Paging is not implemented yet
    const pages = await cvg.rfqs().findRfqs({ chunkSize: 10 }).promise();
    const rfqs = pages.flat();
    rfqs.map(logRfq);
  } catch (e) {
    logError(e);
  }
};

export const getActiveRfqs = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    // NOTE: Paging is not implemented yet
    const pages = await cvg.rfqs().findRfqs({}).promise();
    const rfqs = pages.flat();
    rfqs
      .filter((r: any) => r.state === 'active')
      .sort((a: any, b: any) => {
        const aTimeToExpiry = a.creationTimestamp + a.activeWindow;
        const bTimeToExpiry = b.creationTimestamp + b.activeWindow;
        return aTimeToExpiry - bTimeToExpiry;
      })
      .forEach((r: any) => r.map(logRfq));
  } catch (e) {
    logError(e);
  }
};

export const getRfq = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const rfq = await cvg
      .rfqs()
      .findRfqByAddress({ address: new PublicKey(opts.address) });
    logRfq(rfq);
    // rfq.legs.map(logInstrument);
  } catch (e) {
    logError(e);
  }
};

export const createRfq = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  const [baseMint, quoteMint] = await Promise.all([
    cvg.tokens().findMintByAddress({ address: new PublicKey(opts.baseMint) }),
    cvg.tokens().findMintByAddress({ address: new PublicKey(opts.quoteMint) }),
  ]);

  try {
    const quoteAsset = await SpotQuoteInstrument.create(cvg, quoteMint);
    const { rfq, response } = await cvg.rfqs().createAndFinalize({
      instruments: [
        await SpotLegInstrument.create(cvg, baseMint, opts.amount, 'long'),
      ],
      taker: cvg.rpc().getDefaultFeePayer(),
      orderType: opts.orderType,
      fixedSize: getSize(opts.size, opts.amount),
      quoteAsset,
      activeWindow: parseInt(opts.activeWindow),
      settlingWindow: parseInt(opts.settlingWindow),
      collateralInfo: new PublicKey(opts.collateralInfo),
      collateralToken: new PublicKey(opts.collateralToken),
    });
    logPk(rfq.address);
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

export const initializeCollateral = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const { collateral, response } = await cvg.collateral().initialize({});
    const tokenAccount = cvg
      .collateral()
      .pdas()
      .collateralToken({ user: cvg.rpc().getDefaultFeePayer().publicKey });
    logPk(collateral.address);
    logTokenAccount(tokenAccount);
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

export const fundCollateral = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const { response } = await cvg.collateral().fund({ amount: opts.amount });
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

export const getCollateral = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const collateral = await cvg
      .collateral()
      .findByUser({ user: new PublicKey(opts.user) });
    logCollateral(collateral);
  } catch (e) {
    logError(e);
  }
};

// Risk engine

export const initializeRiskEngine = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const { response } = await cvg.riskEngine().initializeConfig({
      collateralMintDecimals: opts.collateralMintDecimals,
      minCollateralRequirement: opts.minCollateralRequirement,
      collateralForFixedQuoteAmountRfqCreation:
        opts.collateralForFixedQuoteAmountRfqCreation,
      safetyPriceShiftFactor: opts.safetyPriceShiftFactor,
      overallSafetyFactor: opts.overallSafetyFace,
      acceptedOracleStaleness: opts.acceptedOracleStaleness,
      acceptedOracleConfidenceIntervalPortion:
        opts.acceptedOracleConfidenceIntervalPortion,
    });
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

export const updateRiskEngine = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const { response } = await cvg.riskEngine().updateConfig({
      collateralMintDecimals: opts.collateralMintDecimals,
      minCollateralRequirement: opts.minCollateralRequirement,
      collateralForFixedQuoteAmountRfqCreation:
        opts.collateralForFixedQuoteAmountRfqCreation,
      safetyPriceShiftFactor: opts.safetyPriceShiftFactor,
      overallSafetyFactor: opts.overallSafetyFace,
      acceptedOracleStaleness: opts.acceptedOracleStaleness,
      acceptedOracleConfidenceIntervalPortion:
        opts.acceptedOracleConfidenceIntervalPortion,
    });
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};
export const closeRiskEngine = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const { response } = await cvg.riskEngine().closeConfig();
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

export const getRiskEngineConfig = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const config = await cvg.riskEngine().fetchConfig();
    logRiskEngineConfig(config);
  } catch (e) {
    logError(e);
  }
};

export const setRiskEngineInstrumentType = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const { response } = await cvg.riskEngine().setInstrumentType({
      instrumentProgram: new PublicKey(opts.program),
      instrumentType: getInstrumentType(opts.type),
    });
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

export const setRiskEngineCategoriesInfo = async (opts: Opts) => {
  const newValue = opts.newValue.split(',').map((x: string) => parseFloat(x));
  const cvg = await createCvg(opts);
  try {
    const { response } = await cvg.riskEngine().setRiskCategoriesInfo({
      changes: [
        {
          value: toRiskCategoryInfo(newValue[0], newValue[1], [
            toScenario(newValue[2], newValue[3]),
            toScenario(newValue[4], newValue[5]),
            toScenario(newValue[6], newValue[7]),
            toScenario(newValue[8], newValue[9]),
            toScenario(newValue[10], newValue[11]),
            toScenario(newValue[12], newValue[13]),
          ]),
          category: opts.category,
        },
      ],
    });
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

// Devnet and localnet helpers

export const airdrop = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const tx = await cvg.connection.requestAirdrop(
      cvg.rpc().getDefaultFeePayer().publicKey,
      opts.amount * LAMPORTS_PER_SOL
    );
    await cvg.connection.confirmTransaction(tx);
    logTx(tx);
  } catch (e) {
    logError(e);
  }
};

export const airdropDevnetTokens = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const { collateralWallet, registeredMintWallets } = await devnetAirdrops(
      cvg,
      new PublicKey(opts.owner)
    );
    logPk(collateralWallet.address);
    registeredMintWallets.map((wallet: any) => logPk(wallet.address));
  } catch (e) {
    logError(e);
  }
};

export const addBaseAssetsFromJupiter = async (opts: Opts) => {
  try {
    const cvg = await createCvg(opts);

    const baseAssets = await cvg.protocol().getBaseAssets();
    // eslint-disable-next-line no-console
    console.log('Base assets:', baseAssets);
    const baseAssetsSymbols = baseAssets.map((b) => b.ticker);
    const res = await fetch('https://token.jup.ag/all');
    const jupTokens: JupTokenList[] = await res.json();
    const jupTokensToAdd = jupTokens.filter(
      (t) => !baseAssetsSymbols.includes(t.symbol)
    );
    let baseAssetIndexToStart = Math.max(...baseAssets.map((b) => b.index)) + 1;
    // eslint-disable-next-line no-console
    console.log('last baseAssetIndex', baseAssetIndexToStart - 1);
    for (const token of jupTokensToAdd) {
      try {
        const coingeckoId = token?.extensions?.coingeckoId;
        if (!coingeckoId || coingeckoId === '') {
          // eslint-disable-next-line no-console
          console.log(
            'skipping token: because missing coingecko id',
            token.symbol
          );
          continue;
        }
        const coinGeckoAPIKey = opts.coinGeckoApiKey;
        const tokenPriceResponse = await fetch(
          `https://pro-api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd&x_cg_pro_api_key=${coinGeckoAPIKey}`
        );
        const tokenPriceJson: CoinGeckoResponse =
          await tokenPriceResponse.json();

        const tokenPrice = tokenPriceJson[coingeckoId]?.usd;
        if (!tokenPrice) {
          // eslint-disable-next-line no-console
          console.log(
            'skipping token: because missing price',
            token.symbol,
            tokenPrice
          );
          continue;
        }
        // eslint-disable-next-line no-console
        console.log('Adding token:', token.symbol, 'with price:', tokenPrice);

        //mint should already exists on mainnet
        const addBaseAssetTxBuilder = addBaseAssetBuilder(cvg, {
          authority: cvg.rpc().getDefaultFeePayer(),
          ticker: token.symbol,
          riskCategory: 'high',
          index: baseAssetIndexToStart,
          priceOracle: {
            source: 'in-place',
            price: tokenPrice,
          },
        });
        // eslint-disable-next-line no-console
        console.log('Adding base asset:', token.symbol);
        // eslint-disable-next-line no-console
        console.log(' current baseAssetIndex:', baseAssetIndexToStart);
        const registerMintTxBuilder = await registerMintBuilder(cvg, {
          mint: new PublicKey(token.address),
          baseAssetIndex: baseAssetIndexToStart,
        });

        const mergedTxBuiler = TransactionBuilder.make()
          .setFeePayer(cvg.rpc().getDefaultFeePayer())
          .add(addBaseAssetTxBuilder)
          .add(registerMintTxBuilder);
        const output = await mergedTxBuiler.sendAndConfirm(cvg);
        logResponse(output.response);

        const signatureStatus = await getSigConfirmation(
          cvg.connection,
          output.response.signature
        );
        const { commitment } = cvg.connection;
        if (signatureStatus && signatureStatus === commitment) {
          // eslint-disable-next-line no-console
          console.log('Transaction confirmed');
          baseAssetIndexToStart++;
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log('error:', e);
        continue;
      }
    }
  } catch (e) {
    logError(e);
  }
};
