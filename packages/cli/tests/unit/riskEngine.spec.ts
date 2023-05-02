import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';
import { PROGRAM_ADDRESS as SPOT_INSTRUMENT } from '@convergence-rfq/spot-instrument';
import { PROGRAM_ADDRESS as PSYOPTIONS_AMERICAN_INSTRUMENT } from '@convergence-rfq/psyoptions-american-instrument';
import { PROGRAM_ADDRESS as PSYOPTIONS_EUROPEAN_INSTRUMENT } from '@convergence-rfq/psyoptions-european-instrument';

import { ADDRESS_LABEL, TX_LABEL, runCli } from '../helpers';

describe('riskEngine', () => {
  let stub: SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  it('get', async () => {
    await runCli(['risk-engine', 'get']);
    expect(stub.args[0][0]).toEqual(ADDRESS_LABEL);
  });

  it('update', async () => {
    await runCli(['risk-engine', 'update']);
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });

  it('close', async () => {
    await runCli(['risk-engine', 'close']);
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });

  it('initialize', async () => {
    await runCli(['risk-engine', 'initialize']);
    expect(stub.args[0][0]).toEqual(ADDRESS_LABEL);
  });

  it('set-instrument-type [spot]', async () => {
    await runCli([
      'risk-engine',
      'set-instrument-type',
      '--program',
      SPOT_INSTRUMENT,
      '--type',
      'spot',
    ]);
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });

  it('set-instrument-type [psyoptions european]', async () => {
    await runCli([
      'risk-engine',
      'set-instrument-type',
      '--program',
      PSYOPTIONS_EUROPEAN_INSTRUMENT,
      '--type',
      'option',
    ]);
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });

  it('set-instrument-type [psyoptions american]', async () => {
    await runCli([
      'risk-engine',
      'set-instrument-type',
      '--program',
      PSYOPTIONS_AMERICAN_INSTRUMENT,
      '--type',
      'option',
    ]);
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });

  it('set-risk-categories-info [very low]', async () => {
    await runCli([
      'risk-engine',
      'set-risk-categories-info',
      '--category',
      'very-low',
      '--new-value',
      '0.05,0.5,0.02,0.2,0.04,0.3,0.08,0.4,0.12,0.5,0.2,0.6,0.3,0.7',
    ]);
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });

  it('set-risk-categories-info [low]', async () => {
    await runCli([
      'risk-engine',
      'set-risk-categories-info',
      '--category',
      'low',
      '--new-value',
      '0.05,0.8,0.04,0.4,0.08,0.6,0.16,0.8,0.24,1.0,0.4,1.2,0.6,1.4',
    ]);
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });

  it('set-risk-categories-info [medium]', async () => {
    await runCli([
      'risk-engine',
      'set-risk-categories-info',
      '--category',
      'medium',
      '--new-value',
      '0.05,1.2,0.06,0.6,0.12,0.9,0.24,1.2,0.36,1.5,0.6,1.8,0.9,2.1',
    ]);
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });

  it('set-risk-categories-info [high]', async () => {
    await runCli([
      'risk-engine',
      'set-risk-categories-info',
      '--category',
      'high',
      '--new-value',
      '0.05,2.4,0.08,0.8,0.16,1.2,0.32,1.6,0.48,2.0,0.8,2.4,1.2,2.8',
    ]);
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });

  it('set-risk-categories-info [very high]', async () => {
    await runCli([
      'risk-engine',
      'set-risk-categories-info',
      '--category',
      'very-high',
      '--new-value',
      '0.05,5.0,0.10,1.0,0.20,1.5,0.40,2.0,0.60,2.5,1.0,3.0,1.5,3.5',
    ]);
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });
});
