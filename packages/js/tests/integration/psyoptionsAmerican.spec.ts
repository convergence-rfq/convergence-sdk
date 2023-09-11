import { expect } from 'expect';

import { Mint } from '@solana/spl-token';
import {
  createAmericanCoveredCallRfq,
  respondToRfq,
  prepareRfqSettlement,
  settleRfq,
  createUserCvg,
  setupAmerican,
  createAmericanOpenSizeCallSpdOptionRfq,
  createAmericanFixedBaseStraddle,
} from '../helpers';
import { BASE_MINT_BTC_PK, QUOTE_MINT_PK } from '../constants';

describe('integration.psyoptionsAmerican', () => {
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
    const { rfq } = await createAmericanCoveredCallRfq(
      takerCvg,
      'sell',
      baseMint,
      quoteMint
    );
    expect(rfq).toHaveProperty('address');
    const { rfqResponse } = await respondToRfq(makerCvg, rfq, 12.1);
    expect(rfqResponse).toHaveProperty('address');

    const { response: confirmResponse } = await takerCvg
      .rfqs()
      .confirmResponse({
        rfq: rfq.address,
        response: rfqResponse.address,
        side: 'bid',
      });
    expect(confirmResponse).toHaveProperty('signature');
    await setupAmerican(takerCvg, rfqResponse);

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

    // TODO: Check balances
  });

  it('fixed-size american straddle [buy]', async () => {
    const { rfq } = await createAmericanFixedBaseStraddle(
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
    await setupAmerican(takerCvg, rfqResponse);
    await setupAmerican(makerCvg, rfqResponse);
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
    const { rfq } = await createAmericanFixedBaseStraddle(
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
    await setupAmerican(takerCvg, rfqResponse);
    await setupAmerican(makerCvg, rfqResponse);
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
    const { rfq } = await createAmericanFixedBaseStraddle(
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
    await setupAmerican(takerCvg, rfqResponse);
    await setupAmerican(makerCvg, rfqResponse);
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

  it('open size american call Spread [buy]', async () => {
    const { rfq } = await createAmericanOpenSizeCallSpdOptionRfq(
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
        overrideLegMultiplier: 4,
      });
    expect(confirmResponse).toHaveProperty('signature');
    await setupAmerican(takerCvg, rfqResponse);
    await setupAmerican(makerCvg, rfqResponse);
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

  it('open size american call Spread [2-way]', async () => {
    const { rfq } = await createAmericanOpenSizeCallSpdOptionRfq(
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
        overrideLegMultiplier: 4,
      });
    expect(confirmResponse).toHaveProperty('signature');
    await setupAmerican(takerCvg, rfqResponse);
    await setupAmerican(makerCvg, rfqResponse);
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
