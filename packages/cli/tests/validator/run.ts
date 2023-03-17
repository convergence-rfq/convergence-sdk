import { spawn } from 'child_process';
import path from 'path';

import * as rfq from '@convergence-rfq/rfq';
import * as riskEngine from '@convergence-rfq/risk-engine';
import * as spotInstrument from '@convergence-rfq/spot-instrument';
import * as psyoptionsEuropeanInstrument from '@convergence-rfq/psyoptions-european-instrument';
import * as psyoptionsAmericanInstrument from '@convergence-rfq/psyoptions-american-instrument';

import { getJsonPk } from '../utils/helpers';

const PSYOPTIONS_AMERICAN = 'R2y9ip6mxmWUj4pt54jP2hz2dgvMozy9VTSwMWE7evs';
const PSYOPTIONS_EURO = 'FASQhaZQT53W9eT9wWnPoBFw8xzZDey9TbMmJj6jCQTs';
const SWITCHBOARD_BTC_ORACLE = '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee';
const SWITCHBOARD_SOL_ORACLE = 'GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR';
const PYTH_ORACLE = 'FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH';

export const getBaseArgs = () => [
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
  '--reset',
];

const getAccountArgs = (name: string) => [
  '--account',
  getJsonPk(name),
  path.join(__dirname, `accounts/${name}.json`),
];

const getSetupCompleteArgs = () => [
  ...getAccountArgs('dao'),
  ...getAccountArgs('maker'),
  ...getAccountArgs('taker'),
  ...getAccountArgs('mint_authority'),
  ...getAccountArgs('base_mint'),
  ...getAccountArgs('quote_mint'),
  ...getAccountArgs('maker_base_wallet'),
  ...getAccountArgs('taker_base_wallet'),
  ...getAccountArgs('maker_quote_wallet'),
  ...getAccountArgs('taker_quote_wallet'),
];

const getBootstrapCompleteArgs = () => [
  ...getAccountArgs('protocol'),
  ...getAccountArgs('risk_engine'),
  ...getAccountArgs('base_asset'),
  ...getAccountArgs('risk_engine'),
  ...getAccountArgs('quote_registered_mint'),
  ...getAccountArgs('base_registered_mint'),
  ...getAccountArgs('maker_collateral'),
  ...getAccountArgs('taker_collateral'),
];

const runValidator = (setup: boolean, bootstrap: boolean): any => {
  const args = getBaseArgs();

  if (setup && bootstrap) {
    throw new Error('Cannot run both setup and bootstrap');
  }

  if (!setup || bootstrap) {
    args.push(...getSetupCompleteArgs());
  }

  if (!setup && !bootstrap) {
    args.push(...getBootstrapCompleteArgs());
  }

  const validator = spawn('solana-test-validator', args, {
    stdio: [process.stdin, process.stdout, process.stderr],
  });

  validator.on('exit', () => {
    validator.kill();
  });

  return validator;
};

const hasBootstrapFlag = (args: string[]) => args.includes('--bootstrap');
const hasSetupFlag = (args: string[]) => args.includes('--setup');

const bootstrap = hasBootstrapFlag(process.argv);
const setup = hasSetupFlag(process.argv);

runValidator(setup, bootstrap);
