import expect from 'expect';
import {
  createAmericanCoveredCallRfq,
  createRfq,
  createUserCvg,
  respondToRfq,
} from '../helpers';
import { Mint } from '../../src';
import {
  BASE_MINT_BTC_PK,
  QUOTE_MINT_DECIMALS,
  QUOTE_MINT_PK,
} from '../constants';

describe('unit.settlementResult', () => {
  const takerCvg = createUserCvg('taker');
  const makerCvg = createUserCvg('maker');
  let baseMint: Mint;
  let quoteMint: Mint;

  before(async () => {
    baseMint = await takerCvg
      .tokens()
      .findMintByAddress({ address: BASE_MINT_BTC_PK });
    quoteMint = await takerCvg
      .tokens()
      .findMintByAddress({ address: QUOTE_MINT_PK });
  });

  it('fixed-base buy', async () => {
    const baseAmount = 2.556;
    const quoteAmount = Number((24_300.75 * baseAmount).toFixed(6));

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
      legs: [{ receiver: 'taker', amount: 2.556 }],
    });

    const confirmResponse = await takerCvg.rfqs().confirmResponse({
      rfq: rfq.address,
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
      legs: [{ receiver: 'taker', amount: 2.556 }],
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
      undefined,
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
      legs: [{ receiver: 'taker', amount: 3.456 }],
    });
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
    const confimedResponseResult = takerCvg.rfqs().getSettlementResult({
      rfq,
      response: refreshedResponse,
    });

    expect(confimedResponseResult).toEqual({
      quote: { receiver: 'maker', amount: 2341.892 },
      legs: [{ receiver: 'taker', amount: 3.456 }],
    });
  });

  it('open-size buy', async () => {
    const baseAmount = 1;
    const quoteAmount = 12_300.9783;

    const { rfq } = await createRfq(
      takerCvg,
      baseAmount,
      'buy',
      undefined,
      'open'
    );
    expect(rfq).toHaveProperty('address');
    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      undefined,
      quoteAmount,
      undefined,
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
      quote: { receiver: 'maker', amount: 91716.094204801 },
      legs: [{ receiver: 'taker', amount: 7.456 }],
    });
    const confirmResponse = await takerCvg.rfqs().confirmResponse({
      rfq: rfq.address,
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
      quote: { receiver: 'maker', amount: 91716.094204801 },
      legs: [{ receiver: 'taker', amount: 7.456 }],
    });
  });

  it('open-size sell override', async () => {
    const baseAmount = 1;
    const quoteAmount = 70_999.97;

    const { rfq } = await createRfq(
      takerCvg,
      baseAmount,
      'sell',
      undefined,
      'open'
    );
    expect(rfq).toHaveProperty('address');
    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      quoteAmount,
      undefined,
      undefined,
      8.456123456
    );
    const responseResult = takerCvg.rfqs().getSettlementResult({
      rfq,
      response: rfqResponse,
      confirmation: {
        side: rfqResponse?.ask ? 'ask' : 'bid',
      },
    });

    expect(responseResult).toEqual({
      quote: { receiver: 'taker', amount: 600384.511692296 },
      legs: [{ receiver: 'maker', amount: 8.456123456 }],
    });
    expect(rfqResponse).toHaveProperty('address');
    const confirmResponse = await takerCvg.rfqs().confirmResponse({
      rfq: rfq.address,
      response: rfqResponse.address,
      side: 'bid',
      overrideLegMultiplier: 5.487245678,
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
      quote: { receiver: 'taker', amount: 389594.278520629 },
      legs: [{ receiver: 'maker', amount: 5.487245678 }],
    });
  });

  it('two way rfq , confirming ask side', async () => {
    const baseAmount = 5.632123779;
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
      quote: { receiver: 'taker', amount: 24300.75 },
      legs: [{ receiver: 'maker', amount: 5.632123779 }],
    });
    const confirmResponse = await takerCvg.rfqs().confirmResponse({
      rfq: rfq.address,
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
      quote: { receiver: 'maker', amount: 28899.75 },
      legs: [{ receiver: 'taker', amount: 5.632123779 }],
    });
  });

  it('two way rfq , confirming bid side', async () => {
    const baseAmount = 9.632123779;
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
      quote: { receiver: 'taker', amount: 14300.75 },
      legs: [{ receiver: 'maker', amount: 9.632123779 }],
    });
    const confirmResponse = await takerCvg.rfqs().confirmResponse({
      rfq: rfq.address,
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
      quote: { receiver: 'taker', amount: 14300.75 },
      legs: [{ receiver: 'maker', amount: 9.632123779 }],
    });
  });

  it('fixed-base american covered call', async () => {
    const { rfq } = await createAmericanCoveredCallRfq(
      takerCvg,
      'sell',
      baseMint,
      quoteMint
    );
    expect(rfq).toHaveProperty('address');

    const { rfqResponse } = await respondToRfq(makerCvg, rfq, 12.1);
    expect(rfqResponse).toHaveProperty('address');
    const responseResult = takerCvg.rfqs().getSettlementResult({
      rfq,
      response: rfqResponse,
      confirmation: {
        side: rfqResponse?.ask ? 'ask' : 'bid',
      },
    });

    expect(responseResult).toEqual({
      quote: { receiver: 'taker', amount: 12.1 },
      legs: [
        { receiver: 'maker', amount: 1 },
        { receiver: 'maker', amount: 1 },
      ],
    });
    const { response: confirmResponse } = await takerCvg
      .rfqs()
      .confirmResponse({
        rfq: rfq.address,
        response: rfqResponse.address,
        side: 'bid',
      });
    expect(confirmResponse).toHaveProperty('signature');
    const refreshedResponse = await takerCvg.rfqs().findResponseByAddress({
      address: rfqResponse.address,
    });
    const confimedResponseResult = takerCvg.rfqs().getSettlementResult({
      rfq,
      response: refreshedResponse,
    });
    expect(confimedResponseResult).toEqual({
      quote: { receiver: 'taker', amount: 12.1 },
      legs: [
        { receiver: 'maker', amount: 1 },
        { receiver: 'maker', amount: 1 },
      ],
    });
  });
  it('fixed-base american covered call', async () => {
    const { response, rfq } = await createAmericanCoveredCallRfq(
      takerCvg,
      'sell',
      baseMint,
      quoteMint
    );
    expect(rfq).toHaveProperty('address');
    expect(response.signature).toBeDefined();

    const { rfqResponse } = await respondToRfq(makerCvg, rfq, 12.34);
    const responseResult = takerCvg.rfqs().getSettlementResult({
      rfq,
      response: rfqResponse,
      confirmation: {
        side: rfqResponse?.ask ? 'ask' : 'bid',
      },
    });

    expect(responseResult).toEqual({
      quote: { receiver: 'taker', amount: 12.34 },
      legs: [
        { receiver: 'maker', amount: 1 },
        { receiver: 'maker', amount: 1 },
      ],
    });
    await takerCvg.rfqs().confirmResponse({
      rfq: rfq.address,
      response: rfqResponse.address,
      side: 'bid',
    });

    const refreshedResponse = await takerCvg.rfqs().findResponseByAddress({
      address: rfqResponse.address,
    });
    const confimedResponseResult = takerCvg.rfqs().getSettlementResult({
      rfq,
      response: refreshedResponse,
    });
    expect(confimedResponseResult).toEqual({
      quote: { receiver: 'taker', amount: 12.34 },
      legs: [
        { receiver: 'maker', amount: 1 },
        { receiver: 'maker', amount: 1 },
      ],
    });
  });
});
