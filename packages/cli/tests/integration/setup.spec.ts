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

  it('airdrop-sol [dao|maker|taker|mint-authority]', async () => {
    await Promise.all([
      runCli(['airdrop-sol', '--amount', '1']),
      runCli(['airdrop-sol', '--amount', '1'], 'maker'),
      runCli(['airdrop-sol', '--amount', '1'], 'taker'),
      runCli(['airdrop-sol', '--amount', '1'], 'mint-authority'),
    ]);
    expect(stub.args[0][0]).toEqual(TX);
    expect(stub.args[1][0]).toEqual(TX);
    expect(stub.args[2][0]).toEqual(TX);
    expect(stub.args[3][0]).toEqual(TX);
  });

  it('create-mint [base|quote]', async () => {
    await Promise.all([
      runCli(['create-mint', '--decimals', '9'], 'mint-authority'),
      runCli(['create-mint', '--decimals', '6'], 'mint-authority'),
    ]);
    ctx.baseMint = stub.args[0][1];
    expect(stub.args[1][0]).toEqual(TX);
    ctx.quoteMint = stub.args[2][1];
    expect(stub.args[3][0]).toEqual(TX);
  });

  it('create-wallet [maker:base|taker:base|maker:quote|taker:quote]', async () => {
    await Promise.all([
      runCli([
        'create-wallet',
        '--owner',
        getPk('maker'),
        '--mint',
        ctx.baseMint,
      ]),
      runCli([
        'create-wallet',
        '--owner',
        getPk('taker'),
        '--mint',
        ctx.baseMint,
      ]),
      runCli([
        'create-wallet',
        '--owner',
        getPk('maker'),
        '--mint',
        ctx.quoteMint,
      ]),
      runCli([
        'create-wallet',
        '--owner',
        getPk('taker'),
        '--mint',
        ctx.quoteMint,
      ]),
    ]);

    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
    ctx.makerBaseWallet = stub.args[0][1];
    expect(new PublicKey(ctx.makerBaseWallet)).toBeTruthy();

    expect(stub.args[2][0]).toEqual(ADDRESS);
    expect(stub.args[3][0]).toEqual(TX);
    ctx.takerBaseWallet = stub.args[2][1];
    expect(new PublicKey(ctx.takerBaseWallet)).toBeTruthy();

    expect(stub.args[4][0]).toEqual(ADDRESS);
    expect(stub.args[5][0]).toEqual(TX);
    ctx.makerQuoteWallet = stub.args[4][1];
    expect(new PublicKey(ctx.makerQuoteWallet)).toBeTruthy();

    expect(stub.args[6][0]).toEqual(ADDRESS);
    expect(stub.args[7][0]).toEqual(TX);
    ctx.takerQuoteWallet = stub.args[6][1];
    expect(new PublicKey(ctx.takerQuoteWallet)).toBeTruthy();
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
