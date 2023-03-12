import { homedir } from 'os';
import fs from 'fs';
import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';
import { Keypair } from '@solana/web3.js';
import * as sdk from '@convergence-rfq/sdk';

import { makeCli } from '../src/cli';

const ENDPOINT = 'http://127.0.0.1:8899';

const id = Keypair.fromSecretKey(
  new Uint8Array(
    JSON.parse(fs.readFileSync(`${homedir()}/.config/solana/id.json`, 'utf8'))
  )
);

describe('Convergence CLI', () => {
  const SUCCESS = 'Success!';

  const cli = makeCli();

  const argv = ['ts-node', './src/cli.ts'];
  const rpcEndpoint = ['--rpc-endpoint', ENDPOINT];

  let consoleStub: SinonStub;

  let baseMint: string;
  let quoteMint: string;

  const BTC_ORACLE = '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee'; // Switchboard

  beforeEach(() => {
    consoleStub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    consoleStub.restore();
  });

  it('airdrop', async () => {
    const args = ['airdrop', '--amount', '1'];
    await cli.parseAsync(argv.concat(args).concat(rpcEndpoint));
    expect(consoleStub.args[0][0]).toEqual('Airdropping...');
    expect(consoleStub.args[2][0]).toEqual(SUCCESS);
  });

  it('create-mint (base)', async () => {
    const args = ['create-mint', '--decimals', '9'];
    await cli.parseAsync(argv.concat(args).concat(rpcEndpoint));
    baseMint = consoleStub.args[1][1];
    expect(consoleStub.args[3][0]).toEqual(SUCCESS);
  });

  it('create-mint (quote)', async () => {
    const args = ['create-mint', '--decimals', '6'];
    await cli.parseAsync(argv.concat(args).concat(rpcEndpoint));
    quoteMint = consoleStub.args[1][1];
    expect(consoleStub.args[3][0]).toEqual(SUCCESS);
  });

  it('create-wallet (quote)', async () => {
    const args = [
      'create-wallet',
      '--owner',
      id.publicKey.toString(),
      '--mint',
      quoteMint,
    ];
    await cli.parseAsync(argv.concat(args).concat(rpcEndpoint));
    expect(consoleStub.args[3][0]).toEqual(SUCCESS);
  });

  it('initialize-protocol', async () => {
    const args = ['initialize-protocol', '--collateral-mint', quoteMint];
    await cli.parseAsync(argv.concat(args).concat(rpcEndpoint));
    expect(consoleStub.args[2][0]).toEqual(SUCCESS);
  });

  it('add-instrument (spot)', async () => {
    const args = [
      'add-instrument',
      '--instrument-program',
      sdk.spotInstrumentProgram.address.toString(),
    ];
    await cli.parseAsync(argv.concat(args).concat(rpcEndpoint));
    expect(consoleStub.args[2][0]).toEqual(SUCCESS);
  });

  it('add-instrument (american options)', async () => {
    const args = [
      'add-instrument',
      '--instrument-program',
      sdk.psyoptionsAmericanInstrumentProgram.address.toString(),
    ];
    await cli.parseAsync(argv.concat(args).concat(rpcEndpoint));
    expect(consoleStub.args[2][0]).toEqual(SUCCESS);
  });

  it('add-instrument (european options)', async () => {
    const args = [
      'add-instrument',
      '--instrument-program',
      sdk.psyoptionsEuropeanInstrumentProgram.address.toString(),
    ];
    await cli.parseAsync(argv.concat(args).concat(rpcEndpoint));
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
    await cli.parseAsync(argv.concat(args).concat(rpcEndpoint));
    expect(consoleStub.args[2][0]).toEqual(SUCCESS);
  });

  it('add-base-asset', async () => {
    const args = [
      'add-base-asset',
      '--ticker',
      'BTC',
      '--oracle-address',
      BTC_ORACLE,
    ];
    await cli.parseAsync(argv.concat(args).concat(rpcEndpoint));
    expect(consoleStub.args[2][0]).toEqual(SUCCESS);
  });

  it('get-base-assets', async () => {
    const args = ['get-base-assets'];
    await cli.parseAsync(argv.concat(args).concat(rpcEndpoint));
  });

  it('register-mint (quote)', async () => {
    const args = ['register-mint', '--mint', quoteMint];
    await cli.parseAsync(argv.concat(args).concat(rpcEndpoint));
    expect(consoleStub.args[2][0]).toEqual(SUCCESS);
  });

  it('register-mint (base)', async () => {
    const args = [
      'register-mint',
      '--base-asset-index',
      '0',
      '--mint',
      baseMint,
    ];
    await cli.parseAsync(argv.concat(args).concat(rpcEndpoint));
    expect(consoleStub.args[2][0]).toEqual(SUCCESS);
  });

  it('get-registered-mints', async () => {
    const args = ['get-registered-mints'];
    await cli.parseAsync(argv.concat(args).concat(rpcEndpoint));
    expect(consoleStub.args[3][0]).toEqual(SUCCESS);
  });
});
