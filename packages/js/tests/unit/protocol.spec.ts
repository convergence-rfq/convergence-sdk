import { expect } from 'expect';

import {
  protocolCache,
  baseAssetsCache,
  registeredMintsCache,
  BaseAsset,
  Mint,
} from '../../src';
import { createUserCvg, generateTicker } from '../helpers';
import {
  COLLATERAL_MINT_PK,
  PYTH_SOL_ORACLE_PK,
  SWITCHBOARD_BTC_ORACLE_PK,
} from '../constants';

describe('unit.protocol', () => {
  const cvg = createUserCvg('dao');
  const userCvg = createUserCvg('taker');

  it('get', async () => {
    const protocol = await cvg.protocol().get();
    expect(protocol).toHaveProperty('address');
  });

  it('get cache', async () => {
    const protocol = await protocolCache.get(cvg);
    expect(protocol).toHaveProperty('address');
  });

  it('get pda [protocol]', async () => {
    const protocol = await cvg.protocol().get();
    const pda = cvg.protocol().pdas().protocol();
    expect(protocol.address).toEqual(pda);
  });

  it('get pda [base asset]', async () => {
    const baseAssetPda = cvg.protocol().pdas().baseAsset({ index: 0 });
    const baseAssets = await cvg.protocol().getBaseAssets();
    expect(baseAssets[0].index).toEqual(0);
    expect(baseAssetPda.toBase58()).toEqual(baseAssets[0].address.toBase58());
  });

  it('get base assets', async () => {
    const baseAssets = await cvg.protocol().getBaseAssets();
    expect(baseAssets.length).toBeGreaterThan(0);
  });

  it('get base assets cache', async () => {
    baseAssetsCache.clear();
    const baseAssets = await baseAssetsCache.get(cvg);
    expect(baseAssets.length).toBeGreaterThan(0);
  });

  it('get registered mints cache', async () => {
    registeredMintsCache.clear();
    const registeredMints = await registeredMintsCache.get(cvg);
    expect(registeredMints.length).toBeGreaterThan(0);
  });

  it('close', async () => {
    const { response } = await cvg.protocol().close();
    expect(response).toHaveProperty('signature');
  });

  it('initialize', async () => {
    const { protocol } = await cvg.protocol().initialize({
      collateralMint: COLLATERAL_MINT_PK,
    });
    expect(protocol.address).toEqual(cvg.protocol().pdas().protocol());
  });

  it('add instrument [spotInstrument]', async () => {
    const { response } = await cvg.protocol().addInstrument({
      authority: cvg.identity(),
      instrumentProgram: cvg.programs().getSpotInstrument().address,
      canBeUsedAsQuote: true,
      validateDataAccountAmount: 1,
      prepareToSettleAccountAmount: 7,
      settleAccountAmount: 5,
      revertPreparationAccountAmount: 3,
      cleanUpAccountAmount: 4,
    });
    expect(response).toHaveProperty('signature');
  });

  it('add instrument [psyoptionsEuropean]', async () => {
    const { response } = await cvg.protocol().addInstrument({
      authority: cvg.identity(),
      instrumentProgram: cvg.programs().getPsyoptionsEuropeanInstrument()
        .address,
      canBeUsedAsQuote: true,
      validateDataAccountAmount: 2,
      prepareToSettleAccountAmount: 7,
      settleAccountAmount: 3,
      revertPreparationAccountAmount: 3,
      cleanUpAccountAmount: 4,
    });
    expect(response).toHaveProperty('signature');
  });

  it('add instrument [psyoptionsAmerican]', async () => {
    const { response } = await cvg.protocol().addInstrument({
      authority: cvg.identity(),
      instrumentProgram: cvg.programs().getPsyoptionsAmericanInstrument()
        .address,
      canBeUsedAsQuote: true,
      validateDataAccountAmount: 3,
      prepareToSettleAccountAmount: 7,
      settleAccountAmount: 3,
      revertPreparationAccountAmount: 3,
      cleanUpAccountAmount: 4,
    });
    expect(response).toHaveProperty('signature');
  });

  it('add print trade provider [hxro]', async () => {
    const { response } = await cvg.protocol().addPrintTradeProvider({
      printTradeProviderProgram: cvg.programs().getHxroPrintTradeProvider()
        .address,
      settlementCanExpire: false,
      validateResponseAccountAmount: 2,
    });
    expect(response).toHaveProperty('signature');
  });

  it('add base asset [switchboard oracle]', async () => {
    const { response } = await cvg.protocol().addBaseAsset({
      authority: cvg.identity(),
      ticker: generateTicker(),
      riskCategory: 'very-low',
      oracleSource: 'switchboard',
      switchboardOracle: SWITCHBOARD_BTC_ORACLE_PK,
    });
    expect(response).toHaveProperty('signature');
  });

  it('add base asset [pyth oracle]', async () => {
    const { response } = await cvg.protocol().addBaseAsset({
      authority: cvg.identity(),
      ticker: generateTicker(),
      riskCategory: 'very-low',
      oracleSource: 'pyth',
      pythOracle: PYTH_SOL_ORACLE_PK,
    });
    expect(response).toHaveProperty('signature');
  });

  it('add base asset [in-place price]', async () => {
    const price = 101;
    const { response, baseAssetIndex } = await cvg.protocol().addBaseAsset({
      authority: cvg.identity(),
      ticker: generateTicker(),
      riskCategory: 'very-low',
      oracleSource: 'in-place',
      inPlacePrice: price,
    });
    expect(response).toHaveProperty('signature');

    const baseAssetPda = cvg
      .protocol()
      .pdas()
      .baseAsset({ index: baseAssetIndex });
    const baseAsset = await cvg
      .protocol()
      .findBaseAssetByAddress({ address: baseAssetPda });
    expect(baseAsset.inPlacePrice).toEqual(price);
  });

  it('change base asset parameters', async () => {
    const baseAssets: BaseAsset[] = await cvg.protocol().getBaseAssets();
    const baseAsset = baseAssets[0];
    const { response } = await cvg.protocol().changeBaseAssetParameters({
      index: 0,
      enabled: true,
      inPlacePrice: 42,
      strict: false,
    });
    expect(response).toHaveProperty('signature');

    const dataAfter = await cvg
      .protocol()
      .findBaseAssetByAddress({ address: baseAsset.address });
    expect(dataAfter?.inPlacePrice).toBe(42);
    expect(dataAfter?.strict).toBe(false);
  });

  it('register mint', async () => {
    const baseAssets: BaseAsset[] = await cvg.protocol().getBaseAssets();
    const baseAssetIndex = baseAssets[0].index;
    const { mint } = await cvg.tokens().createMint({ decimals: 3 });
    const { response } = await cvg.protocol().registerMint({
      baseAssetIndex,
      mint: mint.address,
    });
    expect(response).toHaveProperty('signature');
  });

  it('get registered mints', async () => {
    const registeredMints = await cvg.protocol().getRegisteredMints();
    expect(registeredMints.length).toBeGreaterThan(0);
  });

  it('find base asset by address', async () => {
    const baseAsset = await cvg.protocol().findBaseAssetByAddress({
      address: cvg.protocol().pdas().baseAsset({ index: 1 }),
    });
    expect(baseAsset).toHaveProperty('address');
  });

  it('add user asset', async () => {
    const { mint } = await cvg.tokens().createMint();
    const ticker = generateTicker();
    const { baseAssetIndex } = await cvg
      .protocol()
      .addUserAsset({ ticker, mint: mint.address });
    const address = cvg.protocol().pdas().baseAsset({ index: baseAssetIndex });
    const baseAsset: BaseAsset = await cvg
      .protocol()
      .findBaseAssetByAddress({ address });
    expect(baseAsset.ticker).toBe(ticker);
  });

  it('add several user assets', async () => {
    const mintResults = await Promise.all(
      new Array(5).fill(null).map(() => cvg.tokens().createMint())
    );
    for (const { mint } of mintResults) {
      const ticker = generateTicker();
      await cvg.protocol().addUserAsset({ ticker, mint: mint.address });
    }
  });
});
