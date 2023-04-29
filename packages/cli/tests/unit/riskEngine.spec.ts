import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';
import {
  spotInstrumentProgram,
  psyoptionsAmericanInstrumentProgram,
  psyoptionsEuropeanInstrumentProgram,
} from '@convergence-rfq/sdk';

import { ADDRESS, TX, runCli } from '../helpers';

describe('riskEngine', () => {
  let stub: SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  it('close config', async () => {
    await runCli(['risk-engine:close']);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('initialize config', async () => {
    await runCli(['risk-engine:initialize']);
    expect(stub.args[0][0]).toEqual(ADDRESS);
  });

  it('set-instrument-type [spot]', async () => {
    await runCli([
      'risk-engine:set-instrument-type',
      '--program',
      spotInstrumentProgram.address.toString(),
      '--type',
      'spot',
    ]);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('set-instrument-type [american]', async () => {
    await runCli([
      'risk-engine:set-instrument-type',
      '--program',
      psyoptionsAmericanInstrumentProgram.address.toString(),
      '--type',
      'option',
    ]);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('set-instrument-type [european]', async () => {
    await runCli([
      'risk-engine:set-instrument-type',
      '--program',
      psyoptionsEuropeanInstrumentProgram.address.toString(),
      '--type',
      'option',
    ]);
    expect(stub.args[0][0]).toEqual(TX);
  });
});
