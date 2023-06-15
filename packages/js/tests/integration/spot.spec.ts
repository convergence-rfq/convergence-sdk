import { expect } from 'expect';

import { OrderType, Quote, Side } from '@convergence-rfq/rfq';
import { sleep } from '@bundlr-network/client/build/common/utils';
import {
  createUserCvg,
  fetchTokenAmount,
  confirmRfqResponse,
  prepareSettlement,
  settleRfq,
} from '../helpers';
import {
  BASE_MINT_BTC_PK,
  QUOTE_MINT_PK,
  TAKER_PK,
  BASE_MINT_SOL_PK,
} from '../constants';
import { Mint, SpotLegInstrument, SpotQuoteInstrument } from '../../src';

describe('integration.spot', () => {
  const takerCvg = createUserCvg('taker');
  const makerCvg = createUserCvg('maker');
  const dao = createUserCvg('dao');

  let baseMintBTC: Mint;
  let quoteMint: Mint;
  let baseMintSOL: Mint;

  before(async () => {
    baseMintBTC = await takerCvg
      .tokens()
      .findMintByAddress({ address: BASE_MINT_BTC_PK });
    baseMintSOL = await takerCvg
      .tokens()
      .findMintByAddress({ address: BASE_MINT_SOL_PK });
    quoteMint = await takerCvg
      .tokens()
      .findMintByAddress({ address: QUOTE_MINT_PK });
  });

  it('sell 1.0 BTC', async () => {
    const { rfq } = await takerCvg.rfqs().createAndFinalize({
      instruments: [
        await SpotLegInstrument.create(takerCvg, baseMintBTC, 1, Side.Bid),
      ],
      orderType: OrderType.Sell,
      fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
      quoteAsset: await SpotQuoteInstrument.create(takerCvg, quoteMint),
    });
    expect(rfq).toHaveProperty('address');

    const respond: Quote = {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 22_000 },
    };
    const { rfqResponse } = await makerCvg.rfqs().respond({
      bid: respond,
      rfq: rfq.address,
    });

    const { response } = await confirmRfqResponse(
      takerCvg,
      rfq,
      rfqResponse,
      Side.Bid
    );
    expect(response).toHaveProperty('signature');

    const takerBtcBefore = await fetchTokenAmount(
      takerCvg,
      baseMintBTC.address,
      TAKER_PK
    );
    const takerQuoteBefore = await fetchTokenAmount(
      takerCvg,
      quoteMint.address,
      TAKER_PK
    );

    const takerResult = await prepareSettlement(takerCvg, rfq, rfqResponse);
    expect(takerResult.response).toHaveProperty('signature');

    const makerResult = await prepareSettlement(makerCvg, rfq, rfqResponse);
    expect(makerResult.response).toHaveProperty('signature');

    const settleResult = await settleRfq(takerCvg, rfq, rfqResponse);
    expect(settleResult.response).toHaveProperty('signature');

    const takerBtcAfter = await fetchTokenAmount(
      takerCvg,
      baseMintBTC.address,
      TAKER_PK
    );
    const takerQuoteAfter = await fetchTokenAmount(
      takerCvg,
      quoteMint.address,
      TAKER_PK
    );
    expect(takerBtcAfter).toBe(takerBtcBefore - 1);
    expect(takerQuoteAfter).toBe(takerQuoteBefore + 22_000);
  });

  it('buy 1.0 BTC', async () => {
    const { rfq, response } = await takerCvg.rfqs().createAndFinalize({
      instruments: [
        await SpotLegInstrument.create(takerCvg, baseMintBTC, 5, Side.Bid),
      ],
      orderType: OrderType.Buy,
      fixedSize: { __kind: 'None', padding: 0 },
      quoteAsset: await SpotQuoteInstrument.create(takerCvg, quoteMint),
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
    await confirmRfqResponse(takerCvg, rfq, rfqResponse, Side.Ask);
    await prepareSettlement(makerCvg, rfq, rfqResponse);
    await prepareSettlement(takerCvg, rfq, rfqResponse);
    await settleRfq(takerCvg, rfq, rfqResponse);
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

  it('send rfq and respond with floating point number with one leg', async () => {
    const { rfq } = await takerCvg.rfqs().createAndFinalize({
      instruments: [
        await SpotLegInstrument.create(takerCvg, baseMintBTC, 6.78, Side.Bid),
      ],
      orderType: OrderType.Sell,
      fixedSize: { __kind: 'BaseAsset', legsMultiplierBps: 1 },
      quoteAsset: await SpotQuoteInstrument.create(takerCvg, quoteMint),
    });

    const respond: Quote = {
      __kind: 'FixedSize',
      priceQuote: { __kind: 'AbsolutePrice', amountBps: 0.0034 },
    };
    const { rfqResponse } = await makerCvg.rfqs().respond({
      bid: respond,
      rfq: rfq.address,
    });
    await confirmRfqResponse(takerCvg, rfq, rfqResponse, Side.Bid);

    const takerBtcBefore = await fetchTokenAmount(
      takerCvg,
      baseMintBTC.address,
      TAKER_PK
    );
    const takerQuoteBefore = await fetchTokenAmount(
      takerCvg,
      quoteMint.address,
      TAKER_PK
    );

    const takerResult = await prepareSettlement(takerCvg, rfq, rfqResponse);
    expect(takerResult.response).toHaveProperty('signature');

    const makerResult = await prepareSettlement(makerCvg, rfq, rfqResponse);
    expect(makerResult.response).toHaveProperty('signature');

    const settleResult = await settleRfq(takerCvg, rfq, rfqResponse);
    expect(settleResult.response).toHaveProperty('signature');

    const takerBtcAfter = await fetchTokenAmount(
      takerCvg,
      baseMintBTC.address,
      TAKER_PK
    );
    const takerQuoteAfter = await fetchTokenAmount(
      takerCvg,
      quoteMint.address,
      TAKER_PK
    );
    expect(takerBtcAfter.toFixed(2)).toBe((takerBtcBefore - 6.78).toFixed(2));
    expect(takerQuoteAfter.toFixed(2)).toBe(
      (takerQuoteBefore + 0.0034).toFixed(2)
    );
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
      baseMintBTC.address,
      TAKER_PK
    );
    const takerQuoteBefore = await fetchTokenAmount(
      takerCvg,
      quoteMint.address,
      TAKER_PK
    );
    const takerResult = await prepareSettlement(takerCvg, rfq, rfqResponse);
    expect(takerResult.response).toHaveProperty('signature');

    const makerResult = await prepareSettlement(makerCvg, rfq, rfqResponse);
    expect(makerResult.response).toHaveProperty('signature');

    const settleResult = await settleRfq(takerCvg, rfq, rfqResponse);
    expect(settleResult.response).toHaveProperty('signature');

    const takerBtcAfter = await fetchTokenAmount(
      takerCvg,
      baseMintBTC.address,
      TAKER_PK
    );
    const takerQuoteAfter = await fetchTokenAmount(
      takerCvg,
      quoteMint.address,
      TAKER_PK
    );
    expect(takerBtcAfter.toFixed(2)).toBe(
      (takerBtcBefore - amountA - amountB).toFixed(2)
    );
    expect(takerQuoteAfter.toFixed(2)).toBe(
      (takerQuoteBefore + amountC).toFixed(2)
    );
  });
});
