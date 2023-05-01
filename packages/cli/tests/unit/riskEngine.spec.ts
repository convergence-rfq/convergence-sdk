import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';
import { PROGRAM_ADDRESS as SPOT_INSTRUMENT_PROGRAM_ADDRESS } from '@convergence-rfq/spot-instrument';
import { PROGRAM_ADDRESS as PSYOPTIONS_AMERICAN_INSTRUMENT_PROGRAM_ADDRESS } from '@convergence-rfq/psyoptions-american-instrument';
import { PROGRAM_ADDRESS as PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ADDRESS } from '@convergence-rfq/psyoptions-european-instrument';

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
      SPOT_INSTRUMENT_PROGRAM_ADDRESS,
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
      PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ADDRESS,
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
      PSYOPTIONS_AMERICAN_INSTRUMENT_PROGRAM_ADDRESS,
      '--type',
      'option',
    ]);
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });
});
