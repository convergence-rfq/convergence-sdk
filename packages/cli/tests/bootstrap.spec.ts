import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';
import * as sdk from '@convergence-rfq/sdk';

import { runCli, ADDRESS, TX, BTC_ORACLE, readCtx, Ctx } from './helpers';

describe('bootstrap', () => {
  let ctx: Ctx;
  let stub: SinonStub;

  before(() => {
    ctx = readCtx();
  });

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  it('initialize-protocol', async () => {
    await runCli(['initialize-protocol', '--collateral-mint', ctx.quoteMint]);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('add-instrument [spot]', async () => {
    await runCli([
      'add-instrument',
      '--instrument-program',
      sdk.spotInstrumentProgram.address.toString(),
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

  it('add-instrument [psyoptions american options]', async () => {
    await runCli([
      'add-instrument',
      '--instrument-program',
      sdk.psyoptionsAmericanInstrumentProgram.address.toString(),
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

  it('add-instrument [psyoptions european options]', async () => {
    await runCli([
      'add-instrument',
      '--instrument-program',
      sdk.psyoptionsEuropeanInstrumentProgram.address.toString(),
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

  it('initialize-risk-engine', async () => {
    await runCli([
      'initialize-risk-engine',
      '--collateral-for-variable-size-rfq-creation',
      '1000000000',
      '--collateral-for-fixed-quote-amount-rfq-creation',
      '2000000000',
      '--safety-price-shift-factor',
      '0.01',
      '--overall-safety-factor',
      '0.1',
    ]);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('add-base-asset [base]', async () => {
    await runCli([
      'add-base-asset',
      '--ticker',
      'BTC',
      '--oracle-address',
      BTC_ORACLE,
    ]);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('get-base-assets', async () => {
    await runCli(['get-base-assets']);
    expect(stub.args[0][0]).toEqual(ADDRESS);
  });

  it('register-mint [quote]', async () => {
    await runCli(['register-mint', '--mint', ctx.quoteMint]);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('register-mint [base]', async () => {
    await runCli([
      'register-mint',
      '--base-asset-index',
      '0',
      '--mint',
      ctx.baseMint,
    ]);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('get-registered-mints', async () => {
    await runCli(['get-registered-mints']);
    expect(stub.args[1][0]).toEqual(ADDRESS);
  });

  it('initialize-collateral-account [maker]', async () => {
    await runCli(['initialize-collateral-account'], 'taker');
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
  });

  it('fund-collateral-account [maker]', async () => {
    await runCli(['fund-collateral-account', '--amount', '1000'], 'taker');
    expect(stub.args[0][0]).toEqual(TX);
  });
});
