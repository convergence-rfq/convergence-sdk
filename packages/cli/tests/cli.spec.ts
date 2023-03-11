import { expect } from 'expect';
import { makeCli } from '../src/cli';

const DEVNET = 'https://api.devnet.solana.com';

const argv = ['ts-node', './src/cli.ts'];
const rpc = ['--rpc-endpoint', DEVNET];

const cli = makeCli();

describe('Convergence CLI', () => {
  it('airdrop', async () => {
    await cli.parseAsync(argv.concat(['airdrop']).concat(rpc));
    expect(true).toBe(true);
  });

  it('get base assets', async () => {
    await cli.parseAsync(argv.concat(['get-base-assets']).concat(rpc));
    expect(true).toBe(true);
  });

  it('get registered mints', async () => {
    await cli.parseAsync(argv.concat(['get-registered-mints']).concat(rpc));
    expect(true).toBe(true);
  });
});
