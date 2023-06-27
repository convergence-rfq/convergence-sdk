import { expect } from 'expect';
import { ResponseState } from '@convergence-rfq/rfq';

import { OrderType, Rfq, Side } from '../../src';
import {
  createUserCvg,
  createRfq,
  respondToRfq,
  prepareRfqSettlement,
  settleRfq,
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
      createRfq(takerCvg, amount0, 'buy'),
      createRfq(takerCvg, amount0, 'sell'),
      createRfq(takerCvg, amount0, 'two-way'),
    ]);

    expect(res0.response).toHaveProperty('signature');
    expect(res1.response).toHaveProperty('signature');
    expect(res2.response).toHaveProperty('signature');

    rfq0 = res0.rfq;
    rfq1 = res1.rfq;
    rfq2 = res2.rfq;
  });

  it('respond [buy]', async () => {
    const [res0, res1, res2, res3, res4] = await Promise.all([
      respondToRfq(makerCvg, rfq0, undefined, amount1),
      respondToRfq(makerCvg, rfq0, undefined, amount2),
      respondToRfq(makerCvg, rfq0, undefined, amount3),
      respondToRfq(makerCvg, rfq0, undefined, amount1),
      respondToRfq(makerCvg, rfq0, undefined, amount1),
    ]);

    expect(res0.rfqResponse.ask?.priceQuote.amountBps).toEqual(amount1);
    expect(res1.rfqResponse.ask?.priceQuote.amountBps).toEqual(amount2);
    expect(res2.rfqResponse.ask?.priceQuote.amountBps).toEqual(amount3);
    expect(res3.rfqResponse.ask?.priceQuote.amountBps).toEqual(amount1);
    expect(res4.rfqResponse.ask?.priceQuote.amountBps).toEqual(amount1);
  });

  it('respond [sell]', async () => {
    const [res0, res1, res2, res3, res4] = await Promise.all([
      respondToRfq(makerCvg, rfq1, amount1),
      respondToRfq(makerCvg, rfq1, amount2),
      respondToRfq(makerCvg, rfq1, amount3),
      respondToRfq(makerCvg, rfq1, amount1),
      respondToRfq(makerCvg, rfq1, amount1),
    ]);

    expect(res0.rfqResponse.bid?.priceQuote.amountBps).toEqual(amount1);
    expect(res1.rfqResponse.bid?.priceQuote.amountBps).toEqual(amount2);
    expect(res2.rfqResponse.bid?.priceQuote.amountBps).toEqual(amount3);
    expect(res3.rfqResponse.bid?.priceQuote.amountBps).toEqual(amount1);
    expect(res4.rfqResponse.bid?.priceQuote.amountBps).toEqual(amount1);
  });

  it('respond [two-way]', async () => {
    const [res0, res1, res2, res3, res4] = await Promise.all([
      respondToRfq(makerCvg, rfq2, amount3, amount1),
      respondToRfq(makerCvg, rfq2, amount1, amount2),
      respondToRfq(makerCvg, rfq2, amount3, amount2),
      respondToRfq(makerCvg, rfq2, amount3, amount1),
      respondToRfq(makerCvg, rfq2, amount3, amount1),
    ]);

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
    const responses = await makerCvg.rfqs().findResponsesByOwner({
      owner: makerCvg.identity().publicKey,
    });
    expect(responses.length).toBeGreaterThan(1);
    responses.map((r) =>
      expect(r.maker).toEqual(makerCvg.identity().publicKey)
    );
  });

  it('find by address', async () => {
    const res = await respondToRfq(makerCvg, rfq2, amount3, amount1);
    const response = await makerCvg.rfqs().findResponseByAddress({
      address: res.rfqResponse.address,
    });
    expect(response.rfq.toBase58()).toEqual(rfq2.address.toBase58());
  });

  it('find by RFQ', async () => {
    const responses = await makerCvg.rfqs().findResponsesByRfq({
      address: rfq0.address,
    });
    expect(responses.length).toBeGreaterThan(1);
    responses.map((r) =>
      expect(r.rfq.toBase58()).toEqual(rfq0.address.toBase58())
    );
  });

  it('confirm [bid]', async () => {
    const responses = await makerCvg.rfqs().findResponsesByRfq({
      address: rfq1.address,
    });
    const res = await takerCvg.rfqs().confirmResponse({
      rfq: rfq1.address,
      response: responses[0].address,
      side: Side.Bid,
    });
    expect(res.response).toHaveProperty('signature');

    const response = await makerCvg.rfqs().findResponseByAddress({
      address: responses[0].address,
    });
    expect(response.confirmed?.side).toBe(Side.Bid);
  });

  it('confirm [ask]', async () => {
    const responses = await makerCvg.rfqs().findResponsesByRfq({
      address: rfq0.address,
    });
    const res = await takerCvg.rfqs().confirmResponse({
      rfq: rfq0.address,
      response: responses[0].address,
      side: Side.Ask,
    });
    expect(res.response).toHaveProperty('signature');

    const response = await makerCvg.rfqs().findResponseByAddress({
      address: responses[0].address,
    });
    expect(response.confirmed?.side).toBe(Side.Ask);
  });

  it('cancel', async () => {
    const responsesBefore = await makerCvg.rfqs().findResponsesByRfq({
      address: rfq2.address,
    });

    // TODO: Check signature
    await makerCvg.rfqs().cancelResponses({
      responses: responsesBefore,
    });

    const responsesAfter = await makerCvg.rfqs().findResponsesByRfq({
      address: rfq2.address,
    });
    responsesAfter.map((r) => expect(r.state).toBe(ResponseState.Canceled));
  });

  it('unlock collateral', async () => {
    const responsesBefore = await makerCvg.rfqs().findResponsesByRfq({
      address: rfq2.address,
    });

    // TODO: Check signature
    await makerCvg.rfqs().unlockResponseCollateral({
      responses: responsesBefore,
    });

    const responsesAfter = await makerCvg.rfqs().findResponsesByRfq({
      address: rfq2.address,
    });
    responsesAfter.map((r) => expect(r.makerCollateralLocked).toBe(0));
  });

  it('clean up', async () => {
    const responses = await makerCvg.rfqs().findResponsesByRfq({
      address: rfq2.address,
    });
    // TODO: Check signature
    await makerCvg.rfqs().cleanUpResponses({
      responses,
      maker: makerCvg.identity().publicKey,
    });
  });

  it('clean up legs', async () => {
    const responses = await makerCvg.rfqs().findResponsesByRfq({
      address: rfq0.address,
    });

    const [res0, res1] = await Promise.all([
      prepareRfqSettlement(takerCvg, rfq0, responses[0]),
      prepareRfqSettlement(makerCvg, rfq0, responses[0]),
    ]);
    const res2 = await settleRfq(takerCvg, rfq0, responses[0]);

    expect(res0.response).toHaveProperty('signature');
    expect(res1.response).toHaveProperty('signature');
    expect(res2.response).toHaveProperty('signature');

    // TODO: Finish
    // TODO: Check signature
    //await makerCvg.rfqs().cleanUpResponseLegs({
    //  rfq: rfq0.address,
    //  response: response.address,
    //  legAmountToClear: 1,
    //  firstToPrepare: takerCvg.identity().publicKey,
    //});
  });
});
