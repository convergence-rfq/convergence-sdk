import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';
import { PublicKey } from '@solana/web3.js';

import {
  ChildProccess,
  spawnValidator,
  getPk,
  Ctx,
  writeCtx,
} from '../../../validator';
import { runCli, ADDRESS, TX } from '../helpers';

describe('setup', () => {
  const ctx = new Ctx();
  let stub: SinonStub;
  let validator: ChildProccess;

  before((done) => {
    validator = spawnValidator(done, true);
  });

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  after(async () => {
    await writeCtx(ctx);
    validator.kill();
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

  it('token:create-mint [base]', async () => {
    await runCli(['token:create-mint', '--decimals', '9'], 'mint_authority');
    expect(stub.args[1][0]).toEqual(TX);
    ctx.baseMint = stub.args[0][1];
  });

  it('token:create-mint [quote]', async () => {
    await runCli(['token:create-mint', '--decimals', '6'], 'mint_authority');
    expect(stub.args[1][0]).toEqual(TX);
    ctx.quoteMint = stub.args[0][1];
  });

  it('token:create-wallet [maker:base]', async () => {
    await runCli(
      [
        'token:create-wallet',
        '--owner',
        getPk('maker'),
        '--mint',
        ctx.baseMint,
      ],
      'maker'
    );
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
    ctx.makerBaseWallet = stub.args[0][1];
    expect(new PublicKey(ctx.makerBaseWallet)).toBeTruthy();
  });

  it('token:create-wallet [taker:base]', async () => {
    await runCli(
      [
        'token:create-wallet',
        '--owner',
        getPk('taker'),
        '--mint',
        ctx.baseMint,
      ],
      'taker'
    );
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
    ctx.takerBaseWallet = stub.args[0][1];
    expect(new PublicKey(ctx.takerBaseWallet)).toBeTruthy();
  });

  it('token:create-wallet [maker:quote]', async () => {
    await runCli(
      [
        'token:create-wallet',
        '--owner',
        getPk('maker'),
        '--mint',
        ctx.quoteMint,
      ],
      'maker'
    );
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
    ctx.makerQuoteWallet = stub.args[0][1];
    expect(new PublicKey(ctx.makerQuoteWallet)).toBeTruthy();
  });

  it('token:create-wallet [taker:quote]', async () => {
    await runCli(
      [
        'token:create-wallet',
        '--owner',
        getPk('taker'),
        '--mint',
        ctx.quoteMint,
      ],
      'taker'
    );
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
    ctx.takerQuoteWallet = stub.args[0][1];
    expect(new PublicKey(ctx.takerQuoteWallet)).toBeTruthy();
  });

  it('token:mint-to [taker:base]', async () => {
    await runCli(
      [
        'token:mint-to',
        '--wallet',
        ctx.takerBaseWallet,
        '--mint',
        ctx.baseMint,
        '--amount',
        '1000000000000000',
      ],
      'mint_authority'
    );
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('token:mint-to [maker:base]', async () => {
    await runCli(
      [
        'token:mint-to',
        '--wallet',
        ctx.makerBaseWallet,
        '--mint',
        ctx.baseMint,
        '--amount',
        '1000000000000000',
      ],
      'mint_authority'
    );
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('token:mint-to [taker:quote]', async () => {
    await runCli(
      [
        'token:mint-to',
        '--wallet',
        ctx.takerQuoteWallet,
        '--mint',
        ctx.quoteMint,
        '--amount',
        '1000000000000000',
      ],
      'mint_authority'
    );
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('token:mint-to [maker:quote]', async () => {
    await runCli(
      [
        'token:mint-to',
        '--wallet',
        ctx.makerQuoteWallet,
        '--mint',
        ctx.quoteMint,
        '--amount',
        '1000000000000000',
      ],
      'mint_authority'
    );
    expect(stub.args[0][0]).toEqual(TX);
  });
});
