import { expect } from 'expect';

import { Mint } from '../../src';
import {
  createUserCvg,
  fetchTokenAmount,
  prepareRfqSettlement,
  settleRfq,
  createRfq,
  respondToRfq,
  expectError,
} from '../helpers';
import {
  BASE_MINT_BTC_PK,
  DAO_PK,
  MAKER_PK,
  QUOTE_MINT_PK,
  TAKER_PK,
  TESTING_PK,
} from '../constants';

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
    const baseAmount = 1.536_421;
    const quoteAmount = 22_000.86;

    const { rfq } = await createRfq(takerCvg, baseAmount, 'sell');
    expect(rfq).toHaveProperty('address');

    const { rfqResponse } = await respondToRfq(makerCvg, rfq, quoteAmount);
    expect(rfqResponse).toHaveProperty('address');

    const confirmResponse = await takerCvg.rfqs().confirmResponse({
      taker: takerCvg.identity(),
      rfq: rfq.address,
      response: rfqResponse.address,
      side: 'bid',
    });

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
    expect(takerQuoteAfter).toBeCloseTo(takerQuoteBefore + quoteAmount);
    expect(takerBtcAfter).toBeCloseTo(takerBtcBefore - baseAmount);
  });

  it('buy', async () => {
    const baseAmount = 2.5;
    const quoteAmount = 24_300.75 * baseAmount;

    const { rfq } = await createRfq(takerCvg, baseAmount, 'buy');
    expect(rfq).toHaveProperty('address');

    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      undefined,
      quoteAmount
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
    expect(makerBtcAfter).toBe(makerBtcBefore - baseAmount);
    expect(takerBtcAfter).toBe(takerBtcBefore + baseAmount);
  });

  it('two-way', async () => {
    const baseAmount = 2.5;
    const quoteAmount = 24_300.75 * baseAmount;

    const { rfq } = await createRfq(takerCvg, baseAmount, 'two-way');
    expect(rfq).toHaveProperty('address');

    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      undefined,
      quoteAmount
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
    expect(makerBtcAfter).toBe(makerBtcBefore - baseAmount);
    expect(takerBtcAfter).toBe(takerBtcBefore + baseAmount);
  });

  it('Create a Rfq with a whitelist and add makers address to that  ', async () => {
    const baseAmount = 2.5;
    const quoteAmount = 24_300.75 * baseAmount;

    const counterParties = [MAKER_PK, DAO_PK, TESTING_PK];
    const { rfq } = await createRfq(
      takerCvg,
      baseAmount,
      'two-way',
      counterParties,
      undefined
    );
    expect(rfq).toHaveProperty('address');
    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      undefined,
      quoteAmount
    );

    expect(rfqResponse).toHaveProperty('address');
    const confirmResponse = await takerCvg.rfqs().confirmResponse({
      rfq: rfq.address,
      response: rfqResponse.address,
      side: 'ask',
    });
    expect(confirmResponse.response).toHaveProperty('signature');
  });

  it('Create a Rfq with a whitelist , maker is not whitelisted resulting in error in responding ', async () => {
    const baseAmount = 2.5;
    const quoteAmount = 24_300.75 * baseAmount;
    const counterParties = [DAO_PK, TESTING_PK];
    const { rfq } = await createRfq(
      takerCvg,
      baseAmount,
      'two-way',
      counterParties,
      undefined
    );
    expect(rfq).toHaveProperty('address');

    await expectError(
      respondToRfq(makerCvg, rfq, undefined, quoteAmount),
      'MakerAddressNotWhitelisted'
    );
  });
});
