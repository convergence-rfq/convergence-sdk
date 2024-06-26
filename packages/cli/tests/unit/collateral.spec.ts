import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';

import { CTX, ADDRESS_LABEL, TX_LABEL, runCli } from '../helpers';

describe('unit.collateral', () => {
  let stub: SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  // TODO: DAO already initialized so create random account instead
  //it('initialize [dao]', async () => {
  //  await runCli(['collateral', 'initialize']);
  //  expect(stub.args[0][0]).toEqual(ADDRESS_LABEL);
  //  expect(stub.args[1][0]).toEqual('Token account address:');
  //  expect(stub.args[2][0]).toEqual(TX_LABEL);
  //});

  it('get [taker]', async () => {
    await runCli(['collateral', 'get', '--user', CTX.taker]);
    expect(stub.args[0][0]).toEqual(ADDRESS_LABEL);
    expect(stub.args[1][0]).toEqual('User:');
    expect(stub.args[2][0]).toEqual('Locked tokens:');
  });

  it('fund [taker]', async () => {
    await runCli(['collateral', 'fund', '--amount', '1000'], 'taker');
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });
});
