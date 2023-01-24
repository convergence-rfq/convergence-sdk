const { spawn } = require('child_process');

const rfq = require('@convergence-rfq/rfq');
const riskEngine = require('@convergence-rfq/risk-engine');
const spotInstrument = require('@convergence-rfq/spot-instrument');
const psyoptionsEuropeanInstrument = require('@convergence-rfq/psyoptions-european-instrument');
const psyoptionsAmericanInstrument = require('@convergence-rfq/psyoptions-american-instrument');

const SWITCHBOARD_BTC_ORACLE = '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee';
const SWITCHBOARD_SOL_ORACLE = 'GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR';
const PSYOPTIONS_EURO_PRIMITIVE =
  'FASQhaZQT53W9eT9wWnPoBFw8xzZDey9TbMmJj6jCQTs';
const PSEUDO_PYTH_ORACLE = 'FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH';

module.exports.solanaLogs = new Promise((resolve) => {
  const child = spawn(
    'sh',
    ['-c', 'while true; do solana logs --url localhost; sleep 1; done'],
    {
      stdio: [process.stdin, process.stderr, process.stdout],
    }
  );
  resolve(child);
});

module.exports.solanaTestValidator = new Promise((resolve) => {
  const args = [
    '--account',
    SWITCHBOARD_BTC_ORACLE,
    'programs/btc_20000_oracle_switchboard.json',
    '--account',
    SWITCHBOARD_SOL_ORACLE,
    'programs/sol_30_oracle_switchboard.json',
    '--bpf-program',
    rfq.PROGRAM_ADDRESS,
    'programs/rfq.so',
    '--bpf-program',
    spotInstrument.PROGRAM_ADDRESS,
    'programs/spot_instrument.so',
    '--bpf-program',
    psyoptionsEuropeanInstrument.PROGRAM_ADDRESS,
    'programs/psyoptions_european_instrument.so',
    '--bpf-program',
    psyoptionsAmericanInstrument.PROGRAM_ADDRESS,
    'programs/psyoptions_american_instrument.so',
    '--bpf-program',
    riskEngine.PROGRAM_ADDRESS,
    'programs/risk_engine.so',
    '--bpf-program',
    PSYOPTIONS_EURO_PRIMITIVE,
    'programs/euro_primitive.so',
    '--bpf-program',
    PSEUDO_PYTH_ORACLE,
    'programs/pseudo_pyth.so',
    '--ledger',
    './test-ledger',
    '--quiet',
    '--reset',
  ];
  const child = spawn('solana-test-validator', args, {
    stdio: [process.stdin, process.stdout, process.stderr],
  });
  resolve(child);
});
