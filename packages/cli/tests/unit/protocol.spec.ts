import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';

describe('rfq', () => {
  let stub: SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  it('protocol:initialize', async () => {
    expect(true).toBeTruthy();
  });
});
