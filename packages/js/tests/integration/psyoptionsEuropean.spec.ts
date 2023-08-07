import { expect } from 'expect';

import {
  createEuropeanProgram,
  getOrCreateEuropeanOptionATAs,
  mintEuropeanOptions,
} from '../../src';
import {
  prepareRfqSettlement,
  respondToRfq,
  settleRfq,
  createUserCvg,
  createEuropeanCoveredCallRfq,
} from '../helpers';

describe('integration.psyoptionsEuropean', async () => {
  const takerCvg = createUserCvg('taker');
  const makerCvg = createUserCvg('maker');

  it('covered call [sell]', async () => {
    const { rfq, response } = await createEuropeanCoveredCallRfq(
      takerCvg,
      'sell'
    );
    const europeanProgram = await createEuropeanProgram(takerCvg);
    expect(rfq).toHaveProperty('address');
    expect(response.signature).toBeDefined();

    const { rfqResponse } = await respondToRfq(makerCvg, rfq, 12.0);
    await takerCvg.rfqs().confirmResponse({
      rfq: rfq.address,
      response: rfqResponse.address,
      side: 'bid',
    });

    await getOrCreateEuropeanOptionATAs(
      takerCvg,
      rfqResponse.address,
      takerCvg.rpc().getDefaultFeePayer().publicKey
    );
    const tnx = await mintEuropeanOptions(
      takerCvg,
      rfqResponse.address,
      takerCvg.rpc().getDefaultFeePayer().publicKey,
      europeanProgram
    );
    expect(tnx).toHaveProperty('response');

    await prepareRfqSettlement(makerCvg, rfq, rfqResponse);
    await prepareRfqSettlement(takerCvg, rfq, rfqResponse);

    await settleRfq(takerCvg, rfq, rfqResponse);
  });
});
