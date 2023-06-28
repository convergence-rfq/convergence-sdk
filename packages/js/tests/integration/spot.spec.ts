import { expect } from 'expect';
import { Side } from '@convergence-rfq/rfq';

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

    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      amountB,
      Side.Bid
    );
    expect(rfqResponse).toHaveProperty('address');

    const confirmResponse = await takerCvg.rfqs().confirmResponse({
      taker: takerCvg.identity(),
      rfq: rfq.address,
      response: rfqResponse.address,
      side: Side.Bid,
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
      side: Side.Ask,
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
      side: Side.Ask,
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
});
