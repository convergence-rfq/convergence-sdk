import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';
import * as sdk from '@convergence-rfq/sdk';

import { Ctx } from '../../../validator';
import { runCli, ADDRESS, TX, BTC_ORACLE } from '../helpers';

describe('bootstrap', () => {
  const ctx = new Ctx();
  let stub: SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  it('protocol:initialize', async () => {
    await runCli(['protocol:initialize', '--collateral-mint', ctx.quoteMint]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
    ctx.protocol = stub.args[0][1];
  });

  it('protocol:add-instrument [spot]', async () => {
    await runCli([
      'protocol:add-instrument',
      '--instrument-program',
      sdk.spotInstrumentProgram.address.toString(),
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

  it('protocol:add-instrument [psyoptions american options]', async () => {
    await runCli([
      'protocol:add-instrument',
      '--instrument-program',
      sdk.psyoptionsAmericanInstrumentProgram.address.toString(),
      '--can-be-used-as-quote',
      'false',
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

  it('protocol:add-instrument [psyoptions european options]', async () => {
    await runCli([
      'protocol:add-instrument',
      '--instrument-program',
      sdk.psyoptionsEuropeanInstrumentProgram.address.toString(),
      '--can-be-used-as-quote',
      'false',
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

  it('risk-engine:initialize', async () => {
    await runCli([
      'risk-engine:initialize',
      '--collateral-for-variable-size-rfq-creation',
      '1000000000',
      '--collateral-for-fixed-quote-amount-rfq-creation',
      '2000000000',
      '--safety-price-shift-factor',
      '0.01',
      '--overall-safety-factor',
      '0.1',
    ]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
    ctx.riskEngine = stub.args[0][1];
  });

  it('risk-engine:set-instrument-type [spot]', async () => {
    await runCli([
      'risk-engine:set-instrument-type',
      '--program',
      sdk.spotInstrumentProgram.address.toString(),
      '--type',
      'spot',
    ]);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('risk-engine:set-instrument-type [psyoptions american options]', async () => {
    await runCli([
      'risk-engine:set-instrument-type',
      '--program',
      sdk.psyoptionsAmericanInstrumentProgram.address.toString(),
      '--type',
      'option',
    ]);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('risk-engine:set-instrument-type [psyoptions european options]', async () => {
    await runCli([
      'risk-engine:set-instrument-type',
      '--program',
      sdk.psyoptionsEuropeanInstrumentProgram.address.toString(),
      '--type',
      'option',
    ]);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('protocol:add-base-asset [base]', async () => {
    await runCli([
      'protocol:add-base-asset',
      '--ticker',
      'BTC',
      '--oracle-address',
      BTC_ORACLE,
    ]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
    ctx.baseAsset = stub.args[0][1];
  });

  it('protocol:register-mint [quote]', async () => {
    await runCli(['protocol:register-mint', '--mint', ctx.quoteMint]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
    ctx.quoteRegisteredMint = stub.args[0][1];
  });

  it('protocol:register-mint [base]', async () => {
    await runCli([
      'protocol:register-mint',
      '--base-asset-index',
      '0',
      '--mint',
      ctx.baseMint,
    ]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
    ctx.baseRegisteredMint = stub.args[0][1];
  });

  it('collateral:initialize-account [taker]', async () => {
    await runCli(['collateral:initialize-account'], 'taker');
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual('Token account address:');
    expect(stub.args[2][0]).toEqual(TX);
    ctx.takerCollateralInfo = stub.args[0][1];
    ctx.takerCollateralToken = stub.args[1][1];
  });

  it('collateral:initialize-account [maker]', async () => {
    await runCli(['collateral:initialize-account'], 'maker');
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual('Token account address:');
    expect(stub.args[2][0]).toEqual(TX);
    ctx.makerCollateralInfo = stub.args[0][1];
    ctx.makerCollateralToken = stub.args[1][1];
  });

  it('collateral:fund-account [taker]', async () => {
    await runCli(['collateral:fund-account', '--amount', '1000'], 'taker');
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('collateral:fund-account [maker]', async () => {
    await runCli(['collateral:fund-account', '--amount', '1000'], 'maker');
    expect(stub.args[0][0]).toEqual(TX);
  });
});
