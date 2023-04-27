import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';

import { Ctx } from '../../../validator';
import { runCli, ADDRESS } from '../helpers';

describe('rfq', () => {
  const ctx = new Ctx();
  let stub: SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
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
