import { expect } from 'expect';

import {
  ChildProccess,
  Ctx,
  readCtx,
  spawnValidator,
} from '../../../validator';
import {
  createSdk,
  sellCoveredCall,
  confirmBid,
  respondWithBid,
  prepareSettlement,
  settle,
  createAmericanAccountsAndMint,
} from '../helpers';

describe('american', () => {
  let validator: ChildProccess;
  let ctx: Ctx;

  before((done) => {
    ctx = readCtx();
    validator = spawnValidator(done);
  });

  after(() => {
    validator.kill();
  });

  it('covered call', async () => {
    const takerCvg = await createSdk('taker');
    const makerCvg = await createSdk('maker');

    const { rfq, optionMarket } = await sellCoveredCall(takerCvg, ctx);
    expect(rfq).toHaveProperty('address');

    const { rfqResponse } = await respondWithBid(makerCvg, rfq);
    expect(rfqResponse).toHaveProperty('address');

    const { response } = await confirmBid(takerCvg, rfq, rfqResponse);
    expect(response).toHaveProperty('signature');

    await createAmericanAccountsAndMint(takerCvg, rfq, optionMarket);
    await createAmericanAccountsAndMint(makerCvg, rfq, optionMarket);

    const takerResult = await prepareSettlement(takerCvg, rfq, rfqResponse);
    expect(takerResult.response).toHaveProperty('signature');

    const makerResult = await prepareSettlement(makerCvg, rfq, rfqResponse);
    expect(makerResult.response).toHaveProperty('signature');

    const settleResult = await settle(takerCvg, rfq, rfqResponse);
    expect(settleResult.response).toHaveProperty('signature');
  });
});
