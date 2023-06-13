import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';

import { CTX, ADDRESS_LABEL, runCli } from '../helpers';

describe('unit.rfq', () => {
  let stub: SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  it('create [taker]', async () => {
    await runCli(
      [
        'rfq',
        'create',
        '--quote-mint',
        CTX.quoteMint,
        '--base-mint',
        CTX.baseMintBTC,
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
    expect(stub.args[0][0]).toEqual(ADDRESS_LABEL);
  });

  it('get-all [maker]', async () => {
    await runCli(['rfq', 'get-all']);
    expect(stub.args[0][0]).toEqual(ADDRESS_LABEL);
  });
});
