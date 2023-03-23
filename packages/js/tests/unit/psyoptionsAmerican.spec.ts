import { expect } from 'expect';

import {
  ChildProccess,
  Ctx,
  readCtx,
  spawnValidator,
} from '../../../validator';
import {
  createSdk,
  sellCoveredCall,
  confirmBid,
  respondWithBid,
} from '../helpers';

describe('american', () => {
  let validator: ChildProccess;
  let ctx: Ctx;

  before((done) => {
    ctx = readCtx();
    validator = spawnValidator(done);
  });

  after(() => {
    validator.kill();
  });

  it('covered call', async () => {
    const takerCvg = await createSdk('taker');
    const { rfq } = await sellCoveredCall(takerCvg, ctx);
    expect(rfq).toHaveProperty('address');

    const makerCvg = await createSdk('maker');
    const { rfqResponse } = await respondWithBid(makerCvg, rfq);
    expect(rfqResponse).toHaveProperty('address');

    const { response } = await confirmBid(takerCvg, rfq, rfqResponse);
    expect(response).toHaveProperty('signature');
  });
});
