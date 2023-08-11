import { expect } from 'expect';
// TODO: Should not be using this
import { QuoteSide } from '@convergence-rfq/rfq';

import { InstrumentType, DEFAULT_RISK_CATEGORIES_INFO } from '../../src';
import {
  createCFlyRfq,
  createRfq,
  createUserCvg,
  respondToRfq,
} from '../helpers';

describe('unit.riskEngine', () => {
  const daoCvg = createUserCvg('dao');
  const takerCvg = createUserCvg('taker');
  const makerCvg = createUserCvg('maker');

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
    const { rfq } = await createRfq(takerCvg, 1.5, 'buy');
    const { requiredCollateral } = await daoCvg
      .riskEngine()
      .calculateCollateralForRfq({
        legs: rfq.legs,
        quoteAsset: rfq.quoteAsset,
        settlementPeriod: rfq.settlingWindow,
        size: rfq.size,
        orderType: rfq.orderType,
      });
    expect(requiredCollateral).toBeCloseTo(rfq.totalTakerCollateralLocked);
  });

  it('calculate collateral for response', async () => {
    const { rfq } = await createRfq(takerCvg, 1.5, 'sell');
    const { rfqResponse } = await respondToRfq(makerCvg, rfq, 12.1);
    const { requiredCollateral } = await daoCvg
      .riskEngine()
      .calculateCollateralForResponse({
        rfqAddress: rfq.address,
        bid: {
          price: 12.5,
        },
      });
    expect(requiredCollateral).toBeCloseTo(rfqResponse.makerCollateralLocked);
  });

  it('calculate collateral for confirmation', async () => {
    const { rfq } = await createRfq(takerCvg, 2.7, 'sell');
    const { rfqResponse } = await respondToRfq(makerCvg, rfq, 113.9);
    const { requiredCollateral } = await daoCvg
      .riskEngine()
      .calculateCollateralForConfirmation({
        rfqAddress: rfq.address,
        responseAddress: rfqResponse.address,
        confirmation: { side: QuoteSide.Ask, overrideLegMultiplier: 1 },
      });
    expect(requiredCollateral).toBeCloseTo(rfqResponse.makerCollateralLocked);
  });

  it('calculate collateral if all scenarios yield positive pnl', async () => {
    const rfq = await createCFlyRfq(takerCvg, 'sell', false);
    const { requiredCollateral } = await daoCvg
      .riskEngine()
      .calculateCollateralForRfq({
        legs: rfq.legs,
        quoteAsset: rfq.quoteAsset,
        settlementPeriod: rfq.settlingWindow,
        size: rfq.size,
        orderType: rfq.orderType,
      });
    expect(requiredCollateral).toBeCloseTo(rfq.totalTakerCollateralLocked);
  });

  it('calculate collateral if all scenarios yield negative pnl', async () => {
    const rfq = await createCFlyRfq(takerCvg, 'sell', true);
    const { requiredCollateral } = await daoCvg
      .riskEngine()
      .calculateCollateralForRfq({
        legs: rfq.legs,
        quoteAsset: rfq.quoteAsset,
        settlementPeriod: rfq.settlingWindow,
        size: rfq.size,
        orderType: rfq.orderType,
      });
    expect(requiredCollateral).toBeCloseTo(rfq.totalTakerCollateralLocked);
  });
});
