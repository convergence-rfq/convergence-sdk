import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';
import { PublicKey } from '@solana/web3.js';

import { runCli, getPk, ADDRESS, TX } from '../utils/helpers';

describe('utils', () => {
  let stub: SinonStub;

  let mint: string;
  let wallet: string;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
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
    await runCli([
      'token:create-wallet',
      '--owner',
      getPk('maker'),
      '--mint',
      mint,
    ]);
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
      'maker'
    );
    expect(stub.args[0][0]).toEqual(TX);
  });
});
