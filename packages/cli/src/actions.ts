import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  token,
  devnetAirdrops,
  SpotLegInstrument,
  SpotQuoteInstrument,
  isRiskCategory,
  isOracleSource,
  addBaseAssetBuilder,
  registerMintBuilder,
  TransactionBuilder,
} from '@convergence-rfq/sdk';

import { createCvg, Opts } from './cvg';
import {
  fetchBirdeyeTokenPrice,
  fetchCoinGeckoTokenPrice,
  extractBooleanString,
  getSigConfirmation,
  getSize,
  expirationRetry,
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
  logTokenAccount,
  logRegisteredMint,
  logCollateral,
  logToken,
  logMint,
} from './logger';
import { JupTokenList } from './types';

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
    const { response, protocol } = await expirationRetry(
      () =>
        cvg.protocol().initialize({
          collateralMint: new PublicKey(opts.collateralMint),
          protocolTakerFee: opts.protocolTakerFee,
          protocolMakerFee: opts.protocolMakerFee,
          settlementTakerFee: opts.settlementTakerFee,
          settlementMakerFee: opts.settlementMakerFee,
          addAssetFee: Number(opts.addAssetFee),
        }),
      opts
    );
    logPk(protocol.address);
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

export const addInstrument = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const { response } = await expirationRetry(
      () =>
        cvg.protocol().addInstrument({
          authority: cvg.rpc().getDefaultFeePayer(),
          instrumentProgram: new PublicKey(opts.instrumentProgram),
          canBeUsedAsQuote: extractBooleanString(opts, 'canBeUsedAsQuote'),
          validateDataAccountAmount: opts.validateDataAccountAmount,
          prepareToSettleAccountAmount: opts.prepareToSettleAccountAmount,
          settleAccountAmount: opts.settleAccountAmount,
          revertPreparationAccountAmount: opts.revertPreparationAccountAmount,
          cleanUpAccountAmount: opts.cleanUpAccountAmount,
        }),
      opts
    );

    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

export const addPrintTradeProvider = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const { response } = await expirationRetry(
      () =>
        cvg.protocol().addPrintTradeProvider({
          printTradeProviderProgram: new PublicKey(
            opts.printTradeProviderProgram
          ),
          settlementCanExpire: extractBooleanString(
            opts,
            'settlementCanExpire'
          ),
          validateResponseAccountAmount: opts.validateResponseAccountAmount,
        }),
      opts
    );
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

export const addBaseAsset = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const { response } = await cvg.protocol().addBaseAsset({
      authority: cvg.rpc().getDefaultFeePayer(),
      index: opts.index && Number(opts.index),
      ticker: opts.ticker,
      riskCategory: opts.riskCategory,
      oracleSource: opts.oracleSource,
      inPlacePrice: opts.inPlacePrice && Number(opts.inPlacePrice),
      pythOracle: opts.pythAddress && new PublicKey(opts.pythAddress),
      switchboardOracle:
        opts.switchboardAddress && new PublicKey(opts.switchboardAddress),
    });
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

