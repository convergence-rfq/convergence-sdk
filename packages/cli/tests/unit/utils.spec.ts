import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';
import { PublicKey } from '@solana/web3.js';

import { ChildProccess, spawnValidator } from '../validator';
import { runCli, getPk, ADDRESS, TX } from '../utils/helpers';

describe('utils', () => {
  let stub: SinonStub;
  let validator: ChildProccess;

  let mint: string;
  let wallet: string;

  before((done) => {
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
});
