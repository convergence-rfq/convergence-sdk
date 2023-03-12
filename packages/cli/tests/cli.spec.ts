import { homedir } from 'os';
import fs from 'fs';
import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';
import { Keypair } from '@solana/web3.js';

import { makeCli } from '../src/cli';

const ENDPOINT = 'http://127.0.0.1:8899';

//import { rfq } from '@convergence-rfq/rfq';
//const riskEngine = require('@convergence-rfq/risk-engine');
//const spotInstrument = require('@convergence-rfq/spot-instrument');
//const psyoptionsEuropeanInstrument = require('@convergence-rfq/psyoptions-european-instrument');
//const psyoptionsAmericanInstrument = require('@convergence-rfq/psyoptions-american-instrument');
//const PSYOPTIONS_AMERICAN = 'R2y9ip6mxmWUj4pt54jP2hz2dgvMozy9VTSwMWE7evs';
const BTC_ORACLE = '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee'; // Switchboard
//const EURO_PRIMITIVE = 'FASQhaZQT53W9eT9wWnPoBFw8xzZDey9TbMmJj6jCQTs';
//const PYTH_ORACLE = 'FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH';

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

  it('create-mint base', async () => {
    const args = ['create-mint', '--decimals', '9'];
    await cli.parseAsync(argv.concat(args).concat(rpcEndpoint));
    baseMint = consoleStub.args[1][1];
    expect(consoleStub.args[3][0]).toEqual(SUCCESS);
  });

  it('create-mint quote', async () => {
    const args = ['create-mint', '--decimals', '9'];
    await cli.parseAsync(argv.concat(args).concat(rpcEndpoint));
    quoteMint = consoleStub.args[1][1];
    expect(consoleStub.args[3][0]).toEqual(SUCCESS);
  });

  it('create-wallet collateral', async () => {
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

  it('register-mint quote', async () => {
    const args = ['register-mint', '--mint', quoteMint];
    await cli.parseAsync(argv.concat(args).concat(rpcEndpoint));
    expect(consoleStub.args[2][0]).toEqual(SUCCESS);
  });

  it('register-mint base', async () => {
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
