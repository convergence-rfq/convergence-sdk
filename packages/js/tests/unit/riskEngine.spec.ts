import { expect } from 'expect';

import { InstrumentType, DEFAULT_RISK_CATEGORIES_INFO } from '../../src';
import { createUserCvg } from '../helpers';

describe('unit.riskEngine', () => {
  const daoCvg = createUserCvg('dao');
  const takerCvg = createUserCvg('taker');

  it('fetch config', async () => {
    const config = await daoCvg.riskEngine().fetchConfig();
    expect(config).toHaveProperty('address');
  });

  it('update config', async () => {
    const { config } = await daoCvg.riskEngine().updateConfig();
    expect(config).toHaveProperty('address');
  });

  it('close config', async () => {
    const { response } = await daoCvg.riskEngine().closeConfig();
    expect(response).toHaveProperty('signature');
  });

  it('initialize config', async () => {
    const { response } = await daoCvg.riskEngine().initializeConfig();
    expect(response).toHaveProperty('signature');
  });

  it('set instrument type [spot]', async () => {
    const { config } = await daoCvg.riskEngine().setInstrumentType({
      instrumentType: InstrumentType.Spot,
      instrumentProgram: daoCvg.programs().getSpotInstrument().address,
    });
    expect(config.address).toEqual(daoCvg.riskEngine().pdas().config());
  });

  it('set instrument type [american]', async () => {
    const { config } = await daoCvg.riskEngine().setInstrumentType({
      instrumentType: InstrumentType.Option,
      instrumentProgram: daoCvg.programs().getPsyoptionsAmericanInstrument()
        .address,
    });
    expect(config.address).toEqual(daoCvg.riskEngine().pdas().config());
  });

  it('set instrument type [european]', async () => {
    const { config } = await daoCvg.riskEngine().setInstrumentType({
      instrumentType: InstrumentType.Option,
      instrumentProgram: daoCvg.programs().getPsyoptionsEuropeanInstrument()
        .address,
    });
    expect(config.address).toEqual(daoCvg.riskEngine().pdas().config());
  });

  it('set risk categories info [very low]', async () => {
    const { config } = await daoCvg.riskEngine().setRiskCategoriesInfo({
      changes: [
        {
          value: DEFAULT_RISK_CATEGORIES_INFO.veryLow,
          category: 'very-low',
        },
      ],
    });
    expect(config.address).toEqual(daoCvg.riskEngine().pdas().config());
  });

  it('set risk categories info [low]', async () => {
    const { config } = await daoCvg.riskEngine().setRiskCategoriesInfo({
      changes: [
        {
          value: DEFAULT_RISK_CATEGORIES_INFO.low,
          category: 'low',
        },
      ],
    });
    expect(config.address).toEqual(daoCvg.riskEngine().pdas().config());
  });

  it('set risk categories info [medium]', async () => {
    const { config } = await daoCvg.riskEngine().setRiskCategoriesInfo({
      changes: [
        {
          value: DEFAULT_RISK_CATEGORIES_INFO.medium,
          category: 'medium',
        },
      ],
    });
    expect(config.address).toEqual(daoCvg.riskEngine().pdas().config());
  });

  it('set risk categories info [high]', async () => {
    const { config } = await daoCvg.riskEngine().setRiskCategoriesInfo({
      changes: [
        {
          value: DEFAULT_RISK_CATEGORIES_INFO.high,
          category: 'high',
        },
      ],
    });
    expect(config.address).toEqual(daoCvg.riskEngine().pdas().config());
  });

  it('set risk categories info [very high]', async () => {
    const { config } = await daoCvg.riskEngine().setRiskCategoriesInfo({
      changes: [
        {
          value: DEFAULT_RISK_CATEGORIES_INFO.veryHigh,
          category: 'very-high',
        },
      ],
    });
    expect(config.address).toEqual(daoCvg.riskEngine().pdas().config());
  });

  it('calculate collateral for RFQ', async () => {
    const rfqs = await takerCvg
      .rfqs()
      .findRfqsByOwner({ owner: takerCvg.identity().publicKey });
    const collateral = await daoCvg.riskEngine().calculateCollateralForRfq({
      legs: rfqs[0][0].legs,
      quoteAsset: rfqs[0][0].quoteAsset,
      settlementPeriod: rfqs[0][0].settlingWindow,
      fixedSize: rfqs[0][0].fixedSize,
      orderType: rfqs[0][0].orderType,
    });
    expect(collateral.requiredCollateral).toBeCloseTo(1650.0);
  });
});
