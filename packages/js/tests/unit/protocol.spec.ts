import { expect } from 'expect';

import {
  protocolCache,
  baseAssetsCache,
  registeredMintsCache,
  toPriceOracle,
  BaseAsset,
} from '../../src';
import { createUserCvg, generateTicker } from '../helpers';
import {
  COLLATERAL_MINT_PK,
  PYTH_SOL_ORACLE_PK,
  SWITCHBOARD_BTC_ORACLE_PK,
} from '../constants';

describe('unit.protocol', () => {
  const cvg = createUserCvg('dao');

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
    const baseAssets = await cvg.protocol().getBaseAssets();
    const { response } = await cvg.protocol().addBaseAsset({
      authority: cvg.identity(),
      index: baseAssets.length + 1,
      ticker: generateTicker(),
      riskCategory: 'very-low',
      priceOracle: {
        source: 'switchboard',
        address: SWITCHBOARD_BTC_ORACLE_PK,
      },
    });
    expect(response).toHaveProperty('signature');
  });

  it('add base asset [pyth oracle]', async () => {
    const baseAssets = await cvg.protocol().getBaseAssets();
    const { response } = await cvg.protocol().addBaseAsset({
      authority: cvg.identity(),
      index: baseAssets.length + 1,
      ticker: generateTicker(),
      riskCategory: 'very-low',
      priceOracle: {
        source: 'pyth',
        address: PYTH_SOL_ORACLE_PK,
      },
    });
    expect(response).toHaveProperty('signature');
  });

  it('add base asset [in-place price]', async () => {
    let baseAssets = await cvg.protocol().getBaseAssets();
    const index = baseAssets.length + 1;
    const price = 101;
    const { response } = await cvg.protocol().addBaseAsset({
      authority: cvg.identity(),
      index,
      ticker: generateTicker(),
      riskCategory: 'very-low',
      priceOracle: {
        source: 'in-place',
        price,
      },
    });
    expect(response).toHaveProperty('signature');

    const baseAssetPda = cvg.protocol().pdas().baseAsset({ index });
    baseAssets = await cvg.protocol().getBaseAssets();
    expect(baseAssets[baseAssets.length - 1].address.toBase58()).toBe(
      baseAssetPda.toBase58()
    );

    const baseAsset = await cvg
      .protocol()
      .findBaseAssetByAddress({ address: baseAssetPda });
    expect(toPriceOracle(baseAsset).price).toEqual(price);
  });

  it('change base asset parameters', async () => {
    const { response } = await cvg.protocol().changeBaseAssetParameters({
      index: 0,
      enabled: true,
      inPlacePrice: 42,
    });
    expect(response).toHaveProperty('signature');

    const baseAssets: BaseAsset[] = await cvg.protocol().getBaseAssets();
    const baseAsset = baseAssets.find((x) => x.index === 0);
    expect(baseAsset?.inPlacePrice).toBe(42);
  });

  it('register mint', async () => {
    const { mint } = await cvg.tokens().createMint({ decimals: 3 });
    const { response } = await cvg.protocol().registerMint({
      baseAssetIndex: 1,
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
});
