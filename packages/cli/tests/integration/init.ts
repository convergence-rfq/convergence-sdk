import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';

import { CTX, ADDRESS, TX, runCli } from '../helpers';

describe('init', () => {
  let stub: SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  it('protocol:initialize', async () => {
    await runCli(['protocol:initialize', '--collateral-mint', CTX.quoteMint]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
  });

  it('risk-engine:initialize', async () => {
    await runCli([
      'risk-engine:initialize',
      '--collateral-for-variable-size-rfq-creation',
      '1000000000',
      '--collateral-for-fixed-quote-amount-rfq-creation',
      '2000000000',
      '--safety-price-shift-factor',
      '0.01',
      '--overall-safety-factor',
      '0.1',
    ]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
  });
});
