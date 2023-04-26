import { expect } from 'expect';

import { Ctx } from '../../../validator';
import {
  createSdk,
  sellCoveredCall,
  confirmBid,
  respondWithBid,
  //prepareSettlement,
  //settle,
  //createAmericanAccountsAndMint,
} from '../helpers';

describe('american', () => {
  const ctx = new Ctx();
  const takerCvg = createSdk('taker');
  const makerCvg = createSdk('maker');

  it('covered call', async () => {
    const res0 = await sellCoveredCall(takerCvg, ctx);
    const { rfq } = res0;
    expect(rfq).toHaveProperty('address');

    const res1 = await respondWithBid(makerCvg, rfq);
    const { rfqResponse } = res1;
    expect(rfqResponse).toHaveProperty('address');

    const res2 = await confirmBid(takerCvg, rfq, rfqResponse);
    expect(res2.response).toHaveProperty('signature');

    //await createAmericanAccountsAndMint(takerCvg, rfq, optionMarket, 100);
    //await createAmericanAccountsAndMint(makerCvg, rfq, optionMarket, 100);

    //const res3 = await prepareSettlement(takerCvg, rfq, rfqResponse);
    //expect(res3.response).toHaveProperty('signature');

    //const res4 = await prepareSettlement(makerCvg, rfq, rfqResponse);
    //expect(res4.response).toHaveProperty('signature');

    //const res5 = await settle(takerCvg, rfq, res1.rfqResponse);
    //expect(res5.response).toHaveProperty('signature');
  });
});
