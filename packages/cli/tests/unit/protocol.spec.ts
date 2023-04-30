import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';
//import { PublicKey } from '@solana/web3.js';

import { ADDRESS, TX, runCli } from '../helpers';

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
    await runCli(['token:create-mint', '--decimals', '9'], 'mint-authority');
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
    await runCli(['protocol', 'register-mint', '--mint', stub.args[0][1]]);
    expect(stub.args[2][0]).toEqual(ADDRESS);
    expect(stub.args[3][0]).toEqual(TX);
  });

  //it('add-instrument', async () => {
  //  // TODO: Prevent duplicate instruments as this only works the first time
  //  await runCli([
  //    'protocol:add-instrument',
  //    '--instrument-program',
  //    PublicKey.default.toString(),
  //    '--can-be-used-as-quote',
  //    'false',
  //    '--validate-data-account-amount',
  //    '2',
  //    '--prepare-to-settle-account-amount',
  //    '7',
  //    '--settle-account-amount',
  //    '3',
  //    '--revert-preparation-account-amount',
  //    '3',
  //    '--clean-up-account-amount',
  //    '4',
  //  ]);
  //  expect(stub.args[0][0]).toEqual(TX);
  //});
});
