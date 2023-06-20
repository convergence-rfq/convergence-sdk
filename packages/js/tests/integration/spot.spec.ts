import { expect } from 'expect';
import { OrderType, Quote, Side } from '@convergence-rfq/rfq';

import { Mint, SpotLegInstrument, SpotQuoteInstrument } from '../../src';
import {
  createUserCvg,
  fetchTokenAmount,
  confirmRfqResponse,
  prepareRfqSettlement,
  settleRfq,
  createRfq,
  respondToRfq,
} from '../helpers';
import { BASE_MINT_BTC_PK, QUOTE_MINT_PK } from '../constants';

describe('integration.spot', () => {
  const takerCvg = createUserCvg('taker');
  const makerCvg = createUserCvg('maker');

  let baseMintBTC: Mint;
  let quoteMint: Mint;

  before(async () => {
    baseMintBTC = await takerCvg
      .tokens()
      .findMintByAddress({ address: BASE_MINT_BTC_PK });
    quoteMint = await takerCvg
      .tokens()
      .findMintByAddress({ address: QUOTE_MINT_PK });
  });

  it('sell', async () => {
    const amountA = 1.5;
    const amountB = 22_000.86;

    const { rfq } = await createRfq(takerCvg, amountA, OrderType.Sell);
    expect(rfq).toHaveProperty('address');

    const { rfqResponse } = await respondToRfq(makerCvg, rfq, amountB);
    expect(rfqResponse).toHaveProperty('address');

    const confirmResponse = await confirmRfqResponse(
      takerCvg,
      rfq,
      rfqResponse,
      Side.Bid
    );
    expect(confirmResponse.response).toHaveProperty('signature');

    const [takerBtcBefore, takerQuoteBefore] = await Promise.all([
      fetchTokenAmount(takerCvg, baseMintBTC.address),
      fetchTokenAmount(takerCvg, quoteMint.address),
    ]);

    const takerResult = await prepareRfqSettlement(takerCvg, rfq, rfqResponse);
    expect(takerResult.response).toHaveProperty('signature');

    const makerResult = await prepareRfqSettlement(makerCvg, rfq, rfqResponse);
    expect(makerResult.response).toHaveProperty('signature');

    const settleResult = await settleRfq(takerCvg, rfq, rfqResponse);
    expect(settleResult.response).toHaveProperty('signature');

    const [takerBtcAfter, takerQuoteAfter] = await Promise.all([
      fetchTokenAmount(takerCvg, baseMintBTC.address),
      fetchTokenAmount(takerCvg, quoteMint.address),
    ]);

    // TODO: This does not seem right in terms of handling precision
    expect(takerQuoteAfter).toBeCloseTo(takerQuoteBefore + amountB);
    expect(takerBtcAfter).toBeCloseTo(takerBtcBefore - amountA);
  });

  it('buy', async () => {
    const amountA = 2.5;
    const amountB = 24_300.75 * amountA;

    const { rfq } = await createRfq(takerCvg, amountA, OrderType.Buy);
    expect(rfq).toHaveProperty('address');

    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      undefined,
      amountB
    );
    expect(rfqResponse).toHaveProperty('address');

    const confirmResponse = await confirmRfqResponse(
      takerCvg,
      rfq,
      rfqResponse,
      Side.Ask
    );
    expect(confirmResponse.response).toHaveProperty('signature');

    const [takerBtcBefore, makerBtcBefore] = await Promise.all([
      fetchTokenAmount(takerCvg, baseMintBTC.address),
      fetchTokenAmount(makerCvg, baseMintBTC.address),
    ]);

    const takerResult = await prepareRfqSettlement(takerCvg, rfq, rfqResponse);
    expect(takerResult.response).toHaveProperty('signature');

    const makerResult = await prepareRfqSettlement(makerCvg, rfq, rfqResponse);
    expect(makerResult.response).toHaveProperty('signature');

    const settleResult = await settleRfq(takerCvg, rfq, rfqResponse);
    expect(settleResult.response).toHaveProperty('signature');

    // TODO: Unlock collateral
    const [takerBtcAfter, makerBtcAfter] = await Promise.all([
      fetchTokenAmount(takerCvg, baseMintBTC.address),
      fetchTokenAmount(makerCvg, baseMintBTC.address),
    ]);

    expect(makerBtcAfter).toBe(makerBtcBefore - amountA);
    expect(takerBtcAfter).toBe(takerBtcBefore + amountA);
  });

  it('cancel, reclaim and cleanup multiple RFQs', async () => {
    const { rfq: rfq1, response } = await takerCvg.rfqs().createAndFinalize({
      instruments: [
        await SpotLegInstrument.create(takerCvg, baseMintBTC, 5, Side.Bid),
      ],
      orderType: OrderType.Buy,
      fixedSize: { __kind: 'None', padding: 0 },
      quoteAsset: await SpotQuoteInstrument.create(takerCvg, quoteMint),
    });
    expect(response).toHaveProperty('signature');

    const { rfq: rfq2, response: response2 } = await takerCvg
      .rfqs()
      .createAndFinalize({
        instruments: [
          await SpotLegInstrument.create(takerCvg, baseMintBTC, 10, Side.Bid),
        ],
        orderType: OrderType.Buy,
        fixedSize: { __kind: 'None', padding: 0 },
        quoteAsset: await SpotQuoteInstrument.create(takerCvg, quoteMint),
      });
    expect(response2).toHaveProperty('signature');

    const { rfq: rfq3, response: response3 } = await takerCvg
      .rfqs()
      .createAndFinalize({
        instruments: [
          await SpotLegInstrument.create(takerCvg, baseMintBTC, 15, Side.Bid),
        ],
        orderType: OrderType.Buy,
        fixedSize: { __kind: 'None', padding: 0 },
        quoteAsset: await SpotQuoteInstrument.create(takerCvg, quoteMint),
      });
    expect(response3).toHaveProperty('signature');

    await takerCvg
      .rfqs()
      .cancelMultipleRfq({ rfqs: [rfq1.address, rfq2.address, rfq3.address] });

    await takerCvg.rfqs().unlockMultipleRfqCollateral({
      rfqs: [rfq1.address, rfq2.address, rfq3.address],
    });
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

  it('cancel, reclaim and cleanup multiple responses', async () => {
    const { rfq, response } = await takerCvg.rfqs().createAndFinalize({
      instruments: [
        await SpotLegInstrument.create(takerCvg, baseMintBTC, 8, Side.Bid),
      ],
      orderType: OrderType.Buy,
      fixedSize: { __kind: 'None', padding: 0 },
      quoteAsset: await SpotQuoteInstrument.create(takerCvg, quoteMint),
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
    //await sleep(3000);

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
    await makerCvg.rfqs().cleanUpResponses({
      responses: [
        refreshedResponse1.address,
        refreshedResponse2.address,
        refreshedResponse3.address,
      ],
      maker: makerCvg.identity().publicKey,
    });
  });

  it('send rfq and respond with floating point number with two leg', async () => {
    const amountA = 22.267;
    const amountB = 22.243;
    const amountC = 101.987;

    const { rfq } = await takerCvg.rfqs().createAndFinalize({
      instruments: [
        await SpotLegInstrument.create(
          takerCvg,
          baseMintBTC,
          amountA,
          Side.Bid
        ),
        await SpotLegInstrument.create(
          takerCvg,
          baseMintBTC,
          amountB,
          Side.Bid
        ),
      ],
      orderType: OrderType.Sell,
      fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
      quoteAsset: await SpotQuoteInstrument.create(takerCvg, quoteMint),
    });

    const respond: Quote = {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: amountC },
    };
    const { rfqResponse } = await makerCvg.rfqs().respond({
      bid: respond,
      rfq: rfq.address,
    });
    await confirmRfqResponse(takerCvg, rfq, rfqResponse, Side.Bid);

    const takerBtcBefore = await fetchTokenAmount(
      takerCvg,
      baseMintBTC.address
    );
    const takerQuoteBefore = await fetchTokenAmount(
      takerCvg,
      quoteMint.address
    );
    const takerResult = await prepareRfqSettlement(takerCvg, rfq, rfqResponse);
    expect(takerResult.response).toHaveProperty('signature');

    const makerResult = await prepareRfqSettlement(makerCvg, rfq, rfqResponse);
    expect(makerResult.response).toHaveProperty('signature');

    const settleResult = await settleRfq(takerCvg, rfq, rfqResponse);
    expect(settleResult.response).toHaveProperty('signature');

    const takerBtcAfter = await fetchTokenAmount(takerCvg, baseMintBTC.address);
    const takerQuoteAfter = await fetchTokenAmount(takerCvg, quoteMint.address);
    expect(takerBtcAfter.toFixed(2)).toBe(
      (takerBtcBefore - amountA - amountB).toFixed(2)
    );
    expect(takerQuoteAfter.toFixed(2)).toBe(
      (takerQuoteBefore + amountC).toFixed(2)
    );
  });
});
