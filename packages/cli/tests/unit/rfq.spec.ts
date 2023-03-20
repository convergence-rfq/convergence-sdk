import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';

import { ChildProccess, spawnValidator } from '../../../validator';
import { runCli, ADDRESS, Ctx, readCtx } from '../helpers';

describe('rfq', () => {
  let ctx: Ctx;
  let stub: SinonStub;
  let validator: ChildProccess;

  before((done) => {
    ctx = readCtx();
    validator = spawnValidator(done);
  });

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  after(async () => {
    validator.kill();
  });

  it('rfq:create [taker]', async () => {
    await runCli(
      [
        'rfq:create',
        '--quote-mint',
        ctx.quoteMint,
        '--base-mint',
        ctx.baseMint,
        '--side',
        'bid',
        '--collateral-info',
        ctx.takerCollateralInfo,
        '--collateral-token',
        ctx.takerCollateralToken,
        '--order-type',
        'two-way',
        '--size',
        'fixed-base',
        '--amount',
        '1',
        '--verbose',
        'true',
      ],
      'taker'
    );
    expect(stub.args[0][0]).toEqual(ADDRESS);
  });

  it('rfq:get-all [maker]', async () => {
    await runCli(['rfq:get-all']);
    expect(stub.args[0][0]).toEqual(ADDRESS);
  });
});
