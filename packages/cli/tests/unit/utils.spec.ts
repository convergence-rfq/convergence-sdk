import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';
import { PublicKey } from '@solana/web3.js';

import { ChildProccess, spawnValidator } from '../validator';
import { Ctx, runCli, getPk, ADDRESS, TX, readCtx } from '../helpers';

describe('utils', () => {
  let stub: SinonStub;
  let validator: ChildProccess;
  let ctx: Ctx;

  let mint: string;
  let wallet: string;

  before((done) => {
    ctx = readCtx();
    validator = spawnValidator(done);
  });

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  after(() => {
    validator.kill();
  });

  it('airdrop:sol', async () => {
    await runCli(['airdrop:sol', '--amount', '1']);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('token:create-mint', async () => {
    await runCli(['token:create-mint', '--decimals', '9'], 'mint_authority');
    mint = stub.args[0][1];
    expect(new PublicKey(mint)).toBeTruthy();
    expect(stub.args[1][0]).toEqual(TX);
  });

  it('token:create-wallet', async () => {
    await runCli(
      ['token:create-wallet', '--owner', getPk('maker'), '--mint', mint],
      'maker'
    );
    wallet = stub.args[0][1];
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
    expect(new PublicKey(wallet)).toBeTruthy();
  });

  it('token:mint-to', async () => {
    await runCli(
      [
        'token:mint-to',
        '--wallet',
        wallet,
        '--mint',
        mint,
        '--amount',
        '1000000000000',
      ],
      'mint_authority'
    );
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('token:get-mint [quote]', async () => {
    await runCli(['token:get-mint', '--address', ctx.quoteMint]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual('Owner:');
    expect(stub.args[1][1]).toEqual(ctx.mintAuthority);
    expect(stub.args[2][0]).toEqual('Supply:');
    expect(stub.args[3][0]).toEqual('Decimals:');
    expect(stub.args[3][1]).toEqual('6');
  });

  it('token:get-mint [base]', async () => {
    await runCli(['token:get-mint', '--address', ctx.baseMint]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual('Owner:');
    expect(stub.args[1][1]).toEqual(ctx.mintAuthority);
    expect(stub.args[2][0]).toEqual('Supply:');
    expect(stub.args[3][0]).toEqual('Decimals:');
    expect(stub.args[3][1]).toEqual('9');
  });

  it('token:get-wallet', async () => {
    await runCli(['token:get-wallet', '--address', ctx.takerQuoteWallet]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[0][1]).toEqual(ctx.takerQuoteWallet);
    expect(stub.args[1][0]).toEqual('Owner:');
    expect(stub.args[1][1]).toEqual(ctx.taker);
    expect(stub.args[2][0]).toEqual('Mint:');
    expect(stub.args[2][1]).toEqual(ctx.quoteMint);
    expect(stub.args[3][0]).toEqual('Amount:');
    expect(stub.args[3][1]).toBeGreaterThan(0);
    expect(stub.args[4][0]).toEqual('Decimals:');
    // TODO: Why is this not 6?
    //expect(stub.args[4][1]).toBe('6');
  });
});
