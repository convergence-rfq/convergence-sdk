import { expect } from 'expect';

import { Mint } from '../../src';
import { createUserCvg, fetchTokenAmount, sleep } from '../helpers';
import { BASE_MINT_BTC_PK, QUOTE_MINT_PK } from '../constants';

describe('integration.spot', () => {
  const takerCvg = createUserCvg('taker');
  const makerCvg = createUserCvg('maker');

  let baseMintBTC: Mint;
  let quoteMint: Mint;

  const takerMeasurerFactory = async () => {
    const [takerBtcBefore, takerQuoteBefore] = await Promise.all([
      fetchTokenAmount(takerCvg, baseMintBTC.address),
      fetchTokenAmount(takerCvg, quoteMint.address),
    ]);

    return {
      expect: async ({ leg, quote }: { leg: number; quote: number }) => {
        const [takerBtcAfter, takerQuoteAfter] = await Promise.all([
          fetchTokenAmount(takerCvg, baseMintBTC.address),
          fetchTokenAmount(takerCvg, quoteMint.address),
        ]);

        expect(takerBtcAfter - takerBtcBefore).toBeCloseTo(leg);
        expect(takerQuoteAfter - takerQuoteBefore).toBeCloseTo(quote);
      },
    };
  };

  before(async () => {
    baseMintBTC = await takerCvg
      .tokens()
      .findMintByAddress({ address: BASE_MINT_BTC_PK });
    quoteMint = await takerCvg
      .tokens()
      .findMintByAddress({ address: QUOTE_MINT_PK });
  });

  it('sell open', async () => {
    const measurer = await takerMeasurerFactory();

    const { rfq } = await takerCvg.rfqs().create({
      legAsset: baseMintBTC.address,
      quoteAsset: quoteMint.address,
      orderType: 'two-way',
      fixedSize: { type: 'open' },
      activeWindow: 3000,
    });

    const { rfqResponse: response } = await makerCvg.rfqs().respond({
      rfq: rfq.address,
      bid: { price: 21900, legAmount: 5 },
      ask: { price: 22000, legAmount: 2 },
    });

    await takerCvg.rfqs().confirmResponse({
      response: response.address,
      side: 'ask',
      overrideLegAmount: 1,
    });

    await makerCvg.rfqs().settle({ response: response.address });

    await measurer.expect({ leg: 1, quote: -22000 });

    await makerCvg.rfqs().cleanUpResponse({ response: response.address });
    await takerCvg.rfqs().cancelRfq({ rfq: rfq.address });
    await takerCvg.rfqs().cleanUpRfq({ rfq: rfq.address });
  });

  it('buy fixed size', async () => {
    const measurer = await takerMeasurerFactory();

    const { rfq } = await takerCvg.rfqs().create({
      legAsset: baseMintBTC.address,
      quoteAsset: quoteMint.address,
      orderType: 'buy',
      fixedSize: { type: 'fixed-base', amount: 12.5 },
      activeWindow: 3000,
    });

    const { rfqResponse: response } = await makerCvg.rfqs().respond({
      rfq: rfq.address,
      ask: { price: 2222.5 },
    });

    await takerCvg.rfqs().confirmResponse({
      response: response.address,
      side: 'ask',
    });

    await makerCvg.rfqs().settle({ response: response.address });

    await measurer.expect({ leg: 12.5, quote: -27781.25 });

    await makerCvg.rfqs().cleanUpResponse({ response: response.address });
    await takerCvg.rfqs().cancelRfq({ rfq: rfq.address });
    await takerCvg.rfqs().cleanUpRfq({ rfq: rfq.address });
  });

  it('sell fixed quote', async () => {
    const measurer = await takerMeasurerFactory();

    const { rfq } = await takerCvg.rfqs().create({
      legAsset: baseMintBTC.address,
      quoteAsset: quoteMint.address,
      orderType: 'sell',
      fixedSize: { type: 'fixed-quote', amount: 33333.33 },
      activeWindow: 3000,
    });

    const { rfqResponse: response } = await makerCvg.rfqs().respond({
      rfq: rfq.address,
      bid: { price: 144.5 },
    });

    await takerCvg.rfqs().confirmResponse({
      response: response.address,
      side: 'bid',
    });

    await makerCvg.rfqs().settle({ response: response.address });

    await measurer.expect({ leg: -230.68, quote: 33333.33 });

    await makerCvg.rfqs().cleanUpResponse({ response: response.address });
    await takerCvg.rfqs().cancelRfq({ rfq: rfq.address });
    await takerCvg.rfqs().cleanUpRfq({ rfq: rfq.address });
  });

  it('sell fixed quote', async () => {
    const measurer = await takerMeasurerFactory();

    const { rfq } = await takerCvg.rfqs().create({
      legAsset: baseMintBTC.address,
      quoteAsset: quoteMint.address,
      orderType: 'sell',
      fixedSize: { type: 'fixed-quote', amount: 33333.33 },
      activeWindow: 3000,
    });

    const { rfqResponse: response } = await makerCvg.rfqs().respond({
      rfq: rfq.address,
      bid: { price: 144.5 },
    });

    await takerCvg.rfqs().confirmResponse({
      response: response.address,
      side: 'bid',
    });

    await makerCvg.rfqs().settle({ response: response.address });

    await measurer.expect({ leg: -230.68, quote: 33333.33 });

    await makerCvg.rfqs().cleanUpResponse({ response: response.address });
    await takerCvg.rfqs().cancelRfq({ rfq: rfq.address });
    await takerCvg.rfqs().cleanUpRfq({ rfq: rfq.address });
  });

  it('sell multiple open', async () => {
    const measurer = await takerMeasurerFactory();

    const { rfq } = await takerCvg.rfqs().create({
      legAsset: baseMintBTC.address,
      quoteAsset: quoteMint.address,
      orderType: 'sell',
      fixedSize: { type: 'open' },
      activeWindow: 3000,
    });

    const { rfqResponse: firstResponse } = await makerCvg.rfqs().respond({
      rfq: rfq.address,
      bid: { price: 22300, legAmount: 100 },
    });

    const { rfqResponse: secondResponse } = await makerCvg.rfqs().respond({
      rfq: rfq.address,
      bid: { price: 22200, legAmount: 5 },
    });

    await takerCvg.rfqs().confirmResponse({
      response: secondResponse.address,
      side: 'bid',
    });
    await takerCvg.rfqs().confirmResponse({
      response: firstResponse.address,
      side: 'bid',
      overrideLegAmount: 2,
    });

    await makerCvg.rfqs().settle({ response: secondResponse.address });
    await makerCvg.rfqs().settle({ response: firstResponse.address });

    await measurer.expect({ leg: -7, quote: 155600 });

    await makerCvg.rfqs().cleanUpResponse({ response: secondResponse.address });
    await makerCvg.rfqs().cleanUpResponse({ response: firstResponse.address });
    await takerCvg.rfqs().cancelRfq({ rfq: rfq.address });
    await takerCvg.rfqs().cleanUpRfq({ rfq: rfq.address });
  });

  it('fail to settle', async () => {
    const measurer = await takerMeasurerFactory();

    const { rfq } = await takerCvg.rfqs().create({
      legAsset: baseMintBTC.address,
      quoteAsset: quoteMint.address,
      orderType: 'sell',
      fixedSize: { type: 'open' },
      activeWindow: 2,
    });

    const { rfqResponse: response } = await makerCvg.rfqs().respond({
      rfq: rfq.address,
      bid: { price: 22300, legAmount: 100 },
    });

    await takerCvg.rfqs().confirmResponse({
      response: response.address,
      side: 'bid',
    });

    await sleep(2);

    await takerCvg
      .rfqs()
      .unlockResponseCollateral({ response: response.address });
    await takerCvg.rfqs().cleanUpResponse({ response: response.address });
    await takerCvg.rfqs().cleanUpRfq({ rfq: rfq.address });

    await await measurer.expect({ leg: 0, quote: 0 });
  });

  it('respond without confirmation', async () => {
    const measurer = await takerMeasurerFactory();

    const { rfq } = await takerCvg.rfqs().create({
      legAsset: baseMintBTC.address,
      quoteAsset: quoteMint.address,
      orderType: 'sell',
      fixedSize: { type: 'open' },
      activeWindow: 2,
    });

    const { rfqResponse: response } = await makerCvg.rfqs().respond({
      rfq: rfq.address,
      bid: { price: 22300, legAmount: 100 },
    });

    await sleep(2);

    await makerCvg.rfqs().cleanUpResponse({ response: response.address });
    await takerCvg.rfqs().cleanUpRfq({ rfq: rfq.address });

    await await measurer.expect({ leg: 0, quote: 0 });
  });

  it('cancel rfq', async () => {
    const measurer = await takerMeasurerFactory();

    const { rfq } = await takerCvg.rfqs().create({
      legAsset: baseMintBTC.address,
      quoteAsset: quoteMint.address,
      orderType: 'sell',
      fixedSize: { type: 'open' },
      activeWindow: 2,
    });

    await takerCvg.rfqs().cancelRfq({ rfq: rfq.address });
    await takerCvg.rfqs().cleanUpRfq({ rfq: rfq.address });

    await await measurer.expect({ leg: 0, quote: 0 });
  });
});
