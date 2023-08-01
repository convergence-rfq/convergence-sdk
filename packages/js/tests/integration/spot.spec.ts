import { expect } from 'expect';

import { Mint } from '../../src';
import {
  createUserCvg,
  fetchTokenAmount,
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
    const amountA = 1.536_421;
    const amountB = 22_000.86;

    const { rfq } = await createRfq(takerCvg, amountA, 'sell');
    expect(rfq).toHaveProperty('address');

    const { rfqResponse } = await respondToRfq(makerCvg, rfq, amountB);
    expect(rfqResponse).toHaveProperty('address');

    const confirmResponse = await takerCvg.rfqs().confirmResponse({
      taker: takerCvg.identity(),
      rfq: rfq.address,
      response: rfqResponse.address,
      side: 'bid',
    });
    const refreshedResponse = await takerCvg.rfqs().findResponseByAddress({
      address: rfqResponse.address,
    });
    expect(confirmResponse.response).toHaveProperty('signature');
    const result = await takerCvg
      .rfqs()
      .getSettlementResult({ rfq, response: refreshedResponse });

    expect(result).toEqual({
      quote: { receiver: 'taker', amount: 22000.86 },
      legs: [{ receiver: 'maker', amount: 1.536421 }],
    });

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

    const { rfq } = await createRfq(takerCvg, amountA, 'buy');
    expect(rfq).toHaveProperty('address');

    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      undefined,
      amountB
    );
    expect(rfqResponse).toHaveProperty('address');

    const confirmResponse = await takerCvg.rfqs().confirmResponse({
      rfq: rfq.address,
      response: rfqResponse.address,
      side: 'ask',
    });

    const refreshedResponse = await takerCvg.rfqs().findResponseByAddress({
      address: rfqResponse.address,
    });
    const result = await takerCvg
      .rfqs()
      .getSettlementResult({ rfq, response: refreshedResponse });

    expect(result).toEqual({
      quote: { receiver: 'maker', amount: 60751.875 },
      legs: [{ receiver: 'taker', amount: 2.5 }],
    });
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

  it('two-way', async () => {
    const amountA = 2.5;
    const amountB = 24_300.75 * amountA;

    const { rfq } = await createRfq(takerCvg, amountA, 'two-way');
    expect(rfq).toHaveProperty('address');

    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      undefined,
      amountB
    );
    expect(rfqResponse).toHaveProperty('address');

    const confirmResponse = await takerCvg.rfqs().confirmResponse({
      rfq: rfq.address,
      response: rfqResponse.address,
      side: 'ask',
    });
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

  it('open-size buy', async () => {
    const amountA = 1;
    const amountB = 70;

    const { rfq } = await createRfq(takerCvg, amountA, 'buy', 'open');
    expect(rfq).toHaveProperty('address');
    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      undefined,
      amountB,
      7
    );
    expect(rfqResponse).toHaveProperty('address');
    const confirmResponse = await takerCvg.rfqs().confirmResponse({
      rfq: rfq.address,
      response: rfqResponse.address,
      side: 'ask',
    });
    expect(confirmResponse.response).toHaveProperty('signature');
    const refreshedResponse = await takerCvg.rfqs().findResponseByAddress({
      address: rfqResponse.address,
    });
    const result = await takerCvg
      .rfqs()
      .getSettlementResult({ rfq, response: refreshedResponse });

    expect(result).toEqual({
      quote: { receiver: 'maker', amount: 490 },
      legs: [{ receiver: 'taker', amount: 7 }],
    });
  });

  it('open-size buy override', async () => {
    const amountA = 1;
    const amountB = 70;

    const { rfq } = await createRfq(takerCvg, amountA, 'buy', 'open');
    expect(rfq).toHaveProperty('address');
    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      undefined,
      amountB,
      7
    );
    expect(rfqResponse).toHaveProperty('address');
    const confirmResponse = await takerCvg.rfqs().confirmResponse({
      rfq: rfq.address,
      response: rfqResponse.address,
      side: 'ask',
      overrideLegMultiplierBps: 5,
    });
    expect(confirmResponse.response).toHaveProperty('signature');
    const refreshedResponse = await takerCvg.rfqs().findResponseByAddress({
      address: rfqResponse.address,
    });
    const result = await takerCvg
      .rfqs()
      .getSettlementResult({ rfq, response: refreshedResponse });

    expect(result).toEqual({
      quote: { receiver: 'maker', amount: 350 },
      legs: [{ receiver: 'taker', amount: 5 }],
    });
  });

  it('fixed-quote buy', async () => {
    const amountA = 2000;
    const amountB = 3.5;
    const pricePerToken =
      Math.round((amountA / amountB) * Math.pow(10, 6)) / Math.pow(10, 6);

    const { rfq } = await createRfq(takerCvg, amountA, 'sell', 'fixed-quote');
    expect(rfq).toHaveProperty('address');
    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      pricePerToken,
      undefined
    );
    expect(rfqResponse).toHaveProperty('address');
    const confirmResponse = await takerCvg.rfqs().confirmResponse({
      rfq: rfq.address,
      response: rfqResponse.address,
      side: 'bid',
    });
    expect(confirmResponse.response).toHaveProperty('signature');
    const refreshedResponse = await takerCvg.rfqs().findResponseByAddress({
      address: rfqResponse.address,
    });
    const result = await takerCvg
      .rfqs()
      .getSettlementResult({ rfq, response: refreshedResponse });

    expect(result).toEqual({
      quote: { receiver: 'taker', amount: 2000 },
      legs: [{ receiver: 'maker', amount: 3.5 }],
    });
  });
});
