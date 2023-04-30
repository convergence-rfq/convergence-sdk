import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';
import { PublicKey } from '@solana/web3.js';

//import { getKpFile } from '../../../validator';
import { CTX, ADDRESS, TX, runCli } from '../helpers';

describe('token', () => {
  let stub: SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  it('create-mint', async () => {
    await runCli(['token:create-mint', '--decimals', '9'], 'mint-authority');
    expect(new PublicKey(stub.args[0][1])).toBeTruthy();
    expect(stub.args[1][0]).toEqual(TX);
  });

  // TODO: Generate random keypair for this test
  //it('token:create-wallet', async () => {
  //  await runCli(
  //    ['token:create-wallet', '--owner', getKpFile('maker'), '--mint', mint],
  //    'maker'
  //  );
  //  wallet = stub.args[0][1];
  //  expect(stub.args[0][0]).toEqual(ADDRESS);
  //  expect(stub.args[1][0]).toEqual(TX);
  //  expect(new PublicKey(wallet)).toBeTruthy();
  //});

  it('mint-to', async () => {
    await runCli(
      [
        'token:mint-to',
        '--wallet',
        CTX.makerBaseWallet,
        '--mint',
        CTX.baseMint,
        '--amount',
        '1000000',
      ],
      'dao'
    );
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('get-mint [quote]', async () => {
    await runCli(['token:get-mint', '--address', CTX.quoteMint]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual('Owner:');
    expect(stub.args[1][1]).toEqual(CTX.dao);
    expect(stub.args[2][0]).toEqual('Supply:');
    expect(stub.args[3][0]).toEqual('Decimals:');
    expect(stub.args[3][1]).toEqual('9');
  });

  it('get-mint [base]', async () => {
    await runCli(['token:get-mint', '--address', CTX.baseMint]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual('Owner:');
    expect(stub.args[1][1]).toEqual(CTX.dao);
    expect(stub.args[2][0]).toEqual('Supply:');
    expect(stub.args[3][0]).toEqual('Decimals:');
    expect(stub.args[3][1]).toEqual('9');
  });

  it('get-wallet', async () => {
    await runCli(
      ['token:get-wallet', '--address', CTX.takerQuoteWallet],
      'taker'
    );
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[0][1]).toEqual(CTX.takerQuoteWallet);
    expect(stub.args[1][0]).toEqual('Owner:');
    expect(stub.args[1][1]).toEqual(CTX.taker);
    expect(stub.args[2][0]).toEqual('Mint:');
    expect(stub.args[2][1]).toEqual(CTX.quoteMint);
    expect(stub.args[3][0]).toEqual('Amount:');
    expect(stub.args[3][1]).toBeGreaterThan(0);
    expect(stub.args[4][0]).toEqual('Decimals:');
    // TODO: Should this not be 9?
    expect(stub.args[4][1]).toBe('0');
  });
});
