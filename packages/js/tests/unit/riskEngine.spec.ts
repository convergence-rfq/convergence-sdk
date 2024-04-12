import { expect } from 'expect';

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

  it('calculate collateral for RFQ', async () => {
    const { rfq } = await createRfq(takerCvg, 1.5, 'buy');
    const { requiredCollateral } = await daoCvg
      .riskEngine()
      .calculateCollateralForRfq({
        legs: rfq.legs,
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
        confirmation: { side: 'bid', overrideLegMultiplier: 1 },
      });
    expect(requiredCollateral).toBeCloseTo(rfqResponse.makerCollateralLocked);
  });

  it('calculate collateral if all scenarios yield positive pnl', async () => {
    const rfq = await createCFlyRfq(takerCvg, 'sell', false);
    const { requiredCollateral } = await daoCvg
      .riskEngine()
      .calculateCollateralForRfq({
        legs: rfq.legs,
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
        settlementPeriod: rfq.settlingWindow,
        size: rfq.size,
        orderType: rfq.orderType,
      });
    expect(requiredCollateral).toBeCloseTo(rfq.totalTakerCollateralLocked);
  });
});
