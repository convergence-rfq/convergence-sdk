import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';

import { CTX, ADDRESS, TX, runCli } from '../helpers';

describe('collateral', () => {
  let stub: SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  // TODO: DAO already initialized so create random account instead
  //it('collateral:initialize-account [dao]', async () => {
  //  await runCli(['collateral:initialize-account']);
  //  expect(stub.args[0][0]).toEqual(ADDRESS);
  //  expect(stub.args[1][0]).toEqual('Token account address:');
  //  expect(stub.args[2][0]).toEqual(TX);
  //});

  it('collateral:get-account [taker]', async () => {
    await runCli(['collateral:get-account', '--user', CTX.taker]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual('User:');
    expect(stub.args[2][0]).toEqual('Locked tokens:');
  });

  it('collateral:fund-account [taker]', async () => {
    await runCli(['collateral:fund-account', '--amount', '1000'], 'taker');
    expect(stub.args[0][0]).toEqual(TX);
  });
});
