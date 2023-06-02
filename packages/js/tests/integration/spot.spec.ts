import { expect } from 'expect';

import { OrderType, Quote, Side } from '@convergence-rfq/rfq';
import { sleep } from '@bundlr-network/client/build/common/utils';
import { createUserCvg } from '../helpers';
import { BASE_MINT_PK, QUOTE_MINT_PK } from '../constants';
import { respond, confirmResponse, prepareSettlement, settle } from '../human';
import { Mint, SpotInstrument } from '../../src';

describe('integration.spot', () => {
  const takerCvg = createUserCvg('taker');
  const makerCvg = createUserCvg('maker');
  const dao = createUserCvg('dao');
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
    const { rfq } = await takerCvg.rfqs().createAndFinalize({
      instruments: [
        new SpotInstrument(takerCvg, baseMint, {
          amount: 1,
          side: Side.Ask,
        }),
      ],
      orderType: OrderType.Sell,
      fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
      quoteAsset: new SpotInstrument(takerCvg, quoteMint).toQuoteAsset(),
    });
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

  it('buy 1.0 BTC', async () => {
    const { rfq, response } = await takerCvg.rfqs().createAndFinalize({
      instruments: [
        new SpotInstrument(takerCvg, baseMint, {
          amount: 5,
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
    await prepareSettlement(makerCvg, rfq, rfqResponse);
    await prepareSettlement(takerCvg, rfq, rfqResponse);
    await settle(takerCvg, rfq, rfqResponse);
  });

  it('cancel Multiple Rfqs , reclaim Multiple Rfqs and Cleanup Multiple Rfqs', async () => {
    const { rfq: rfq1, response } = await takerCvg.rfqs().createAndFinalize({
      instruments: [
        new SpotInstrument(takerCvg, baseMint, {
          amount: 5,
          side: Side.Bid,
        }),
      ],
      orderType: OrderType.Buy,
      fixedSize: { __kind: 'None', padding: 0 },
      quoteAsset: new SpotInstrument(takerCvg, quoteMint).toQuoteAsset(),
    });
    expect(response).toHaveProperty('signature');

    const { rfq: rfq2, response: response2 } = await takerCvg
      .rfqs()
      .createAndFinalize({
        instruments: [
          new SpotInstrument(takerCvg, baseMint, {
            amount: 10,
            side: Side.Bid,
          }),
        ],
        orderType: OrderType.Buy,
        fixedSize: { __kind: 'None', padding: 0 },
        quoteAsset: new SpotInstrument(takerCvg, quoteMint).toQuoteAsset(),
      });
    expect(response2).toHaveProperty('signature');

    const { rfq: rfq3, response: response3 } = await takerCvg
      .rfqs()
      .createAndFinalize({
        instruments: [
          new SpotInstrument(takerCvg, baseMint, {
            amount: 15,
            side: Side.Bid,
          }),
        ],
        orderType: OrderType.Buy,
        fixedSize: { __kind: 'None', padding: 0 },
        quoteAsset: new SpotInstrument(takerCvg, quoteMint).toQuoteAsset(),
      });
    expect(response3).toHaveProperty('signature');

    await takerCvg
      .rfqs()
      .cancelMultipleRfq({ rfqs: [rfq1.address, rfq2.address, rfq3.address] });

    await sleep(3000);
    await takerCvg.rfqs().unlockMultipleRfqCollateral({
      rfqs: [rfq1.address, rfq2.address, rfq3.address],
    });
    await sleep(3000);
    const refreshedRfq1 = await takerCvg
      .rfqs()
      .findRfqByAddress({ address: rfq1.address });
    const refreshedRfq2 = await takerCvg
      .rfqs()
      .findRfqByAddress({ address: rfq2.address });
    const refreshedRfq3 = await takerCvg
      .rfqs()
      .findRfqByAddress({ address: rfq3.address });
    await takerCvg.rfqs().cleanUpMultipleRfq({
      rfqs: [
        refreshedRfq1.address,
        refreshedRfq2.address,
        refreshedRfq3.address,
      ],
    });
  });

  it('cancel Multiple Responses , Reclaim Multiple Responses and Cleanup Multiple Responses', async () => {
    const { rfq, response } = await takerCvg.rfqs().createAndFinalize({
      instruments: [
        new SpotInstrument(takerCvg, baseMint, {
          amount: 8,
          side: Side.Bid,
        }),
      ],
      orderType: OrderType.Buy,
      fixedSize: { __kind: 'None', padding: 0 },
      quoteAsset: new SpotInstrument(takerCvg, quoteMint).toQuoteAsset(),
    });
    expect(response).toHaveProperty('signature');
    const respond1: Quote = {
      __kind: 'Standard',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 100 },
      legsMultiplierBps: 1,
    };
    const respond2: Quote = {
      __kind: 'Standard',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 200 },
      legsMultiplierBps: 1,
    };
    const respond3: Quote = {
      __kind: 'Standard',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 300 },
      legsMultiplierBps: 1,
    };
    const { rfqResponse: response1 } = await makerCvg.rfqs().respond({
      ask: respond1,
      rfq: rfq.address,
    });

    const { rfqResponse: response2 } = await makerCvg.rfqs().respond({
      ask: respond2,
      rfq: rfq.address,
    });
    const { rfqResponse: response3 } = await makerCvg.rfqs().respond({
      ask: respond3,
      rfq: rfq.address,
    });

    await makerCvg.rfqs().cancelMultipleResponse({
      responses: [response1.address, response2.address, response3.address],
    });
    await sleep(3000);

    const refreshedResponse1 = await makerCvg
      .rfqs()
      .findResponseByAddress({ address: response1.address });
    const refreshedResponse2 = await makerCvg
      .rfqs()
      .findResponseByAddress({ address: response2.address });
    const refreshedResponse3 = await makerCvg
      .rfqs()
      .findResponseByAddress({ address: response3.address });
    await makerCvg.rfqs().unlockMultipleResponseCollateral({
      responses: [
        refreshedResponse1.address,
        refreshedResponse2.address,
        refreshedResponse3.address,
      ],
    });
    await sleep(3000);
    await makerCvg.rfqs().cleanUpMultipleResponses({
      responses: [
        refreshedResponse1.address,
        refreshedResponse2.address,
        refreshedResponse3.address,
      ],
      maker: makerCvg.rpc().getDefaultFeePayer().publicKey,
      dao: dao.rpc().getDefaultFeePayer().publicKey,
    });
  });
});
