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
  const TX = 'Tx:';
  const ADDRESS = 'Address:';

  let stub: SinonStub;

  let baseMint: string;
  let quoteMint: string;

  let takerQuoteWallet: string;
  let takerBaseWallet: string;

  //let makerBaseWallet: string;
  //let makerQuoteWallet: string;

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
    baseMint = stub.args[0][1];
    expect(stub.args[1][0]).toEqual(TX);
  });

  it('create-mint [quote]', async () => {
    await runCli(['create-mint', '--decimals', '6'], 'mint-authority');
    quoteMint = stub.args[0][1];
    expect(stub.args[1][0]).toEqual(TX);
  });

  it('create-wallet [base:maker]', async () => {
    await runCli([
      'create-wallet',
      '--owner',
      getPk('maker'),
      '--mint',
      baseMint,
    ]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
  });

  it('create-wallet [base:taker]', async () => {
    await runCli([
      'create-wallet',
      '--owner',
      getPk('taker'),
      '--mint',
      baseMint,
    ]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
    takerBaseWallet = stub.args[0][1];
    expect(takerBaseWallet).toBeTruthy();
  });

  it('create-wallet [quote:maker]', async () => {
    await runCli([
      'create-wallet',
      '--owner',
      getPk('maker'),
      '--mint',
      quoteMint,
    ]);
    expect(stub.args[1][0]).toEqual(TX);
  });

  it('create-wallet [quote:taker]', async () => {
    await runCli([
      'create-wallet',
      '--owner',
      getPk('taker'),
      '--mint',
      quoteMint,
    ]);
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
    takerQuoteWallet = stub.args[0][1];
    expect(takerQuoteWallet).toBeTruthy();
  });

  it('mint-to [quote:taker]', async () => {
    await runCli(
      [
        'mint-to',
        '--wallet',
        getPk('taker'),
        '--mint',
        quoteMint,
        '--amount',
        '1000000000',
      ],
      'mint-authority'
    );
    expect(stub.args[1][0]).toEqual(TX);
  });

  it('mint-to [quote:maker]', async () => {
    await runCli(
      [
        'mint-to',
        '--wallet',
        getPk('maker'),
        '--mint',
        quoteMint,
        '--amount',
        '1000000000',
      ],
      'mint-authority'
    );
    expect(stub.args[1][0]).toEqual(TX);
  });

  it('initialize-protocol', async () => {
    await runCli(['initialize-protocol', '--collateral-mint', quoteMint]);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('add-instrument [spot]', async () => {
    await runCli([
      'add-instrument',
      '--instrument-program',
      sdk.spotInstrumentProgram.address.toString(),
      '--validate-data-account-amount',
      '1',
      '--prepare-to-settle-account-amount',
      '7',
      '--settle-account-amount',
      '3',
      '--revert-preparation-account-amount',
      '3',
      '--clean-up-account-amount',
      '4',
    ]);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('add-instrument [psyoptions american options]', async () => {
    await runCli([
      'add-instrument',
      '--instrument-program',
      sdk.psyoptionsAmericanInstrumentProgram.address.toString(),
      '--validate-data-account-amount',
      '3',
      '--prepare-to-settle-account-amount',
      '7',
      '--settle-account-amount',
      '3',
      '--revert-preparation-account-amount',
      '3',
      '--clean-up-account-amount',
      '4',
    ]);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('add-instrument [psyoptions european options]', async () => {
    await runCli([
      'add-instrument',
      '--instrument-program',
      sdk.psyoptionsEuropeanInstrumentProgram.address.toString(),
      '--validate-data-account-amount',
      '2',
      '--prepare-to-settle-account-amount',
      '7',
      '--settle-account-amount',
      '3',
      '--revert-preparation-account-amount',
      '3',
      '--clean-up-account-amount',
      '4',
    ]);
    expect(stub.args[0][0]).toEqual(TX);
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
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('add-base-asset [base]', async () => {
    await runCli([
      'add-base-asset',
      '--ticker',
      'BTC',
      '--oracle-address',
      BTC_ORACLE,
    ]);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('get-base-assets', async () => {
    await runCli(['get-base-assets']);
    expect(stub.args[0][0]).toEqual(ADDRESS);
  });

  it('register-mint [quote]', async () => {
    await runCli(['register-mint', '--mint', quoteMint]);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('register-mint [base]', async () => {
    await runCli([
      'register-mint',
      '--base-asset-index',
      '0',
      '--mint',
      baseMint,
    ]);
    expect(stub.args[0][0]).toEqual(TX);
  });

  it('get-registered-mints', async () => {
    await runCli(['get-registered-mints']);
    expect(stub.args[1][0]).toEqual(ADDRESS);
  });

  it('initialize-collateral-account [maker]', async () => {
    await runCli(['initialize-collateral-account'], 'maker');
    expect(stub.args[0][0]).toEqual(ADDRESS);
    expect(stub.args[1][0]).toEqual(TX);
  });

  it('fund-collateral-account [maker]', async () => {
    await runCli(
      ['fund-collateral-account', '--amount', '1000000000'],
      'maker'
    );
    expect(stub.args[0][0]).toEqual(TX);
  });
});
