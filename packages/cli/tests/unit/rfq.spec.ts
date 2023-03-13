import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';

import { runCli, ADDRESS } from './../helpers';

describe('Convergence CLI', () => {
  let stub: SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  it('get-rfqs [maker]', async () => {
    await runCli(['create-rfq']);
    expect(stub.args[0][0]).toEqual(ADDRESS);
  });

  it('get-rfqs [maker]', async () => {
    await runCli(['get-rfqs']);
    expect(stub.args[0][0]).toEqual(ADDRESS);
  });
});
