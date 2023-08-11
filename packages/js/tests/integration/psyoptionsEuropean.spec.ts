import { expect } from 'expect';

import { Mint } from '@solana/spl-token';
import {
  prepareRfqSettlement,
  respondToRfq,
  settleRfq,
  createUserCvg,
  createEuropeanCoveredCallRfq,
  createEuropeanOpenSizeCallSpdOptionRfq,
  setupEuropean,
  createEuropeanFixedBaseStraddle,
} from '../helpers';
import { BASE_MINT_BTC_PK, QUOTE_MINT_PK } from '../constants';

describe('integration.psyoptionsEuropean', () => {
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

  it('covered call [sell]', async () => {
    const { rfq, response } = await createEuropeanCoveredCallRfq(
      takerCvg,
      'sell',
      baseMint,
      quoteMint
    );

    expect(rfq).toHaveProperty('address');
    expect(response.signature).toBeDefined();

    const { rfqResponse } = await respondToRfq(makerCvg, rfq, 12.0);
    await takerCvg.rfqs().confirmResponse({
      rfq: rfq.address,
      response: rfqResponse.address,
      side: 'bid',
    });

    await setupEuropean(takerCvg, rfqResponse);

    await prepareRfqSettlement(makerCvg, rfq, rfqResponse);
    await prepareRfqSettlement(takerCvg, rfq, rfqResponse);

    await settleRfq(takerCvg, rfq, rfqResponse);
  });
  it('fixed-size european straddle [buy]', async () => {
    const { rfq } = await createEuropeanFixedBaseStraddle(
      takerCvg,
      'buy',
      baseMint,
      quoteMint
    );
    expect(rfq).toHaveProperty('address');
    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      undefined,
      60_123
    );
    expect(rfqResponse).toHaveProperty('address');
    const { response: confirmResponse } = await takerCvg
      .rfqs()
      .confirmResponse({
        rfq: rfq.address,
        response: rfqResponse.address,
        side: 'ask',
      });
    expect(confirmResponse).toHaveProperty('signature');
    await setupEuropean(takerCvg, rfqResponse);
    await setupEuropean(makerCvg, rfqResponse);
    const takerResponse = await prepareRfqSettlement(
      takerCvg,
      rfq,
      rfqResponse
    );
    expect(takerResponse.response).toHaveProperty('signature');

    const makerResponse = await prepareRfqSettlement(
      makerCvg,
      rfq,
      rfqResponse
    );
    expect(makerResponse.response).toHaveProperty('signature');

    const settlementResponse = await settleRfq(takerCvg, rfq, rfqResponse);
    expect(settlementResponse.response).toHaveProperty('signature');
  });

  it('fixed-size american straddle [sell]', async () => {
    const { rfq } = await createEuropeanFixedBaseStraddle(
      takerCvg,
      'sell',
      baseMint,
      quoteMint
    );
    expect(rfq).toHaveProperty('address');
    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      55_133,
      undefined
    );
    expect(rfqResponse).toHaveProperty('address');
    const { response: confirmResponse } = await takerCvg
      .rfqs()
      .confirmResponse({
        rfq: rfq.address,
        response: rfqResponse.address,
        side: 'bid',
      });
    expect(confirmResponse).toHaveProperty('signature');
    await setupEuropean(takerCvg, rfqResponse);
    await setupEuropean(makerCvg, rfqResponse);
    const takerResponse = await prepareRfqSettlement(
      takerCvg,
      rfq,
      rfqResponse
    );
    expect(takerResponse.response).toHaveProperty('signature');

    const makerResponse = await prepareRfqSettlement(
      makerCvg,
      rfq,
      rfqResponse
    );
    expect(makerResponse.response).toHaveProperty('signature');

    const settlementResponse = await settleRfq(takerCvg, rfq, rfqResponse);
    expect(settlementResponse.response).toHaveProperty('signature');
  });

  it('fixed-size american straddle [2-way]', async () => {
    const { rfq } = await createEuropeanFixedBaseStraddle(
      takerCvg,
      'two-way',
      baseMint,
      quoteMint
    );
    expect(rfq).toHaveProperty('address');
    const { rfqResponse } = await respondToRfq(makerCvg, rfq, 61_222, 60_123);
    expect(rfqResponse).toHaveProperty('address');
    const { response: confirmResponse } = await takerCvg
      .rfqs()
      .confirmResponse({
        rfq: rfq.address,
        response: rfqResponse.address,
        side: 'ask',
      });
    expect(confirmResponse).toHaveProperty('signature');
    await setupEuropean(takerCvg, rfqResponse);
    await setupEuropean(makerCvg, rfqResponse);
    const takerResponse = await prepareRfqSettlement(
      takerCvg,
      rfq,
      rfqResponse
    );
    expect(takerResponse.response).toHaveProperty('signature');

    const makerResponse = await prepareRfqSettlement(
      makerCvg,
      rfq,
      rfqResponse
    );
    expect(makerResponse.response).toHaveProperty('signature');

    const settlementResponse = await settleRfq(takerCvg, rfq, rfqResponse);
    expect(settlementResponse.response).toHaveProperty('signature');
  });

  it('open size european call Spread [buy]', async () => {
    const { rfq } = await createEuropeanOpenSizeCallSpdOptionRfq(
      takerCvg,
      'buy',
      baseMint,
      quoteMint
    );
    expect(rfq).toHaveProperty('address');
    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      undefined,
      150_123,
      5
    );
    expect(rfqResponse).toHaveProperty('address');

    const { response: confirmResponse } = await takerCvg
      .rfqs()
      .confirmResponse({
        rfq: rfq.address,
        response: rfqResponse.address,
        side: 'ask',
        overrideLegMultiplierBps: 4,
      });
    expect(confirmResponse).toHaveProperty('signature');
    await setupEuropean(takerCvg, rfqResponse);
    await setupEuropean(makerCvg, rfqResponse);
    const takerResponse = await prepareRfqSettlement(
      takerCvg,
      rfq,
      rfqResponse
    );
    expect(takerResponse.response).toHaveProperty('signature');

    const makerResponse = await prepareRfqSettlement(
      makerCvg,
      rfq,
      rfqResponse
    );
    expect(makerResponse.response).toHaveProperty('signature');

    const settlementResponse = await settleRfq(takerCvg, rfq, rfqResponse);
    expect(settlementResponse.response).toHaveProperty('signature');
  });

  it('open size european call Spread  [2-way]', async () => {
    const { rfq } = await createEuropeanOpenSizeCallSpdOptionRfq(
      takerCvg,
      'two-way',
      baseMint,
      quoteMint
    );
    expect(rfq).toHaveProperty('address');
    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      220_111,
      150_123,
      5
    );
    expect(rfqResponse).toHaveProperty('address');

    const { response: confirmResponse } = await takerCvg
      .rfqs()
      .confirmResponse({
        rfq: rfq.address,
        response: rfqResponse.address,
        side: 'ask',
        overrideLegMultiplierBps: 4,
      });
    expect(confirmResponse).toHaveProperty('signature');
    await setupEuropean(takerCvg, rfqResponse);
    await setupEuropean(makerCvg, rfqResponse);
    const takerResponse = await prepareRfqSettlement(
      takerCvg,
      rfq,
      rfqResponse
    );
    expect(takerResponse.response).toHaveProperty('signature');

    const makerResponse = await prepareRfqSettlement(
      makerCvg,
      rfq,
      rfqResponse
    );
    expect(makerResponse.response).toHaveProperty('signature');

    const settlementResponse = await settleRfq(takerCvg, rfq, rfqResponse);
    expect(settlementResponse.response).toHaveProperty('signature');
  });

  it('open size european call  [sell]', async () => {
    const { rfq } = await createEuropeanOpenSizeCallSpdOptionRfq(
      takerCvg,
      'sell',
      baseMint,
      quoteMint
    );
    expect(rfq).toHaveProperty('address');
    const { rfqResponse } = await respondToRfq(
      makerCvg,
      rfq,
      150_123,
      undefined,
      5
    );
    expect(rfqResponse).toHaveProperty('address');

    const { response: confirmResponse } = await takerCvg
      .rfqs()
      .confirmResponse({
        rfq: rfq.address,
        response: rfqResponse.address,
        side: 'bid',
        overrideLegMultiplier: 4,
      });
    expect(confirmResponse).toHaveProperty('signature');
    await setupEuropean(takerCvg, rfqResponse);
    await setupEuropean(makerCvg, rfqResponse);

    const takerResponse = await prepareRfqSettlement(
      takerCvg,
      rfq,
      rfqResponse
    );
    expect(takerResponse.response).toHaveProperty('signature');

    const makerResponse = await prepareRfqSettlement(
      makerCvg,
      rfq,
      rfqResponse
    );
    expect(makerResponse.response).toHaveProperty('signature');

    const settlementResponse = await settleRfq(takerCvg, rfq, rfqResponse);
    expect(settlementResponse.response).toHaveProperty('signature');
  });
});
