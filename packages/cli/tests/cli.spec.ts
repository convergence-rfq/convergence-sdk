import { homedir } from 'os';
import fs from 'fs';
import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';
import { Keypair } from '@solana/web3.js';
import * as sdk from '@convergence-rfq/sdk';

import { makeCli } from '../src/cli';

const ENDPOINT = 'http://127.0.0.1:8899';
const BTC_ORACLE = '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee'; // Switchboard

const getKpFile = (user: string) => {
  if (user === 'taker') {
    return `${homedir()}/.config/solana/taker.json`;
  } else if (user === 'maker') {
    return `${homedir()}/.config/solana/maker.json`;
  } else if (user === 'mint-authority') {
    return `${homedir()}/.config/solana/mint-authority.json`;
  } else if (user === 'dao') {
    return `${homedir()}/.config/solana/id.json`;
  }
  throw new Error('Invalid user');
};

const getPk = (user: string) => {
  const buffer = JSON.parse(fs.readFileSync(getKpFile(user), 'utf8'));
  const owner = Keypair.fromSecretKey(new Uint8Array(buffer));
  return owner.publicKey.toString();
};

describe('Convergence CLI', () => {
  const SUCCESS = 'Success!';

  let stub: SinonStub;

  let baseMint: string;
  let quoteMint: string;

  const cli = makeCli();

  const runCli = async (args: string[], user = 'dao') => {
    return await cli.parseAsync(
      ['ts-node', './src/cli.ts']
        .concat(args)
        .concat(['--rpc-endpoint', ENDPOINT])
        .concat(['--keypair-file', getKpFile(user)])
    );
  };

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  it('airdrop [dao]', async () => {
    const args = ['airdrop', '--amount', '1'];
    await runCli(args);
    expect(stub.args[0][0]).toEqual('Airdropping...');
    expect(stub.args[2][0]).toEqual(SUCCESS);
  });

  it('airdrop [maker]', async () => {
    const args = ['airdrop', '--amount', '1'];
    await runCli(args, 'maker');
    expect(stub.args[0][0]).toEqual('Airdropping...');
    expect(stub.args[2][0]).toEqual(SUCCESS);
  });

  it('airdrop [taker]', async () => {
    const args = ['airdrop', '--amount', '1'];
    await runCli(args, 'taker');
    expect(stub.args[0][0]).toEqual('Airdropping...');
    expect(stub.args[2][0]).toEqual(SUCCESS);
  });

  it('airdrop [mint-authority]', async () => {
    const args = ['airdrop', '--amount', '1'];
    await runCli(args, 'mint-authority');
    expect(stub.args[0][0]).toEqual('Airdropping...');
    expect(stub.args[2][0]).toEqual(SUCCESS);
  });

  it('create-mint [base]', async () => {
    const args = ['create-mint', '--decimals', '9'];
    await runCli(args, 'mint-authority');
    baseMint = stub.args[1][1];
    expect(stub.args[3][0]).toEqual(SUCCESS);
  });

  it('create-mint [quote]', async () => {
    const args = ['create-mint', '--decimals', '6'];
    await runCli(args, 'mint-authority');
    quoteMint = stub.args[1][1];
    expect(stub.args[3][0]).toEqual(SUCCESS);
  });

  it('create-wallet [base:maker]', async () => {
    const args = [
      'create-wallet',
      '--owner',
      getPk('maker'),
      '--mint',
      baseMint,
    ];
    await runCli(args);
    expect(stub.args[3][0]).toEqual(SUCCESS);
  });

  it('create-wallet [base:taker]', async () => {
    const args = [
      'create-wallet',
      '--owner',
      getPk('taker'),
      '--mint',
      baseMint,
    ];
    await runCli(args);
    expect(stub.args[3][0]).toEqual(SUCCESS);
  });

  it('create-wallet [quote:maker]', async () => {
    await runCli([
      'create-wallet',
      '--owner',
      getPk('maker'),
      '--mint',
      quoteMint,
    ]);
    expect(stub.args[3][0]).toEqual(SUCCESS);
  });

  it('create-wallet [quote:taker]', async () => {
    await runCli([
      'create-wallet',
      '--owner',
      getPk('taker'),
      '--mint',
      quoteMint,
    ]);
    expect(stub.args[3][0]).toEqual(SUCCESS);
  });

  it('initialize-protocol', async () => {
    await runCli(['initialize-protocol', '--collateral-mint', quoteMint]);
    expect(stub.args[2][0]).toEqual(SUCCESS);
  });

  it('add-instrument [spot]', async () => {
    await runCli([
      'add-instrument',
      '--instrument-program',
      sdk.spotInstrumentProgram.address.toString(),
    ]);
    expect(stub.args[2][0]).toEqual(SUCCESS);
  });

  it('add-instrument [psyoptions american options]', async () => {
    await runCli([
      'add-instrument',
      '--instrument-program',
      sdk.psyoptionsAmericanInstrumentProgram.address.toString(),
    ]);
    expect(stub.args[2][0]).toEqual(SUCCESS);
  });

  it('add-instrument [psyoptions european options]', async () => {
    await runCli([
      'add-instrument',
      '--instrument-program',
      sdk.psyoptionsEuropeanInstrumentProgram.address.toString(),
    ]);
    expect(stub.args[2][0]).toEqual(SUCCESS);
  });

  it('initialize-risk-engine', async () => {
    await runCli([
      'initialize-risk-engine',
      '--collateral-for-variable-size-rfq-creation',
      '1000000000',
      '--collateral-for-fixed-quote-amount-rfq-creation',
      '2000000000',
      '--safety-price-shift-factor',
      '0.01',
      '--overall-safety-factor',
      '0.1',
    ]);
    expect(stub.args[2][0]).toEqual(SUCCESS);
  });

  it('add-base-asset [base]', async () => {
    await runCli([
      'add-base-asset',
      '--ticker',
      'BTC',
      '--oracle-address',
      BTC_ORACLE,
    ]);
    expect(stub.args[2][0]).toEqual(SUCCESS);
  });

  it('get-base-assets', async () => {
    await runCli(['get-base-assets']);
  });

  it('register-mint [quote]', async () => {
    await runCli(['register-mint', '--mint', quoteMint]);
    expect(stub.args[2][0]).toEqual(SUCCESS);
  });

  it('register-mint [base]', async () => {
    await runCli([
      'register-mint',
      '--base-asset-index',
      '0',
      '--mint',
      baseMint,
    ]);
    expect(stub.args[2][0]).toEqual(SUCCESS);
  });

  it('get-registered-mints', async () => {
    await runCli(['get-registered-mints']);
    expect(stub.args[3][0]).toEqual(SUCCESS);
  });
});
