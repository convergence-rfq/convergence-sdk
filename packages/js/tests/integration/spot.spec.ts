import { expect } from 'expect';

import { createUserCvg } from '../helpers';
import {
  confirmResponse,
  respond,
  prepareSettlement,
  settle,
  createRfq,
} from '../human';

describe('spot', () => {
  const takerCvg = createUserCvg('taker');
  const makerCvg = createUserCvg('maker');

  it('sell 1.0 BTC', async () => {
    const amount = 1.0;
    const { rfq } = await createRfq(takerCvg, amount, 'sell');
    expect(rfq).toHaveProperty('address');

    // TODO: Get taker token amount

    const { rfqResponse } = await respond(makerCvg, rfq, 'bid');
    expect(rfqResponse).toHaveProperty('address');

    const { response } = await confirmResponse(
      takerCvg,
      rfq,
      rfqResponse,
      'bid'
    );
    expect(response).toHaveProperty('signature');

    const takerResult = await prepareSettlement(takerCvg, rfq, rfqResponse);
    expect(takerResult.response).toHaveProperty('signature');

    const makerResult = await prepareSettlement(makerCvg, rfq, rfqResponse);
    expect(makerResult.response).toHaveProperty('signature');

    const settleResult = await settle(takerCvg, rfq, rfqResponse);
    expect(settleResult.response).toHaveProperty('signature');

    // TODO: Verify token amounts via conversions are correct
  });
});
