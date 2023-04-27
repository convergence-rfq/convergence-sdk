import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';

import { TX, runCli } from '../helpers';

describe('utils', () => {
  let stub: SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  it('airdrop sol', async () => {
    await runCli(['airdrop:sol', '--amount', '1']);
    expect(stub.args[0][0]).toEqual(TX);
  });
});
