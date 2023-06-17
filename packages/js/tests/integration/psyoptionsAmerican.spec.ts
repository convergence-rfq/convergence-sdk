import { expect } from 'expect';

import { OrderType, Side } from '../../src';

import {
  createAmericanCoveredCallRfq,
  confirmRfqResponse,
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
    const { rfq } = await createAmericanCoveredCallRfq(
      takerCvg,
      OrderType.Sell
    );
    expect(rfq).toHaveProperty('address');

    const { rfqResponse } = await respondToRfq(makerCvg, rfq, 12.1, Side.Bid);
    expect(rfqResponse).toHaveProperty('address');

    const { response: confirmResponse } = await confirmRfqResponse(
      takerCvg,
      rfq,
      rfqResponse,
      Side.Bid
    );
    expect(confirmResponse).toHaveProperty('signature');

    await setupAmerican(takerCvg, rfqResponse);

    const { response: prepareTakerSettlementResponse } =
      await prepareRfqSettlement(takerCvg, rfq, rfqResponse);
    expect(prepareTakerSettlementResponse).toHaveProperty('signature');

    const { response: prepareMakerSettlementResponse } =
      await prepareRfqSettlement(makerCvg, rfq, rfqResponse);
    expect(prepareMakerSettlementResponse).toHaveProperty('signature');

    const { response: settlementResponse } = await settleRfq(
      takerCvg,
      rfq,
      rfqResponse
    );
    expect(settlementResponse).toHaveProperty('signature');

    // TODO: Check balances
  });
});
