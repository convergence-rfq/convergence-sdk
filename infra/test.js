const { spawn } = require('child_process');

process.env.NX_TASKS_RUNNER_DYNAMIC_OUTPUT = false;

const testAll = new Promise((resolve) => {
    const child = spawn("yarn", ["test:all"], {
        stdio: [process.stdin, process.stdout, process.stderr]
    });
    resolve(child);
});

const solanaLogs = new Promise((resolve) => {
    const x = setTimeout(() => {
        const child = spawn("solana", ["logs", "--url", "localhost"], {
            stdio: [process.stdin, process.stdout, process.stderr]
        });
        return child;
    }, 2_000);
    resolve(x)
});

const solanaTestValidator = new Promise((resolve) => {
    const child = spawn("./infra/solana-test-validator.sh", [], {
        stdio: [process.stdin, process.stdout, process.stderr]
    });
    resolve(child);
});

async function main() {
    await Promise.all([testAll, solanaLogs, solanaTestValidator]);
}

main().then().catch(console.error);
