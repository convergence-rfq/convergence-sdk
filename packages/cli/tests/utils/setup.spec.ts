import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';
import { PublicKey } from '@solana/web3.js';

import { runCli, getPk, ADDRESS, TX, Ctx, writeCtx } from './helpers';

describe('setup', () => {
  const ctx = new Ctx();
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

  it('airdrop:sol [dao|maker|taker|mint_authority]', async () => {
    await Promise.all([
      runCli(['airdrop:sol', '--amount', '1']),
      runCli(['airdrop:sol', '--amount', '1'], 'maker'),
      runCli(['airdrop:sol', '--amount', '1'], 'taker'),
      runCli(['airdrop:sol', '--amount', '1'], 'mint_authority'),
    ]);
    expect(stub.args[0][0]).toEqual(TX);
    expect(stub.args[1][0]).toEqual(TX);
    expect(stub.args[2][0]).toEqual(TX);
    expect(stub.args[3][0]).toEqual(TX);
  });

  it('token:create-mint [base|quote]', async () => {
    await Promise.all([
      runCli(['token:create-mint', '--decimals', '9'], 'mint_authority'),
      runCli(['token:create-mint', '--decimals', '6'], 'mint_authority'),
    ]);
    ctx.baseMint = stub.args[0][1];
    expect(stub.args[1][0]).toEqual(TX);
    ctx.quoteMint = stub.args[2][1];
    expect(stub.args[3][0]).toEqual(TX);
  });

  it('token:create-wallet [maker:base|taker:base|maker:quote|taker:quote]', async () => {
    await runCli([
      'token:create-wallet',
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

  it('token:create-wallet [maker:base|taker:base|maker:quote|taker:quote]', async () => {
    await runCli([
      'token:create-wallet',
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

  it('token:create-wallet [maker:base|taker:base|maker:quote|taker:quote]', async () => {
    await runCli([
      'token:create-wallet',
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

  it('token:create-wallet [maker:base|taker:base|maker:quote|taker:quote]', async () => {
    await runCli([
      'token:create-wallet',
      '--owner',
      getPk('taker'),
      '--mint',
      ctx.quoteMint,
    ]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
    ctx.takerQuoteWallet = stub.args[0][1];
    expect(new PublicKey(ctx.takerQuoteWallet)).toBeTruthy();
  });

  it('token:mint-to [quote:taker]', async () => {
    await runCli(
      [
        'token:mint-to',
        '--wallet',
        ctx.takerQuoteWallet,
        '--mint',
        ctx.quoteMint,
        '--amount',
        '1000000000000',
      ],
      'mint_authority'
    );
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('token:mint-to [quote:maker]', async () => {
    await runCli(
      [
        'token:mint-to',
        '--wallet',
        ctx.makerQuoteWallet,
        '--mint',
        ctx.quoteMint,
        '--amount',
        '100000000000',
      ],
      'mint_authority'
    );
    expect(stub.args[0][0]).toEqual(TX);
  });
});
