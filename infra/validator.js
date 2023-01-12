const { solanaTestValidator } = require('./helpers');

process.env.NX_TASKS_RUNNER_DYNAMIC_OUTPUT = false;

async function main() {
  await solanaTestValidator;
}

main().then().catch(console.error);
