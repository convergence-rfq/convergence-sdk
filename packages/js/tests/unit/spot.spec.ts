import { expect } from 'expect';

import { ChildProccess, Ctx, spawnValidator } from '../../../validator';
import {
  createSdk,
  sellSpot,
  confirmBid,
  respondWithBid,
  prepareSettlement,
  settle,
} from '../helpers';

describe('spot', () => {
  const ctx = new Ctx();

  let validator: ChildProccess;

  before((done) => {
    validator = spawnValidator(done);
  });

  after(() => {
    validator.kill();
  });

  it('spot', async () => {
    const takerCvg = await createSdk('taker');
    const makerCvg = await createSdk('maker');

    const amount = 1.0;
    const { rfq } = await sellSpot(takerCvg, ctx, amount);
    expect(rfq).toHaveProperty('address');

    const { rfqResponse } = await respondWithBid(makerCvg, rfq);
    expect(rfqResponse).toHaveProperty('address');

    const { response } = await confirmBid(takerCvg, rfq, rfqResponse);
    expect(response).toHaveProperty('signature');

    const takerResult = await prepareSettlement(takerCvg, rfq, rfqResponse);
    expect(takerResult.response).toHaveProperty('signature');

    const makerResult = await prepareSettlement(makerCvg, rfq, rfqResponse);
    expect(makerResult.response).toHaveProperty('signature');

    const settleResult = await settle(takerCvg, rfq, rfqResponse);
    expect(settleResult.response).toHaveProperty('signature');
  });
});
