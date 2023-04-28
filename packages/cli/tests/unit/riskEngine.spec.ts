import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';
import * as sdk from '@convergence-rfq/sdk';

import { TX, runCli } from '../helpers';

describe('riskEngine', () => {
  let stub: SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  it('set-instrument-type [spot]', async () => {
    await runCli([
      'risk-engine:set-instrument-type',
      '--program',
      sdk.spotInstrumentProgram.address.toString(),
      '--type',
      'spot',
    ]);
    expect(stub.args[0][0]).toEqual(TX);
  });
});
