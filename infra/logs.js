const { solanaLogs } = require('./helpers');

process.env.NX_TASKS_RUNNER_DYNAMIC_OUTPUT = false;

async function main() {
  await solanaLogs;
}

main().then().catch(console.error);
