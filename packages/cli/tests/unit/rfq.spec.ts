import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';

import { spawnValidator } from '../validator';
import { runCli, ADDRESS, Ctx, readCtx } from '../utils/helpers';

describe('rfq', () => {
  let ctx: Ctx;
  let stub: SinonStub;
  let validator: any;

  before((done) => {
    ctx = readCtx();
    validator = spawnValidator({ done, bootstrap: false, setup: false });
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
        'ask',
        '--collateral-token',
        ctx.takerQuoteWallet,
        '--order-type',
        'buy',
        '--size',
        'open',
        '--amount',
        '1',
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
