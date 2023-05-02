import { expect } from 'expect';

import {
  InstrumentType,
  DEFAULT_RISK_CATEGORIES_INFO,
  RiskCategory,
} from '../../src';
import { createUserCvg } from '../helpers';

describe('riskEngine', () => {
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
          newValue: DEFAULT_RISK_CATEGORIES_INFO.veryLow,
          riskCategoryIndex: RiskCategory.VeryLow,
        },
      ],
    });
    expect(config.address).toEqual(cvg.riskEngine().pdas().config());
  });

  it('set risk categories info [low]', async () => {
    const { config } = await cvg.riskEngine().setRiskCategoriesInfo({
      changes: [
        {
          newValue: DEFAULT_RISK_CATEGORIES_INFO.low,
          riskCategoryIndex: RiskCategory.Low,
        },
      ],
    });
    expect(config.address).toEqual(cvg.riskEngine().pdas().config());
  });

  it('set risk categories info [medium]', async () => {
    const { config } = await cvg.riskEngine().setRiskCategoriesInfo({
      changes: [
        {
          newValue: DEFAULT_RISK_CATEGORIES_INFO.medium,
          riskCategoryIndex: RiskCategory.Medium,
        },
      ],
    });
    expect(config.address).toEqual(cvg.riskEngine().pdas().config());
  });

  it('set risk categories info [high]', async () => {
    const { config } = await cvg.riskEngine().setRiskCategoriesInfo({
      changes: [
        {
          newValue: DEFAULT_RISK_CATEGORIES_INFO.high,
          riskCategoryIndex: RiskCategory.High,
        },
      ],
    });
    expect(config.address).toEqual(cvg.riskEngine().pdas().config());
  });

  it('set risk categories info [very high]', async () => {
    const { config } = await cvg.riskEngine().setRiskCategoriesInfo({
      changes: [
        {
          newValue: DEFAULT_RISK_CATEGORIES_INFO.veryHigh,
          riskCategoryIndex: RiskCategory.VeryHigh,
        },
      ],
    });
    expect(config.address).toEqual(cvg.riskEngine().pdas().config());
  });
});
