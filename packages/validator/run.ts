import { spawnValidator } from './helpers';

const run = new Promise((resolve) => {
  const child = spawnValidator();
  resolve(child);
});

async function main() {
  await run;
}

main().then().catch(console.error);
