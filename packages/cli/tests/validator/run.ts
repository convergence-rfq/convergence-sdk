import { spawn } from 'child_process';
import path from 'path';

import * as rfq from '@convergence-rfq/rfq';
import * as riskEngine from '@convergence-rfq/risk-engine';
import * as spotInstrument from '@convergence-rfq/spot-instrument';
import * as psyoptionsEuropeanInstrument from '@convergence-rfq/psyoptions-european-instrument';
import * as psyoptionsAmericanInstrument from '@convergence-rfq/psyoptions-american-instrument';
import { getPk, getJsonPk } from '../utils/helpers';

const PSYOPTIONS_AMERICAN = 'R2y9ip6mxmWUj4pt54jP2hz2dgvMozy9VTSwMWE7evs';
const PSYOPTIONS_EURO = 'FASQhaZQT53W9eT9wWnPoBFw8xzZDey9TbMmJj6jCQTs';
const SWITCHBOARD_BTC_ORACLE = '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee';
const SWITCHBOARD_SOL_ORACLE = 'GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR';
const PYTH_ORACLE = 'FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH';

export const baseArgs = [
  '--account',
  SWITCHBOARD_BTC_ORACLE,
  path.join(__dirname, 'accounts/btc_20000_oracle_switchboard.json'),
  '--account',
  SWITCHBOARD_SOL_ORACLE,
  path.join(__dirname, 'accounts/sol_30_oracle_switchboard.json'),
  '--bpf-program',
  rfq.PROGRAM_ADDRESS,
  path.join(__dirname, 'programs/rfq.so'),
  '--bpf-program',
  spotInstrument.PROGRAM_ADDRESS,
  path.join(__dirname, 'programs/spot_instrument.so'),
  '--bpf-program',
  psyoptionsEuropeanInstrument.PROGRAM_ADDRESS,
  path.join(__dirname, 'programs/psyoptions_european_instrument.so'),
  '--bpf-program',
  PSYOPTIONS_AMERICAN,
  path.join(__dirname, 'programs/psy_american.so'),
  '--bpf-program',
  psyoptionsAmericanInstrument.PROGRAM_ADDRESS,
  path.join(__dirname, 'programs/psyoptions_american_instrument.so'),
  '--bpf-program',
  riskEngine.PROGRAM_ADDRESS,
  path.join(__dirname, 'programs/risk_engine.so'),
  '--bpf-program',
  PSYOPTIONS_EURO,
  path.join(__dirname, 'programs/euro_primitive.so'),
  '--bpf-program',
  PYTH_ORACLE,
  path.join(__dirname, 'programs/pseudo_pyth.so'),
  '--ledger',
  './test-ledger',
  '--quiet',
  '--reset',
];

const bootstrappedArgs: string[] = [];

const setupArgs: string[] = [
  // Users
  '--account',
  getPk('dao'),
  path.join(__dirname, 'accounts/dao.json'),
  '--account',
  getPk('maker'),
  path.join(__dirname, 'accounts/maker.json'),
  '--account',
  getPk('taker'),
  path.join(__dirname, 'accounts/taker.json'),
  '--account',
  getPk('mint_authority'),
  path.join(__dirname, 'accounts/mint_authority.json'),
  // Mints
  '--account',
  getJsonPk('base_mint'),
  path.join(__dirname, 'accounts/base_mint.json'),
  '--account',
  getJsonPk('quote_mint'),
  path.join(__dirname, 'accounts/quote_mint.json'),
  // Wallets
  '--account',
  getJsonPk('maker_base_wallet'),
  path.join(__dirname, 'accounts/maker_base_wallet.json'),
  '--account',
  getJsonPk('taker_base_wallet'),
  path.join(__dirname, 'accounts/taker_base_wallet.json'),
  '--account',
  getJsonPk('maker_quote_wallet'),
  path.join(__dirname, 'accounts/maker_quote_wallet.json'),
  '--account',
  getJsonPk('taker_quote_wallet'),
  path.join(__dirname, 'accounts/taker_quote_wallet.json'),
];

const hasBootstrapFlag = (args: string[]) => args.includes('--bootstrap');
const hasSetupFlag = (args: string[]) => args.includes('--setup');

const runValidator = (setup: boolean, bootstrap: boolean): any => {
  if (!setup) {
    baseArgs.push(...setupArgs);
  }
  if (!bootstrap) {
    baseArgs.push(...bootstrappedArgs);
  }
  return spawn('solana-test-validator', baseArgs, {
    stdio: [process.stdin, process.stdout, process.stderr],
  });
};

const bootstrap = hasBootstrapFlag(process.argv);
const setup = hasSetupFlag(process.argv);

runValidator(setup, bootstrap);
