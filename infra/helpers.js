const { spawn } = require('child_process');

const RFQ = '6k3nypehfxd4tqCGRxNEZBMiT4xUPdQCkothLVz3JK6D';
const RISK_ENGINE = '76TdqS9cEb8tYKUWKMzXBMwgCtXJiYMcrHxmzrYthjUm';
const SPOT_INSTRUMENT = '6pyiZyPDi7a6vMymw5NFTvtFBZJbDrNsgrcYK5jGEH4K';
const PSYOPTIONS_EUROPEAN_INSTRUMENT =
  '7ZD9LcvMPfurRYz2AuZPWgtSXuSxPmvZNMBFK7fhyvQA';
const PSYOPTIONS_AMERICAN_INSTRUMENT =
  'ATtEpDQ6smvJnMSJvhLc21DBCTBKutih7KBf9Qd5b8xy';
const PSYOPTIONS_AMERICAN = 'R2y9ip6mxmWUj4pt54jP2hz2dgvMozy9VTSwMWE7evs';
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
    '--bpf-program',
    RFQ,
    'programs/rfq.so',
    '--bpf-program',
    SPOT_INSTRUMENT,
    'programs/spot_instrument.so',
    '--bpf-program',
    PSYOPTIONS_EUROPEAN_INSTRUMENT,
    'programs/psyoptions_european_instrument.so',
    '--bpf-program',
    PSYOPTIONS_AMERICAN,
    'programs/psy_american.so',
    '--bpf-program',
    PSYOPTIONS_AMERICAN_INSTRUMENT,
    'programs/psyoptions_american_instrument.so',
    '--bpf-program',
    RISK_ENGINE,
    'programs/risk_engine.so',
    '--account',
    SWITCHBOARD_BTC_ORACLE,
    'programs/btc_20000_oracle_switchboard.json',
    '--account',
    SWITCHBOARD_SOL_ORACLE,
    'programs/sol_30_oracle_switchboard.json',
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
