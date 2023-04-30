import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';
import { PROGRAM_ADDRESS as SPOT_INSTRUMENT_PROGRAM_ADDRESS } from '@convergence-rfq/rfq';
import { PROGRAM_ADDRESS as PSYOPTIONS_AMERICAN_INSTRUMENT_PROGRAM_ADDRESS } from '@convergence-rfq/psyoptions-american-instrument';
import { PROGRAM_ADDRESS as PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ADDRESS } from '@convergence-rfq/psyoptions-european-instrument';

import { ADDRESS, COLLATERAL_MINT, TX, runCli } from '../helpers';

describe('protocol', () => {
  let stub: SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  it('get', async () => {
    await runCli(['protocol', 'get']);
    expect(stub.args[0][0]).toEqual(ADDRESS);
  });

  it('get-base-assets', async () => {
    await runCli(['protocol', 'get-base-assets']);
    expect(stub.args[0][0]).toEqual(ADDRESS);
  });

  it('get-registered-mints', async () => {
    await runCli(['protocol', 'get-registered-mints']);
    expect(stub.args[1][0]).toEqual(ADDRESS);
  });

  it('register-mint [quote]', async () => {
    await runCli(['token', 'create-mint', '--decimals', '9'], 'mint-authority');
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
    await runCli(['protocol', 'register-mint', '--mint', stub.args[0][1]]);
    expect(stub.args[2][0]).toEqual(ADDRESS);
    expect(stub.args[3][0]).toEqual(TX);
  });

  it('close', async () => {
    await runCli(['protocol', 'close']);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('initialize', async () => {
    await runCli([
      'protocol',
      'initialize',
      '--collateral-mint',
      COLLATERAL_MINT,
    ]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
  });

  it('add-instrument [spot]', async () => {
    await runCli([
      'protocol',
      'add-instrument',
      '--instrument-program',
      SPOT_INSTRUMENT_PROGRAM_ADDRESS,
      '--can-be-used-as-quote',
      'true',
      '--validate-data-account-amount',
      '1',
      '--prepare-to-settle-account-amount',
      '7',
      '--settle-account-amount',
      '3',
      '--revert-preparation-account-amount',
      '3',
      '--clean-up-account-amount',
      '4',
    ]);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('add-instrument [psyoptions american]', async () => {
    await runCli([
      'protocol',
      'add-instrument',
      '--instrument-program',
      PSYOPTIONS_AMERICAN_INSTRUMENT_PROGRAM_ADDRESS,
      '--can-be-used-as-quote',
      'true',
      '--validate-data-account-amount',
      '3',
      '--prepare-to-settle-account-amount',
      '7',
      '--settle-account-amount',
      '3',
      '--revert-preparation-account-amount',
      '3',
      '--clean-up-account-amount',
      '4',
    ]);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('add-instrument [psyoptions european]', async () => {
    await runCli([
      'protocol',
      'add-instrument',
      '--instrument-program',
      PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ADDRESS,
      '--can-be-used-as-quote',
      'true',
      '--validate-data-account-amount',
      '2',
      '--prepare-to-settle-account-amount',
      '7',
      '--settle-account-amount',
      '3',
      '--revert-preparation-account-amount',
      '3',
      '--clean-up-account-amount',
      '4',
    ]);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('get-registered-mints', async () => {
    await runCli(['protocol', 'get-registered-mints']);
    expect(stub.args[1][0]).toEqual(ADDRESS);
  });

  //it('get [?]', async () => {
  //  await runCli(['protocol', 'add-base-asset']);
  //  expect(stub.args[0][0]).toEqual(TX);
  //});
});
