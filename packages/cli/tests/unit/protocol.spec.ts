import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';

import { ChildProccess, spawnValidator } from '../../../validator';
import { runCli, ADDRESS } from '../helpers';

describe('protocol', () => {
  let stub: SinonStub;
  let validator: ChildProccess;

  before((done) => {
    validator = spawnValidator(done);
  });

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  after(() => {
    validator.kill();
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
