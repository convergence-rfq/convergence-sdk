import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';

import { ADDRESS_LABEL, HXRO_MPG, TX_LABEL, runCli } from '../helpers';

describe('unit.hxro', () => {
  let stub: SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  it('display config', async () => {
    await runCli(['hxro', 'display-config']);
    expect(stub.args[0][0]).toEqual(ADDRESS_LABEL);
    expect(stub.args[1][0]).toEqual('Valid Hxro market product group:');
  });

  it('display config', async () => {
    await runCli(['hxro', 'modify-config', '--valid-mpg', HXRO_MPG]);
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });
});
