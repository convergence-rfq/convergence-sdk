import expect from 'expect';
import { createRfq, createUserCvg, respondToRfq } from '../helpers';
import { QUOTE_MINT_DECIMALS } from '../constants';

describe('unit.settlementResult', () => {
  const takerCvg = createUserCvg('taker');
  const makerCvg = createUserCvg('maker');

  before(async () => {});

  it('fixed-base buy', async () => {
    const baseAmount = 2.556;
    const quoteAmount = Number((24_300.75).toFixed(6));

    const { rfq } = await createRfq(takerCvg, baseAmount, 'buy');
    expect(rfq).toHaveProperty('address');

    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      undefined,
      quoteAmount
    );
    expect(rfqResponse).toHaveProperty('address');

    const responseResult = takerCvg.rfqs().getSettlementResult({
      rfq,
      response: rfqResponse,
      confirmation: {
        side: rfqResponse?.ask ? 'ask' : 'bid',
      },
    });

    expect(responseResult).toEqual({
      quote: { receiver: 'maker', amount: 62112.717 },
      leg: { receiver: 'taker', amount: 2.556 },
    });

    const confirmResponse = await takerCvg.rfqs().confirmResponse({
      response: rfqResponse.address,
      side: 'ask',
    });

    expect(confirmResponse.response).toHaveProperty('signature');

    const refreshedResponse = await takerCvg.rfqs().findResponseByAddress({
      address: rfqResponse.address,
    });
    const confimedResponseResult = takerCvg.rfqs().getSettlementResult({
      rfq,
      response: refreshedResponse,
    });

    expect(confimedResponseResult).toEqual({
      quote: { receiver: 'maker', amount: 62112.717 },
      leg: { receiver: 'taker', amount: 2.556 },
    });
  });

  it('fixed-quote buy', async () => {
    const quoteAmount = 2341.892;
    const baseAmount = 3.456;
    const pricePerToken =
      Math.round(
        (quoteAmount / baseAmount) * Math.pow(10, QUOTE_MINT_DECIMALS)
      ) / Math.pow(10, QUOTE_MINT_DECIMALS);

    const { rfq } = await createRfq(
      takerCvg,
      quoteAmount,
      'buy',
      'fixed-quote'
    );
    expect(rfq).toHaveProperty('address');
    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      undefined,
      pricePerToken
    );
    const responseResult = takerCvg.rfqs().getSettlementResult({
      rfq,
      response: rfqResponse,
      confirmation: {
        side: rfqResponse?.ask ? 'ask' : 'bid',
      },
    });

    expect(responseResult).toEqual({
      quote: { receiver: 'maker', amount: 2341.892 },
      leg: { receiver: 'taker', amount: 3.456 },
    });
    expect(rfqResponse).toHaveProperty('address');
    const confirmResponse = await takerCvg.rfqs().confirmResponse({
      response: rfqResponse.address,
      side: 'ask',
    });
    expect(confirmResponse.response).toHaveProperty('signature');
    const refreshedResponse = await takerCvg.rfqs().findResponseByAddress({
      address: rfqResponse.address,
    });
    const confimedResponseResult = takerCvg.rfqs().getSettlementResult({
      rfq,
      response: refreshedResponse,
    });

    expect(confimedResponseResult).toEqual({
      quote: { receiver: 'maker', amount: 2341.892 },
      leg: { receiver: 'taker', amount: 3.456 },
    });
  });

  it('open-size buy', async () => {
    const baseAmount = 1;
    const price = 12_300.9783;

    const { rfq } = await createRfq(takerCvg, baseAmount, 'buy', 'open');
    expect(rfq).toHaveProperty('address');
    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      undefined,
      price,
      7.456
    );
    expect(rfqResponse).toHaveProperty('address');
    const responseResult = takerCvg.rfqs().getSettlementResult({
      rfq,
      response: rfqResponse,
      confirmation: {
        side: rfqResponse?.ask ? 'ask' : 'bid',
      },
    });

    expect(responseResult).toEqual({
      quote: { receiver: 'maker', amount: 91716.094204 },
      leg: { receiver: 'taker', amount: 7.456 },
    });
    const confirmResponse = await takerCvg.rfqs().confirmResponse({
      response: rfqResponse.address,
      side: 'ask',
    });
    expect(confirmResponse.response).toHaveProperty('signature');
    const refreshedResponse = await takerCvg.rfqs().findResponseByAddress({
      address: rfqResponse.address,
    });
    const confimedResponseResult = takerCvg.rfqs().getSettlementResult({
      rfq,
      response: refreshedResponse,
    });

    expect(confimedResponseResult).toEqual({
      quote: { receiver: 'maker', amount: 91716.094204 },
      leg: { receiver: 'taker', amount: 7.456 },
    });
  });

  it('open-size sell override', async () => {
    const baseAmount = 1;
    const quoteAmount = 70_999.97;

    const { rfq } = await createRfq(takerCvg, baseAmount, 'sell', 'open');
    expect(rfq).toHaveProperty('address');
    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      quoteAmount,
      undefined,
      8.45612346
    );
    const responseResult = takerCvg.rfqs().getSettlementResult({
      rfq,
      response: rfqResponse,
      confirmation: {
        side: rfqResponse?.ask ? 'ask' : 'bid',
      },
    });

    expect(responseResult).toEqual({
      quote: { receiver: 'taker', amount: 600384.511976 },
      leg: { receiver: 'maker', amount: 8.45612346 },
    });
    expect(rfqResponse).toHaveProperty('address');
    const confirmResponse = await takerCvg.rfqs().confirmResponse({
      response: rfqResponse.address,
      side: 'bid',
      overrideLegAmount: 5.48724568,
    });
    expect(confirmResponse.response).toHaveProperty('signature');
    const refreshedResponse = await takerCvg.rfqs().findResponseByAddress({
      address: rfqResponse.address,
    });
    const confimedResponseResult = takerCvg.rfqs().getSettlementResult({
      rfq,
      response: refreshedResponse,
    });

    expect(confimedResponseResult).toEqual({
      quote: { receiver: 'taker', amount: 389594.278662 },
      leg: { receiver: 'maker', amount: 5.48724568 },
    });
  });

  it('two way rfq , confirming ask side', async () => {
    const baseAmount = 5.63212378;
    const quoteAmount1 = 24_300.75;
    const quoteAmount2 = 28_899.75;
    const responseSide = 'bid';
    const { rfq } = await createRfq(takerCvg, baseAmount, 'two-way');
    expect(rfq).toHaveProperty('address');

    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      quoteAmount1,
      quoteAmount2
    );
    expect(rfqResponse).toHaveProperty('address');
    const responseResult = takerCvg.rfqs().getSettlementResult({
      rfq,
      response: rfqResponse,
      confirmation: {
        side: responseSide,
      },
    });

    expect(responseResult).toEqual({
      quote: { receiver: 'taker', amount: 136864.831946 },
      leg: { receiver: 'maker', amount: 5.63212378 },
    });
    const confirmResponse = await takerCvg.rfqs().confirmResponse({
      response: rfqResponse.address,
      side: 'ask',
    });
    expect(confirmResponse.response).toHaveProperty('signature');
    const refreshedResponse = await takerCvg.rfqs().findResponseByAddress({
      address: rfqResponse.address,
    });
    const confimedResponseResult = takerCvg.rfqs().getSettlementResult({
      rfq,
      response: refreshedResponse,
    });
    expect(confimedResponseResult).toEqual({
      quote: { receiver: 'maker', amount: 162766.969211 },
      leg: { receiver: 'taker', amount: 5.63212378 },
    });
  });

  it('two way rfq , confirming bid side', async () => {
    const baseAmount = 9.63212378;
    const quoteAmount1 = 14_300.75;
    const quoteAmount2 = 18_899.75;
    const responseSide = 'bid';
    const { rfq } = await createRfq(takerCvg, baseAmount, 'two-way');
    expect(rfq).toHaveProperty('address');

    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      quoteAmount1,
      quoteAmount2
    );
    expect(rfqResponse).toHaveProperty('address');
    const responseResult = takerCvg.rfqs().getSettlementResult({
      rfq,
      response: rfqResponse,
      confirmation: {
        side: responseSide,
      },
    });

    expect(responseResult).toEqual({
      quote: { receiver: 'taker', amount: 137746.594146 },
      leg: { receiver: 'maker', amount: 9.63212378 },
    });
    const confirmResponse = await takerCvg.rfqs().confirmResponse({
      response: rfqResponse.address,
      side: 'bid',
    });
    expect(confirmResponse.response).toHaveProperty('signature');
    const refreshedResponse = await takerCvg.rfqs().findResponseByAddress({
      address: rfqResponse.address,
    });
    const confimedResponseResult = takerCvg.rfqs().getSettlementResult({
      rfq,
      response: refreshedResponse,
    });
    expect(confimedResponseResult).toEqual({
      quote: { receiver: 'taker', amount: 137746.594146 },
      leg: { receiver: 'maker', amount: 9.63212378 },
    });
  });
});
