import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';

import { runCli, ADDRESS } from '../utils/helpers';

describe('protocol', () => {
  let stub: SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  it('protocol:get-config', async () => {
    await runCli(['protocol:get-config']);
    expect(stub.args[0][0]).toEqual(ADDRESS);
  });

  it('protocol:get-base-assets', async () => {
    await runCli(['protocol:get-base-assets']);
    expect(stub.args[0][0]).toEqual(ADDRESS);
  });

  it('protocol:get-registered-mints', async () => {
    await runCli(['protocol:get-registered-mints']);
    expect(stub.args[1][0]).toEqual(ADDRESS);
  });
});
