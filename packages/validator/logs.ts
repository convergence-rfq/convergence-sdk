import { spawn } from 'child_process';

const run = new Promise((resolve) => {
  const child = spawn(
    'sh',
    ['-c', 'while true; do solana logs --url localhost; sleep 1; done'],
    {
      stdio: [process.stdin, process.stderr, process.stdout],
    }
  );
  resolve(child);
});
async function main() {
  await run;
}

main().then().catch(console.error);
