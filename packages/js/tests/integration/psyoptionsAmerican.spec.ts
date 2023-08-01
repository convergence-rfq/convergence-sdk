import { expect } from 'expect';

import {
  createAmericanCoveredCallRfq,
  respondToRfq,
  prepareRfqSettlement,
  settleRfq,
  createUserCvg,
  setupAmerican,
} from '../helpers';

describe('integration.psyoptionsAmerican', () => {
  const takerCvg = createUserCvg('taker');
  const makerCvg = createUserCvg('maker');

  it('covered call [sell]', async () => {
    const { rfq } = await createAmericanCoveredCallRfq(takerCvg, 'sell');
    expect(rfq).toHaveProperty('address');

    const { rfqResponse } = await respondToRfq(makerCvg, rfq, 12.1);
    expect(rfqResponse).toHaveProperty('address');

    const { response: confirmResponse } = await takerCvg
      .rfqs()
      .confirmResponse({
        rfq: rfq.address,
        response: rfqResponse.address,
        side: 'bid',
      });
    expect(confirmResponse).toHaveProperty('signature');
    await setupAmerican(takerCvg, rfqResponse);

    const takerResponse = await prepareRfqSettlement(
      takerCvg,
      rfq,
      rfqResponse
    );
    expect(takerResponse.response).toHaveProperty('signature');

    const makerResponse = await prepareRfqSettlement(
      makerCvg,
      rfq,
      rfqResponse
    );
    expect(makerResponse.response).toHaveProperty('signature');

    const settlementResponse = await settleRfq(takerCvg, rfq, rfqResponse);
    expect(settlementResponse.response).toHaveProperty('signature');

    // TODO: Check balances
  });
});
