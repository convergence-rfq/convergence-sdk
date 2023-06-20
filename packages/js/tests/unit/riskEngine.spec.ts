import { expect } from 'expect';

import { InstrumentType, DEFAULT_RISK_CATEGORIES_INFO } from '../../src';
import { createUserCvg } from '../helpers';

describe('unit.riskEngine', () => {
  const cvg = createUserCvg('dao');

  it('fetch config', async () => {
    const config = await cvg.riskEngine().fetchConfig();
    expect(config).toHaveProperty('address');
  });

  it('update config', async () => {
    const { config } = await cvg.riskEngine().updateConfig();
    expect(config).toHaveProperty('address');
  });

  it('close config', async () => {
    const { response } = await cvg.riskEngine().closeConfig();
    expect(response).toHaveProperty('signature');
  });

  it('initialize config', async () => {
    const { response } = await cvg.riskEngine().initializeConfig();
    expect(response).toHaveProperty('signature');
  });

  it('set instrument type [spot]', async () => {
    const { config } = await cvg.riskEngine().setInstrumentType({
      instrumentType: InstrumentType.Spot,
      instrumentProgram: cvg.programs().getSpotInstrument().address,
    });
    expect(config.address).toEqual(cvg.riskEngine().pdas().config());
  });

  it('set instrument type [american]', async () => {
    const { config } = await cvg.riskEngine().setInstrumentType({
      instrumentType: InstrumentType.Option,
      instrumentProgram: cvg.programs().getPsyoptionsAmericanInstrument()
        .address,
    });
    expect(config.address).toEqual(cvg.riskEngine().pdas().config());
  });

  it('set instrument type [european]', async () => {
    const { config } = await cvg.riskEngine().setInstrumentType({
      instrumentType: InstrumentType.Option,
      instrumentProgram: cvg.programs().getPsyoptionsEuropeanInstrument()
        .address,
    });
    expect(config.address).toEqual(cvg.riskEngine().pdas().config());
  });

  it('set risk categories info [very low]', async () => {
    const { config } = await cvg.riskEngine().setRiskCategoriesInfo({
      changes: [
        {
          value: DEFAULT_RISK_CATEGORIES_INFO.veryLow,
          category: 'very-low',
        },
      ],
    });
    expect(config.address).toEqual(cvg.riskEngine().pdas().config());
  });

  it('set risk categories info [low]', async () => {
    const { config } = await cvg.riskEngine().setRiskCategoriesInfo({
      changes: [
        {
          value: DEFAULT_RISK_CATEGORIES_INFO.low,
          category: 'low',
        },
      ],
    });
    expect(config.address).toEqual(cvg.riskEngine().pdas().config());
  });

  it('set risk categories info [medium]', async () => {
    const { config } = await cvg.riskEngine().setRiskCategoriesInfo({
      changes: [
        {
          value: DEFAULT_RISK_CATEGORIES_INFO.medium,
          category: 'medium',
        },
      ],
    });
    expect(config.address).toEqual(cvg.riskEngine().pdas().config());
  });

  it('set risk categories info [high]', async () => {
    const { config } = await cvg.riskEngine().setRiskCategoriesInfo({
      changes: [
        {
          value: DEFAULT_RISK_CATEGORIES_INFO.high,
          category: 'high',
        },
      ],
    });
    expect(config.address).toEqual(cvg.riskEngine().pdas().config());
  });

  it('set risk categories info [very high]', async () => {
    const { config } = await cvg.riskEngine().setRiskCategoriesInfo({
      changes: [
        {
          value: DEFAULT_RISK_CATEGORIES_INFO.veryHigh,
          category: 'very-high',
        },
      ],
    });
    expect(config.address).toEqual(cvg.riskEngine().pdas().config());
  });
});
