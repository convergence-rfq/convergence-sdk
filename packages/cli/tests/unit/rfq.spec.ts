import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';

import { runCli, ADDRESS, Ctx, readCtx } from './../helpers';

describe('rfq', () => {
  let ctx = {} as Ctx;
  let stub: SinonStub;

  before(() => {
    ctx = readCtx();
  });

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  it('create-rfq [taker]', async () => {
    await runCli(
      [
        'create-rfq',
        '--quote-mint',
        ctx.quoteMint,
        '--base-mint',
        ctx.baseMint,
        '--side',
        'ask',
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

  it('get-rfqs [maker]', async () => {
    await runCli(['get-rfqs']);
    expect(stub.args[0][0]).toEqual(ADDRESS);
  });
});
