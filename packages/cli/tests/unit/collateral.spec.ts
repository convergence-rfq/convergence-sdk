import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';

import {
  ChildProccess,
  spawnValidator,
  readCtx,
  Ctx,
} from '../../../validator';
import { runCli, ADDRESS, TX } from '../helpers';

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

  it('collateral:initialize-account [dao]', async () => {
    await runCli(['collateral:initialize-account']);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual('Token account address:');
    expect(stub.args[2][0]).toEqual(TX);
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
    // TODO: Check that the locked tokens are greater than 0
    //expect(stub.args[2][1]).toBeGreaterThan(0);
  });
});
