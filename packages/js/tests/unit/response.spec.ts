import { expect } from 'expect';

import { OrderType, Rfq, Side } from '../../src';
import {
  createUserCvg,
  createRfq,
  respondToRfq,
  confirmRfqResponse,
} from '../helpers';

describe('unit.response', () => {
  const makerCvg = createUserCvg('maker');
  const takerCvg = createUserCvg('taker');

  const amount0 = 2.5;
  const amount1 = 24_300.75 * amount0;
  const amount2 = 24_101.15 * amount0;
  const amount3 = 22_905.73 * amount0;

  let rfq0: Rfq;
  let rfq1: Rfq;
  let rfq2: Rfq;

  before(async () => {
    const [res0, res1, res2] = await Promise.all([
      createRfq(takerCvg, amount0, OrderType.Buy),
      createRfq(takerCvg, amount0, OrderType.Sell),
      createRfq(takerCvg, amount0, OrderType.TwoWay),
    ]);

    expect(res0.response).toHaveProperty('signature');
    expect(res1.response).toHaveProperty('signature');
    expect(res2.response).toHaveProperty('signature');

    rfq0 = res0.rfq;
    rfq1 = res1.rfq;
    rfq2 = res2.rfq;
  });

  it('respond [buy]', async () => {
    // Note that we test multiple and duplicate responses
    const [res0, res1, res2, res3, res4] = await Promise.all([
      respondToRfq(makerCvg, rfq0, undefined, amount1),
      respondToRfq(makerCvg, rfq0, undefined, amount2),
      respondToRfq(makerCvg, rfq0, undefined, amount3),
      respondToRfq(makerCvg, rfq0, undefined, amount1),
      respondToRfq(makerCvg, rfq0, undefined, amount1),
    ]);

    expect(res0.rfqResponse).toHaveProperty('address');
    expect(res1.rfqResponse).toHaveProperty('address');
    expect(res2.rfqResponse).toHaveProperty('address');
    expect(res3.rfqResponse).toHaveProperty('address');
    expect(res4.rfqResponse).toHaveProperty('address');

    expect(res0.rfqResponse.ask?.priceQuote.amountBps).toEqual(amount1);
    expect(res1.rfqResponse.ask?.priceQuote.amountBps).toEqual(amount2);
    expect(res2.rfqResponse.ask?.priceQuote.amountBps).toEqual(amount3);
    expect(res3.rfqResponse.ask?.priceQuote.amountBps).toEqual(amount1);
    expect(res4.rfqResponse.ask?.priceQuote.amountBps).toEqual(amount1);
  });

  it('respond [sell]', async () => {
    // Note that we test multiple and duplicate responses
    const [res0, res1, res2, res3, res4] = await Promise.all([
      respondToRfq(makerCvg, rfq1, amount1),
      respondToRfq(makerCvg, rfq1, amount2),
      respondToRfq(makerCvg, rfq1, amount3),
      respondToRfq(makerCvg, rfq1, amount1),
      respondToRfq(makerCvg, rfq1, amount1),
    ]);

    expect(res0.rfqResponse).toHaveProperty('address');
    expect(res1.rfqResponse).toHaveProperty('address');
    expect(res2.rfqResponse).toHaveProperty('address');
    expect(res3.rfqResponse).toHaveProperty('address');
    expect(res4.rfqResponse).toHaveProperty('address');

    expect(res0.rfqResponse.bid?.priceQuote.amountBps).toEqual(amount1);
    expect(res1.rfqResponse.bid?.priceQuote.amountBps).toEqual(amount2);
    expect(res2.rfqResponse.bid?.priceQuote.amountBps).toEqual(amount3);
    expect(res3.rfqResponse.bid?.priceQuote.amountBps).toEqual(amount1);
    expect(res4.rfqResponse.bid?.priceQuote.amountBps).toEqual(amount1);
  });

  it('respond [two-way]', async () => {
    // Note that we test multiple and duplicate responses
    const [res0, res1, res2, res3, res4] = await Promise.all([
      respondToRfq(makerCvg, rfq2, amount3, amount1),
      respondToRfq(makerCvg, rfq2, amount1, amount2),
      respondToRfq(makerCvg, rfq2, amount3, amount2),
      respondToRfq(makerCvg, rfq2, amount3, amount1),
      respondToRfq(makerCvg, rfq2, amount3, amount1),
    ]);

    expect(res0.rfqResponse).toHaveProperty('address');
    expect(res1.rfqResponse).toHaveProperty('address');
    expect(res2.rfqResponse).toHaveProperty('address');
    expect(res3.rfqResponse).toHaveProperty('address');
    expect(res4.rfqResponse).toHaveProperty('address');

    expect(res0.rfqResponse.bid?.priceQuote.amountBps).toEqual(amount3);
    expect(res1.rfqResponse.bid?.priceQuote.amountBps).toEqual(amount1);
    expect(res2.rfqResponse.bid?.priceQuote.amountBps).toEqual(amount3);
    expect(res3.rfqResponse.bid?.priceQuote.amountBps).toEqual(amount3);
    expect(res4.rfqResponse.bid?.priceQuote.amountBps).toEqual(amount3);

    expect(res0.rfqResponse.ask?.priceQuote.amountBps).toEqual(amount1);
    expect(res1.rfqResponse.ask?.priceQuote.amountBps).toEqual(amount2);
    expect(res2.rfqResponse.ask?.priceQuote.amountBps).toEqual(amount2);
    expect(res3.rfqResponse.ask?.priceQuote.amountBps).toEqual(amount1);
    expect(res4.rfqResponse.ask?.priceQuote.amountBps).toEqual(amount1);
  });

  it('find by owner', async () => {
    // TODO: Why is this response object nested?
    const responses = await makerCvg.rfqs().findResponsesByOwner({
      owner: makerCvg.identity().publicKey,
    });
    expect(responses[0].length).toBeGreaterThan(1);
    expect(responses[0][0].maker).toEqual(makerCvg.identity().publicKey);
  });

  it('find by address', async () => {
    const res = await respondToRfq(makerCvg, rfq2, amount3, amount1);
    expect(res.rfqResponse).toHaveProperty('address');

    // TODO: Why is this response object nested?
    const response = await makerCvg.rfqs().findResponseByAddress({
      address: res.rfqResponse.address,
    });
    expect(response.rfq.toBase58()).toEqual(rfq2.address.toBase58());
  });

  it('find by RFQ', async () => {
    const responses = await makerCvg.rfqs().findResponsesByRfq({
      address: rfq0.address,
    });
    expect(responses[0].length).toBeGreaterThan(1);
    expect(responses[0][0].rfq.toBase58()).toEqual(rfq0.address.toBase58());
  });

  it('confirm', async () => {
    const responses = await makerCvg.rfqs().findResponsesByRfq({
      address: rfq0.address,
    });
    const res = await confirmRfqResponse(
      takerCvg,
      rfq0,
      responses[0][0],
      Side.Ask
    );
    expect(res.response).toHaveProperty('signature');
  });

  it('cancel', async () => {
    const [res0, res1] = await Promise.all([
      respondToRfq(makerCvg, rfq2, amount3, amount1),
      respondToRfq(makerCvg, rfq2, amount3, amount2),
      // NOTE: Fails due to race condition when PDA distinguisher collides
      //respondToRfq(makerCvg, rfq2, amount3, amount1),
    ]);
    expect(res0.rfqResponse).toHaveProperty('address');
    expect(res1.rfqResponse).toHaveProperty('address');

    await makerCvg.rfqs().cancelResponses({
      responses: [res0.rfqResponse.address, res1.rfqResponse.address],
    });

    const [res2, res3] = await Promise.all([
      makerCvg.rfqs().findResponseByAddress({
        address: res0.rfqResponse.address,
      }),
      makerCvg.rfqs().findResponseByAddress({
        address: res1.rfqResponse.address,
      }),
    ]);

    expect(res2).toHaveProperty('address');
    expect(res3).toHaveProperty('address');
  });

  it('clean up', async () => {
    //const responses = await makerCvg.rfqs().findResponsesByRfq({
    //  address: rfq0.address,
    //});
    //await makerCvg.rfqs().cleanUpResponses({
    //  responses: responses[0].map((r) => r.address),
    //  maker: makerCvg.identity().publicKey,
    //});
  });

  it('clean up legs', async () => {
    // TODO
  });

  it('unlock collateral [single]', async () => {
    // TODO
  });

  it('unlock collateral [multiple]', async () => {
    // TODO
  });
});
