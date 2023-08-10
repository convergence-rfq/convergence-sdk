import { expect } from 'expect';

import {
  prepareRfqSettlement,
  respondToRfq,
  settleRfq,
  createUserCvg,
  createEuropeanCoveredCallRfq,
  createEuropeanCallSpdOptionRfq,
  setupEuropean,
} from '../helpers';

describe('integration.psyoptionsEuropean', async () => {
  const takerCvg = createUserCvg('taker');
  const makerCvg = createUserCvg('maker');

  it('covered call [sell]', async () => {
    const { rfq, response } = await createEuropeanCoveredCallRfq(
      takerCvg,
      'sell'
    );

    expect(rfq).toHaveProperty('address');
    expect(response.signature).toBeDefined();

    const { rfqResponse } = await respondToRfq(makerCvg, rfq, 12.0);
    await takerCvg.rfqs().confirmResponse({
      rfq: rfq.address,
      response: rfqResponse.address,
      side: 'bid',
    });

    await setupEuropean(takerCvg, rfqResponse);

    await prepareRfqSettlement(makerCvg, rfq, rfqResponse);
    await prepareRfqSettlement(takerCvg, rfq, rfqResponse);

    await settleRfq(takerCvg, rfq, rfqResponse);
  });
  it('open size european call option', async () => {
    const { rfq } = await createEuropeanCallSpdOptionRfq(takerCvg, 'sell');
    expect(rfq).toHaveProperty('address');
    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      150_123,
      undefined,
      5
    );
    expect(rfqResponse).toHaveProperty('address');

    const { response: confirmResponse } = await takerCvg
      .rfqs()
      .confirmResponse({
        rfq: rfq.address,
        response: rfqResponse.address,
        side: 'bid',
        overrideLegMultiplier: 4,
      });
    expect(confirmResponse).toHaveProperty('signature');
    await setupEuropean(takerCvg, rfqResponse);
    await setupEuropean(makerCvg, rfqResponse);

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
  });
});
