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

    const res0 = await sellCoveredCall(takerCvg, ctx);
    expect(res0.rfq).toHaveProperty('address');

    const res1 = await respondWithBid(makerCvg, res0.rfq);
    expect(res1.rfqResponse).toHaveProperty('address');

    const res2 = await confirmBid(takerCvg, res0.rfq, res1.rfqResponse);
    expect(res2.response).toHaveProperty('signature');

    await createAmericanAccountsAndMint(takerCvg, res0.rfq, res0.optionMarket);
    await createAmericanAccountsAndMint(makerCvg, res0.rfq, res0.optionMarket);

    const res3 = await prepareSettlement(takerCvg, res0.rfq, res1.rfqResponse);
    expect(res3.response).toHaveProperty('signature');

    const res4 = await prepareSettlement(makerCvg, res0.rfq, res1.rfqResponse);
    expect(res4.response).toHaveProperty('signature');

    const res5 = await settle(takerCvg, res0.rfq, res1.rfqResponse);
    expect(res5.response).toHaveProperty('signature');
  });
});
