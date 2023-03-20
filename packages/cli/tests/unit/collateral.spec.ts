import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';

import { ChildProccess, spawnValidator } from '../validator';
import { Ctx, runCli, ADDRESS, TX, readCtx } from '../utils/helpers';

describe('collateral', () => {
  let stub: SinonStub;
  let validator: ChildProccess;
  let ctx: Ctx;

  before((done) => {
    ctx = readCtx();
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

  it('collateral:initialize-account [taker]', async () => {
    await runCli(['collateral:initialize-account'], 'taker');
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
    ctx.takerCollateral = stub.args[0][1];
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('collateral:fund-account [taker]', async () => {
    await runCli(['collateral:fund-account', '--amount', '1000'], 'taker');
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('collateral:get-account [taker]', async () => {
    await runCli(['collateral:get-account', '--user', ctx.taker]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual('User:');
    expect(stub.args[2][0]).toEqual('Locked tokens:');
    expect(stub.args[2][1]).toBeGreaterThan(0);
  });
});
