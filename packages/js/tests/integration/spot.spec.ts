import { expect } from 'expect';

import { OrderType, Quote, Side } from '@convergence-rfq/rfq';
import { createUserCvg } from '../helpers';
import { BASE_MINT_PK, QUOTE_MINT_PK } from '../constants';
import { respond, confirmResponse, prepareSettlement, settle } from '../human';
import { Mint, SpotInstrument } from '../../src';

describe('spot', () => {
  const takerCvg = createUserCvg('taker');
  const makerCvg = createUserCvg('maker');
  let baseMint: Mint;
  let quoteMint: Mint;

  before(async () => {
    baseMint = await takerCvg
      .tokens()
      .findMintByAddress({ address: BASE_MINT_PK });
    quoteMint = await takerCvg
      .tokens()
      .findMintByAddress({ address: QUOTE_MINT_PK });
  });

  it('sell 1.0 BTC', async () => {
    const amount = 1.0;
    const side = 'sell';
    const { rfq } = await takerCvg
      .human()
      .createRfq(amount, side, BASE_MINT_PK, QUOTE_MINT_PK);
    expect(rfq).toHaveProperty('address');

    // TODO: Get taker token amount

    // const { rfqResponse } = await respond(makerCvg, rfq, 'bid');
    // expect(rfqResponse).toHaveProperty('address');

    // const { response } = await confirmResponse(
    //   takerCvg,
    //   rfq,
    //   rfqResponse,
    //   'bid'
    // );
    // expect(response).toHaveProperty('signature');

    // const takerResult = await prepareSettlement(takerCvg, rfq, rfqResponse);
    // expect(takerResult.response).toHaveProperty('signature');

    // const makerResult = await prepareSettlement(makerCvg, rfq, rfqResponse);
    // expect(makerResult.response).toHaveProperty('signature');

    // const settleResult = await settle(takerCvg, rfq, rfqResponse);
    // expect(settleResult.response).toHaveProperty('signature');

    // TODO: Verify token amounts via conversions are correct
  });

  it('buy 1.0 BTC', async () => {
    const { rfq, response } = await takerCvg.rfqs().createAndFinalize({
      instruments: [
        new SpotInstrument(takerCvg, baseMint, {
          amount: 0,
          side: Side.Bid,
        }),
      ],
      orderType: OrderType.Buy,
      fixedSize: { __kind: 'None', padding: 0 },
      quoteAsset: new SpotInstrument(takerCvg, quoteMint).toQuoteAsset(),
    });
    expect(response).toHaveProperty('signature');
    const respond: Quote = {
      __kind: 'Standard',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 100 },
      legsMultiplierBps: 0,
    };
    const { rfqResponse } = await makerCvg.rfqs().respond({
      ask: respond,
      rfq: rfq.address,
    });
    await confirmResponse(takerCvg, rfq, rfqResponse, 'ask');
    console.log('log', Number(rfqResponse.ask?.priceQuote.amountBps));
    await prepareSettlement(makerCvg, rfq, rfqResponse);
    await prepareSettlement(takerCvg, rfq, rfqResponse);

    await settle(takerCvg, rfq, rfqResponse);
  });
});
