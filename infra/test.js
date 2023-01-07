const { spawn } = require('child_process');

process.env.NX_TASKS_RUNNER_DYNAMIC_OUTPUT = false;

const solanaLogs = new Promise((resolve) => {
    // Logs are not available immediately after starting the test validator
    setTimeout(() => {
        const child = spawn('solana', ['logs', '--url', 'localhost'], {
            stdio: [process.stdin, process.stdout, process.stderr]
        });
        resolve(child);
    }, 1_000);
});

const solanaTestValidator = new Promise((resolve) => {
    const child = spawn('./infra/solana-test-validator.sh', [], {
        stdio: [process.stdin, process.stdout, process.stderr]
    });
    resolve(child);
});

async function main() {
    await Promise.all([solanaTestValidator, solanaLogs]);

    const child = spawn('yarn', ['test:all'], {
        stdio: [process.stdin, process.stdout, process.stderr]
    });
    
    child.on('close', code => {
        if (code === 0) {
            process.exit(0);
        }
    });
}

main().then().catch(console.error);