export const changeBaseAssetParameters = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const {
      index,
      enabled: enabledOpts,
      riskCategory,
      oracleSource,
      switchboardOracle: switchboardOracleOpts,
      pythOracle: pythOracleOpts,
      inPlacePrice: inPlacePriceOpts,
      strict: strictOpts,
    }: {
      index: string;
      enabled?: string;
      riskCategory?: string;
      oracleSource?: string;
      switchboardOracle?: string;
      pythOracle?: string;
      inPlacePrice?: string;
      strict?: string;
    } = opts;

    const parseBool = (value: string | undefined, name: string) => {
      switch (value) {
        case undefined:
          return undefined;
        case 'true':
          return true;
        case 'false':
          return false;
        default:
          throw new Error(`Unrecognized ${name} parameter!`);
      }
    };
    const enabled = parseBool(enabledOpts, 'enabled');
    const strict = parseBool(strictOpts, 'strict');

    if (riskCategory !== undefined && !isRiskCategory(riskCategory)) {
      throw new Error('Unrecognized risk category parameter!');
    }

    if (oracleSource !== undefined && !isOracleSource(oracleSource)) {
      throw new Error('Unrecognized oracle source parameter!');
    }

    let switchboardOracle;
    if (switchboardOracleOpts === 'none') {
      switchboardOracle = null;
    } else if (typeof switchboardOracleOpts === 'string') {
      switchboardOracle = new PublicKey(switchboardOracleOpts);
    }

    let pythOracle;
    if (pythOracleOpts === 'none') {
      pythOracle = null;
    } else if (typeof pythOracleOpts === 'string') {
      pythOracle = new PublicKey(pythOracleOpts);
    }

    let inPlacePrice;
    if (inPlacePriceOpts !== undefined) {
      inPlacePrice = Number(inPlacePriceOpts);
      if (inPlacePrice === -1) {
        inPlacePrice = null;
      }
    }

    const { response } = await cvg.protocol().changeBaseAssetParameters({
      index: Number(index),
      enabled,
      riskCategory,
      oracleSource,
      switchboardOracle,
      pythOracle,
      inPlacePrice,
      strict,
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
    const { response } = await expirationRetry(
      () => cvg.protocol().registerMint(getMintArgs()),
      opts
    );
    logResponse(response);
  } catch (e) {
    logError(e);
  }
};

export const addUserAsset = async (opts: Opts) => {
  const cvg = await createCvg(opts);
  try {
    const { response } = await expirationRetry(
      () =>
        cvg.protocol().addUserAsset({
          mint: new PublicKey(opts.mint),
          ticker: opts.ticker,
        }),
      opts
    );
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
    rfq.legs.map(logInstrument);
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
    const { birdeyeApiKey, coinGeckoApiKey } = opts;
    const baseAssets = await cvg.protocol().getBaseAssets();
    const registerMints = await cvg.protocol().getRegisteredMints();
    // eslint-disable-next-line no-console
    console.log('Base assets:', baseAssets);
    const baseAssetsSymbols = baseAssets.map((b) => b.ticker);
    const registerMintAddresses = registerMints.map((r) =>
      r.mintAddress.toBase58()
    );
    const baseAssetAddresses = baseAssets.map((b) => b.address.toBase58());
    const res = await fetch('https://token.jup.ag/all');
    const jupTokens: JupTokenList[] = await res.json();
    const jupTokensToAdd = jupTokens.filter(
      (t) =>
        !baseAssetsSymbols.includes(t.symbol) &&
        !baseAssetAddresses.includes(t.address) &&
        !registerMintAddresses.includes(t.address.toString())
    );

    for (const token of jupTokensToAdd) {
      try {
        const coingeckoId = token?.extensions?.coingeckoId;
        let tokenPrice: number | undefined = undefined;
        if (coingeckoId && coingeckoId !== '') {
          tokenPrice = await fetchCoinGeckoTokenPrice(
            coinGeckoApiKey,
            coingeckoId
          );
          if (!tokenPrice) {
            tokenPrice = await fetchBirdeyeTokenPrice(
              opts.birdeyeAPIKey,
              token.address
            );
          }
        } else {
          tokenPrice = await fetchBirdeyeTokenPrice(
            birdeyeApiKey,
            token.address
          );
        }

        if (tokenPrice === undefined) {
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
        const { builder: addBaseAssetTxBuilder, baseAssetIndex } =
          await addBaseAssetBuilder(cvg, {
            authority: cvg.rpc().getDefaultFeePayer(),
            ticker: token.symbol,
            riskCategory: 'high',
            oracleSource: 'in-place',
            inPlacePrice: tokenPrice,
          });
        // eslint-disable-next-line no-console
        console.log('Adding base asset:', token.symbol);
        const registerMintTxBuilder = await registerMintBuilder(cvg, {
          mint: new PublicKey(token.address),
          baseAssetIndex,
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
