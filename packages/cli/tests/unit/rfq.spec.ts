import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';

import { CTX, ADDRESS, runCli } from '../helpers';

describe('rfq', () => {
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
        CTX.quoteMint,
        '--base-mint',
        CTX.baseMint,
        '--side',
        'bid',
        '--collateral-info',
        CTX.takerCollateralInfo,
        '--collateral-token',
        CTX.takerCollateralToken,
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
