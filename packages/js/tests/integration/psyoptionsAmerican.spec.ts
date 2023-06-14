import { expect } from 'expect';

import {
  createAmericanCoveredCall,
  confirmResponse,
  respond,
  prepareSettlement,
  settle,
} from '../human';
import { createUserCvg } from '../helpers';
import {
  createAmericanProgram,
  getOrCreateAmericanOptionATAs,
  createAmericanAccountsAndMintOptions,
  mintAmericanOptions,
} from '../../src';

describe('integration.psyoptionsAmerican', () => {
  const takerCvg = createUserCvg('taker');
  const makerCvg = createUserCvg('maker');

  it('covered call', async () => {
    const res0 = await createAmericanCoveredCall(takerCvg, 'sell');
    const { rfq } = res0;
    expect(rfq).toHaveProperty('address');

    const res1 = await respond(makerCvg, rfq, 'bid');
    const { rfqResponse } = res1;
    expect(rfqResponse).toHaveProperty('address');

    const res2 = await confirmResponse(takerCvg, rfq, rfqResponse, 'bid');
    expect(res2.response).toHaveProperty('signature');

    const americanProgram = createAmericanProgram(takerCvg);
    await getOrCreateAmericanOptionATAs(
      takerCvg,
      rfqResponse.address,
      takerCvg.rpc().getDefaultFeePayer().publicKey,
      americanProgram
    );
    const res6 = await mintAmericanOptions(
      takerCvg,
      rfqResponse.address,
      takerCvg.rpc().getDefaultFeePayer().publicKey,
      americanProgram
    );
    expect(res6?.response).toHaveProperty('signature');

    const res3 = await prepareSettlement(takerCvg, rfq, rfqResponse);
    expect(res3.response).toHaveProperty('signature');

    const res4 = await prepareSettlement(makerCvg, rfq, rfqResponse);
    expect(res4.response).toHaveProperty('signature');

    const res5 = await settle(takerCvg, rfq, res1.rfqResponse);
    expect(res5.response).toHaveProperty('signature');
  });
});
