import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';
import { PublicKey } from '@solana/web3.js';

import { runCli, getPk, ADDRESS, TX, Ctx, writeCtx } from './../helpers';

describe('setup', () => {
  const ctx = {} as Ctx;
  let stub: SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  after(() => {
    writeCtx(ctx);
  });

  it('airdrop-sol [dao]', async () => {
    await runCli(['airdrop-sol', '--amount', '1']);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('airdrop-sol [maker]', async () => {
    await runCli(['airdrop-sol', '--amount', '1'], 'maker');
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('airdrop-sol [taker]', async () => {
    await runCli(['airdrop-sol', '--amount', '1'], 'taker');
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('airdrop [mint-authority]', async () => {
    await runCli(['airdrop-sol', '--amount', '1'], 'mint-authority');
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('create-mint [base]', async () => {
    await runCli(['create-mint', '--decimals', '9'], 'mint-authority');
    ctx.baseMint = stub.args[0][1];
    expect(stub.args[1][0]).toEqual(TX);
  });

  it('create-mint [quote]', async () => {
    await runCli(['create-mint', '--decimals', '6'], 'mint-authority');
    ctx.quoteMint = stub.args[0][1];
    expect(stub.args[1][0]).toEqual(TX);
  });

  it('create-wallet [maker:base]', async () => {
    await runCli([
      'create-wallet',
      '--owner',
      getPk('maker'),
      '--mint',
      ctx.baseMint,
    ]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
    ctx.makerBaseWallet = stub.args[0][1];
    expect(new PublicKey(ctx.makerBaseWallet)).toBeTruthy();
  });

  it('create-wallet [taker:base]', async () => {
    await runCli([
      'create-wallet',
      '--owner',
      getPk('taker'),
      '--mint',
      ctx.baseMint,
    ]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
    ctx.takerBaseWallet = stub.args[0][1];
    expect(new PublicKey(ctx.takerBaseWallet)).toBeTruthy();
  });

  it('create-wallet [maker:quote]', async () => {
    await runCli([
      'create-wallet',
      '--owner',
      getPk('maker'),
      '--mint',
      ctx.quoteMint,
    ]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
    ctx.makerQuoteWallet = stub.args[0][1];
    expect(new PublicKey(ctx.makerQuoteWallet)).toBeTruthy();
  });

  it('create-wallet [taker:quote]', async () => {
    await runCli([
      'create-wallet',
      '--owner',
      getPk('taker'),
      '--mint',
      ctx.quoteMint,
    ]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
    ctx.takerQuoteWallet = stub.args[0][1];
    expect(ctx.takerQuoteWallet).toBeTruthy();
  });

  it('mint-to [quote:taker]', async () => {
    await runCli(
      [
        'mint-to',
        '--wallet',
        ctx.takerQuoteWallet,
        '--mint',
        ctx.quoteMint,
        '--amount',
        '1000000000000',
      ],
      'mint-authority'
    );
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('mint-to [quote:maker]', async () => {
    await runCli(
      [
        'mint-to',
        '--wallet',
        ctx.makerQuoteWallet,
        '--mint',
        ctx.quoteMint,
        '--amount',
        '100000000000',
      ],
      'mint-authority'
    );
    expect(stub.args[0][0]).toEqual(TX);
  });
});
