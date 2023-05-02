import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';

import { TX_LABEL, runCli } from '../helpers';

describe('airdrop', () => {
  let stub: SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  it('sol', async () => {
    await runCli(['airdrop', 'sol', '--amount', '1']);
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });
});
