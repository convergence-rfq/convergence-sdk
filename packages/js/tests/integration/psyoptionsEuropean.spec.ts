import { expect } from 'expect';

import { Program } from '@project-serum/anchor';
import { EuroPrimitive } from '@mithraic-labs/tokenized-euros';
import { Mint } from '../../src/plugins/tokenModule';
import {
  prepareRfqSettlement,
  respondToRfq,
  settleRfq,
  createUserCvg,
  createEuropeanCoveredCallRfq,
  createEuropeanOpenSizeCallSpdOptionRfq,
  createEuropeanFixedBaseStraddle,
} from '../helpers';
import { BASE_MINT_BTC_PK, QUOTE_MINT_PK } from '../constants';
import { InstructionUniquenessTracker } from '../../src/utils/';
import { createEuropeanProgram } from '../../src';

describe('integration.psyoptionsEuropean', () => {
  const takerCvg = createUserCvg('taker');
  const makerCvg = createUserCvg('maker');
  let baseMint: Mint;
  let quoteMint: Mint;
  let europeanProgram: Program<EuroPrimitive>;
  const ixTracker = new InstructionUniquenessTracker([]);
  before(async () => {
    baseMint = await takerCvg
      .tokens()
      .findMintByAddress({ address: BASE_MINT_BTC_PK });
    quoteMint = await takerCvg
      .tokens()
      .findMintByAddress({ address: QUOTE_MINT_PK });
    europeanProgram = await createEuropeanProgram(takerCvg);
  });

  it('european covered call [sell]', async () => {
    const { rfq, responses } = await createEuropeanCoveredCallRfq(
      takerCvg,
      'sell',
      baseMint,
      quoteMint,
      ixTracker,
      europeanProgram
    );

    expect(rfq).toHaveProperty('address');
    expect(responses[0].signature).toBeDefined();

    const { rfqResponse } = await respondToRfq(makerCvg, rfq, 12.0);
    await takerCvg.rfqs().confirmResponse({
      rfq: rfq.address,
      response: rfqResponse.address,
      side: 'bid',
    });
    await prepareRfqSettlement(makerCvg, rfq, rfqResponse);
    await prepareRfqSettlement(takerCvg, rfq, rfqResponse);

    await settleRfq(takerCvg, rfq, rfqResponse);
  });

  it('fixed-size european straddle [buy]', async () => {
    const { rfq } = await createEuropeanFixedBaseStraddle(
      takerCvg,
      'buy',
      baseMint,
      quoteMint,
      ixTracker,
      europeanProgram
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
      quoteMint,
      ixTracker,
      europeanProgram
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

  it('fixed-size european straddle [sell]', async () => {
    const { rfq } = await createEuropeanFixedBaseStraddle(
      takerCvg,
      'sell',
      baseMint,
      quoteMint,
      ixTracker,
      europeanProgram
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
      quoteMint,
      ixTracker,
      europeanProgram
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

  it('fixed-size european straddle [2-way]', async () => {
    const { rfq } = await createEuropeanFixedBaseStraddle(
      takerCvg,
      'two-way',
      baseMint,
      quoteMint,
      ixTracker,
      europeanProgram
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

  it('open size european call Spread [sell]', async () => {
    const { rfq } = await createEuropeanOpenSizeCallSpdOptionRfq(
      takerCvg,
      'sell',
      baseMint,
      quoteMint,
      ixTracker,
      europeanProgram
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
