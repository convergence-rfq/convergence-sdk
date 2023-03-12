import { homedir } from 'os';
import fs from 'fs';
import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';
import { Keypair } from '@solana/web3.js';
import * as sdk from '@convergence-rfq/sdk';

import { makeCli } from '../src/cli';

describe('Convergence CLI', () => {
  const ENDPOINT = 'http://127.0.0.1:8899';

  const SUCCESS = 'Success!';

  const BTC_ORACLE = '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee'; // Switchboard

  let consoleStub: SinonStub;

  let baseMint: string;
  let quoteMint: string;

  const cli = makeCli();

  const getKeypair = (user: string) => {
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

  const runCli = async (args: string[], user = 'dao') => {
    return await cli.parseAsync(
      ['ts-node', './src/cli.ts']
        .concat(args)
        .concat(['--rpc-endpoint', ENDPOINT])
        .concat(['--keypair-file', getKeypair(user)])
    );
  };

  beforeEach(() => {
    consoleStub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    consoleStub.restore();
  });

  it('airdrop [dao]', async () => {
    const args = ['airdrop', '--amount', '1'];
    await runCli(args);
    expect(consoleStub.args[0][0]).toEqual('Airdropping...');
    expect(consoleStub.args[2][0]).toEqual(SUCCESS);
  });

  it('airdrop [maker]', async () => {
    const args = ['airdrop', '--amount', '1'];
    await runCli(args, 'maker');
    expect(consoleStub.args[0][0]).toEqual('Airdropping...');
    expect(consoleStub.args[2][0]).toEqual(SUCCESS);
  });

  it('airdrop [taker]', async () => {
    const args = ['airdrop', '--amount', '1'];
    await runCli(args, 'taker');
    expect(consoleStub.args[0][0]).toEqual('Airdropping...');
    expect(consoleStub.args[2][0]).toEqual(SUCCESS);
  });

  it('airdrop [mint-authority]', async () => {
    const args = ['airdrop', '--amount', '1'];
    await runCli(args, 'mint-authority');
    expect(consoleStub.args[0][0]).toEqual('Airdropping...');
    expect(consoleStub.args[2][0]).toEqual(SUCCESS);
  });

  it('create-mint [base]', async () => {
    const args = ['create-mint', '--decimals', '9'];
    await runCli(args, 'mint-authority');
    baseMint = consoleStub.args[1][1];
    expect(consoleStub.args[3][0]).toEqual(SUCCESS);
  });

  it('create-mint [quote]', async () => {
    const args = ['create-mint', '--decimals', '6'];
    await runCli(args, 'mint-authority');
    quoteMint = consoleStub.args[1][1];
    expect(consoleStub.args[3][0]).toEqual(SUCCESS);
  });

  it('create-wallet [base:maker]', async () => {
    const owner = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(getKeypair('maker'), 'utf8')))
    );
    const args = [
      'create-wallet',
      '--owner',
      owner.publicKey.toString(),
      '--mint',
      baseMint,
    ];
    await runCli(args);
    expect(consoleStub.args[3][0]).toEqual(SUCCESS);
  });

  it('create-wallet [base:taker]', async () => {
    const owner = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(getKeypair('taker'), 'utf8')))
    );
    const args = [
      'create-wallet',
      '--owner',
      owner.publicKey.toString(),
      '--mint',
      baseMint,
    ];
    await runCli(args);
    expect(consoleStub.args[3][0]).toEqual(SUCCESS);
  });

  it('create-wallet [quote:maker]', async () => {
    const owner = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(getKeypair('maker'), 'utf8')))
    );
    const args = [
      'create-wallet',
      '--owner',
      owner.publicKey.toString(),
      '--mint',
      quoteMint,
    ];
    await runCli(args);
    expect(consoleStub.args[3][0]).toEqual(SUCCESS);
  });

  it('create-wallet [quote:taker]', async () => {
    const owner = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(getKeypair('taker'), 'utf8')))
    );
    const args = [
      'create-wallet',
      '--owner',
      owner.publicKey.toString(),
      '--mint',
      quoteMint,
    ];
    await runCli(args);
    expect(consoleStub.args[3][0]).toEqual(SUCCESS);
  });

  it('initialize-protocol', async () => {
    const args = ['initialize-protocol', '--collateral-mint', quoteMint];
    await runCli(args);
    expect(consoleStub.args[2][0]).toEqual(SUCCESS);
  });

  it('add-instrument [spot]', async () => {
    const args = [
      'add-instrument',
      '--instrument-program',
      sdk.spotInstrumentProgram.address.toString(),
    ];
    await runCli(args);
    expect(consoleStub.args[2][0]).toEqual(SUCCESS);
  });

  it('add-instrument [psyoptions american options]', async () => {
    const args = [
      'add-instrument',
      '--instrument-program',
      sdk.psyoptionsAmericanInstrumentProgram.address.toString(),
    ];
    await runCli(args);
    expect(consoleStub.args[2][0]).toEqual(SUCCESS);
  });

  it('add-instrument [psyoptions european options]', async () => {
    const args = [
      'add-instrument',
      '--instrument-program',
      sdk.psyoptionsEuropeanInstrumentProgram.address.toString(),
    ];
    await runCli(args);
    expect(consoleStub.args[2][0]).toEqual(SUCCESS);
  });

  it('initialize-risk-engine', async () => {
    const args = [
      'initialize-risk-engine',
      '--collateral-for-variable-size-rfq-creation',
      '1000000000',
      '--collateral-for-fixed-quote-amount-rfq-creation',
      '2000000000',
      '--safety-price-shift-factor',
      '0.01',
      '--overall-safety-factor',
      '0.1',
    ];
    await runCli(args);
    expect(consoleStub.args[2][0]).toEqual(SUCCESS);
  });

  it('add-base-asset [base]', async () => {
    const args = [
      'add-base-asset',
      '--ticker',
      'BTC',
      '--oracle-address',
      BTC_ORACLE,
    ];
    await runCli(args);
    expect(consoleStub.args[2][0]).toEqual(SUCCESS);
  });

  it('get-base-assets', async () => {
    const args = ['get-base-assets'];
    await runCli(args);
  });

  it('register-mint [quote]', async () => {
    const args = ['register-mint', '--mint', quoteMint];
    await runCli(args);
    expect(consoleStub.args[2][0]).toEqual(SUCCESS);
  });

  it('register-mint [base]', async () => {
    const args = [
      'register-mint',
      '--base-asset-index',
      '0',
      '--mint',
      baseMint,
    ];
    await runCli(args);
    expect(consoleStub.args[2][0]).toEqual(SUCCESS);
  });

  it('get-registered-mints', async () => {
    const args = ['get-registered-mints'];
    await runCli(args);
    expect(consoleStub.args[3][0]).toEqual(SUCCESS);
  });
});
