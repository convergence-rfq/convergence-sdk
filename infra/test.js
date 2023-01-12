const { spawn } = require('child_process');
const { solanaTestValidator, solanaLogs } = require('./helpers');

process.env.NX_TASKS_RUNNER_DYNAMIC_OUTPUT = false;

async function main() {
  const [solanaValidatorChild, solanaLogsChild] = await Promise.all([
    solanaTestValidator,
    solanaLogs,
  ]);

  const child = spawn('yarn', ['test'], {
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
