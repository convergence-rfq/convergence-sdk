import { expect } from 'expect';

import { OrderType, Side } from '../../src';

import {
  createAmericanCoveredCall,
  confirmRfqResponse,
  respondWithBid,
  prepareSettlement,
  settle,
  createUserCvg,
  setupAmerican,
} from '../helpers';

describe('integration.psyoptionsAmerican', () => {
  const takerCvg = createUserCvg('taker');
  const makerCvg = createUserCvg('maker');

  it('covered call [sell]', async () => {
    const { rfq } = await createAmericanCoveredCall(takerCvg, OrderType.Sell);
    expect(rfq).toHaveProperty('address');

    const { rfqResponse } = await respondWithBid(makerCvg, rfq);
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
      await prepareSettlement(takerCvg, rfq, rfqResponse);
    expect(prepareTakerSettlementResponse).toHaveProperty('signature');

    const { response: prepareMakerSettlementResponse } =
      await prepareSettlement(makerCvg, rfq, rfqResponse);
    expect(prepareMakerSettlementResponse).toHaveProperty('signature');

    const { response: settlementResponse } = await settle(
      takerCvg,
      rfq,
      rfqResponse
    );
    expect(settlementResponse).toHaveProperty('signature');

    // TODO: Check balances
  });
});
