const { spawn } = require('child_process');

process.env.NX_TASKS_RUNNER_DYNAMIC_OUTPUT = false;

const RFQ = '6k3nypehfxd4tqCGRxNEZBMiT4xUPdQCkothLVz3JK6D';
const RISK_ENGINE = '76TdqS9cEb8tYKUWKMzXBMwgCtXJiYMcrHxmzrYthjUm';
const SPOT_INSTRUMENT = '6pyiZyPDi7a6vMymw5NFTvtFBZJbDrNsgrcYK5jGEH4K';
const PSYOPTIONS_EUROPEAN_INSTRUMENT =
  '7ZD9LcvMPfurRYz2AuZPWgtSXuSxPmvZNMBFK7fhyvQA';
const PSYOPTIONS_AMERICAN_INSTRUMENT =
  'ATtEpDQ6smvJnMSJvhLc21DBCTBKutih7KBf9Qd5b8xy';
const SWITCHBOARD_BTC_ORACLE = '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee';
const SWITCHBOARD_SOL_ORACLE = 'GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR';
const PSYOPTIONS_EURO_PRIMITIVE =
  'FASQhaZQT53W9eT9wWnPoBFw8xzZDey9TbMmJj6jCQTs';
const PSEUDO_PYTH_ORACLE = 'FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH';

const solanaLogs = new Promise((resolve) => {
  // Logs are not available immediately after starting the test validator
  setTimeout(() => {
    const child = spawn('solana', ['logs', '--url', 'localhost'], {
      stdio: [process.stdin, process.stdout, process.stderr],
    });
    resolve(child);
  }, 1_000);
});

const solanaTestValidator = new Promise((resolve) => {
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
    PSYOPTIONS_AMERICAN_INSTRUMENT,
    'programs/psyoptions_american_instrument.so',
    '--bpf-program',
    RISK_ENGINE,
    'programs/risk_engine.so',
    '--bpf-program',
    SWITCHBOARD_BTC_ORACLE,
    'programs/btc_20000_oracle_switchboard.json',
    '--bpf-program',
    SWITCHBOARD_SOL_ORACLE,
    'programs/sol_30_oracle_switchboard.json',
    '--bpf-program',
    PSYOPTIONS_EURO_PRIMITIVE,
    'programs/euro_primitive.so',
    '--bpf-program',
    PSEUDO_PYTH_ORACLE,
    'programs/pseudo_pyth.so',
    '--quiet',
    '--reset',
  ];
  const child = spawn('solana-test-validator', args, {
    stdio: [process.stdin, process.stdout, process.stderr],
  });
  resolve(child);
});

async function main() {
  const [solanaValidatorChild, solanaLogsChild] = await Promise.all([
    solanaTestValidator,
    solanaLogs,
  ]);

  const child = spawn('yarn', ['test:all'], {
    stdio: [process.stdin, process.stdout, process.stderr],
  });

  child.on('close', (code) => {
    if (code === 0) {
      process.kill(solanaValidatorChild.pid, 'SIGTERM');
      process.kill(solanaLogsChild.pid, 'SIGTERM');
      process.exit(0);
    }
  });
}

main().then().catch(console.error);
