import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';

import { PROGRAM_ADDRESS as SPOT_INSTRUMENT_PROGRAM_ADDRESS } from '@convergence-rfq/spot-instrument';
import { PROGRAM_ADDRESS as PSYOPTIONS_AMERICAN_INSTRUMENT_PROGRAM_ADDRESS } from '@convergence-rfq/psyoptions-american-instrument';
import { PROGRAM_ADDRESS as PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ADDRESS } from '@convergence-rfq/psyoptions-european-instrument';
import { PROGRAM_ADDRESS as HXRO_PRINT_TRADE_PROVIDER_PROGRAM_ADDRESS } from '@convergence-rfq/hxro-print-trade-provider';

import {
  ADDRESS_LABEL,
  SWITCHBOARD_BTC_ORACLE,
  PYTH_SOL_ORACLE,
  COLLATERAL_MINT,
  TX_LABEL,
  runCli,
} from '../helpers';

describe('unit.protocol', () => {
  let stub: SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  it('get', async () => {
    await runCli(['protocol', 'get']);
    expect(stub.args[0][0]).toEqual(ADDRESS_LABEL);
  });

  it('get-base-assets', async () => {
    await runCli(['protocol', 'get-base-assets']);
    expect(stub.args[0][0]).toEqual(ADDRESS_LABEL);
  });

  it('get-registered-mints', async () => {
    await runCli(['protocol', 'get-registered-mints']);
    expect(stub.args[0][0]).toEqual(ADDRESS_LABEL);
  });

  it('close', async () => {
    await runCli(['protocol', 'close']);
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });

  it('initialize', async () => {
    await runCli([
      'protocol',
      'initialize',
      '--collateral-mint',
      COLLATERAL_MINT,
    ]);
    expect(stub.args[0][0]).toEqual(ADDRESS_LABEL);
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
    expect(stub.args[0][0]).toEqual(TX_LABEL);
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
    expect(stub.args[0][0]).toEqual(TX_LABEL);
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
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });

  it('add-print-trade-provider [hxro]', async () => {
    await runCli([
      'protocol',
      'add-print-trade-provider',
      '--print-trade-provider-program',
      HXRO_PRINT_TRADE_PROVIDER_PROGRAM_ADDRESS,
      '--settlement-can-expire',
      'false',
    ]);
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });

  it('add-base-asset [switchboard]', async () => {
    // TODO: Add Pyth and In Place Price Oracle
    await runCli([
      'protocol',
      'add-base-asset',
      '--ticker',
      'GOD',
      '--oracle-source',
      'switchboard',
      '--oracle-address',
      SWITCHBOARD_BTC_ORACLE,
    ]);
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });

  it('add-base-asset [in-place]', async () => {
    await runCli([
      'protocol',
      'add-base-asset',
      '--ticker',
      'DOG',
      '--oracle-source',
      'in-place',
      '--oracle-price',
      '101',
    ]);
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });

  it('add-base-asset [pyth]', async () => {
    await runCli([
      'protocol',
      'add-base-asset',
      '--ticker',
      'ODG',
      '--oracle-source',
      'pyth',
      '--oracle-address',
      PYTH_SOL_ORACLE,
    ]);
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });

  it('get-registered-mints', async () => {
    await runCli(['protocol', 'get-registered-mints']);
    expect(stub.args[0][0]).toEqual(ADDRESS_LABEL);
  });

  it('register-mint [collateral]', async () => {
    await runCli(['token', 'create-mint', '--decimals', '3']);
    await runCli(['protocol', 'register-mint', '--mint', stub.args[0][1]]);
    expect(stub.args[1][0]).toEqual(TX_LABEL);
  });

  it('get', async () => {
    await runCli(['protocol', 'get']);
    expect(stub.args[0][0]).toEqual(ADDRESS_LABEL);
  });
});
