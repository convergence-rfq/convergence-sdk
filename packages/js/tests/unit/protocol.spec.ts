import { expect } from 'expect';

import {
  protocolCache,
  PsyoptionsEuropeanInstrument,
  RiskCategory,
} from '../../src';
import { createUserCvg } from '../helpers';
import { COLLATERAL_MINT_PK, SWITCHBOARD_SOL_ORACLE_PK } from '../constants';

describe('protocol', () => {
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
    const baseAssetPda = cvg
      .protocol()
      .pdas()
      .baseAsset({ index: { value: 0 } });
    const baseAssets = await cvg.protocol().getBaseAssets();
    expect(baseAssetPda.toBase58()).toEqual(baseAssets[0].address.toBase58());
  });

  it('get base assets', async () => {
    const baseAssets = await cvg.protocol().getBaseAssets();
    expect(baseAssets.length).toBeGreaterThan(0);
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

  it('add instrument [spot]', async () => {
    const { response } = await cvg.protocol().addInstrument({
      authority: cvg.identity(),
      instrumentProgram: cvg.programs().getSpotInstrument().address,
      canBeUsedAsQuote: true,
      validateDataAccountAmount: 1,
      prepareToSettleAccountAmount: 7,
      settleAccountAmount: 3,
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

  it('add base asset', async () => {
    const baseAssets = await cvg.protocol().getBaseAssets();
    const { response } = await cvg.protocol().addBaseAsset({
      authority: cvg.identity(),
      index: { value: baseAssets.length },
      ticker: 'GOD',
      riskCategory: RiskCategory.VeryLow,
      priceOracle: {
        __kind: 'Switchboard',
        address: SWITCHBOARD_SOL_ORACLE_PK,
      },
    });
    expect(response).toHaveProperty('signature');
  });

  it('register mint', async () => {
    const { mint } = await cvg.tokens().createMint({ decimals: 3 });
    const { response } = await cvg.protocol().registerMint({
      baseAssetIndex: 0,
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
      address: cvg
        .protocol()
        .pdas()
        .baseAsset({ index: { value: 0 } }),
    });
    expect(baseAsset).toHaveProperty('address');
  });
});
