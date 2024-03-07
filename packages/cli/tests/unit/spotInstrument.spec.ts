import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';

import { ADDRESS_LABEL, TX_LABEL, runCli } from '../helpers';

describe('unit.spotInstrument', () => {
  let stub: SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  it('display config', async () => {
    await runCli(['spot-instrument', 'display-config']);
    expect(stub.args[0][0]).toEqual(ADDRESS_LABEL);
    expect(stub.args[1][0]).toEqual('Quote fees:');
  });

  it('modify config', async () => {
    await runCli(['spot-instrument', 'modify-config', '--fee-bps', '0.01']);
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });
});
