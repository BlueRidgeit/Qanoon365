import { execFileSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
function runCommand(command, args, options = {}) {
  const label = [command, ...args].join(' ');
  console.log(`\n> ${label}`);
  execFileSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    ...options,
  });
}

function ensureDockerDaemon() {
  try {
    execFileSync('docker', ['info'], {
      cwd: repoRoot,
      stdio: 'ignore',
    });
  } catch {
    throw new Error(
      'Docker daemon is not running. Start Docker Desktop, then rerun npm run test:e2e:ui.',
    );
  }
}

function waitForPort(port, host = '127.0.0.1', timeoutMs = 60_000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    function tryConnect() {
      const socket = net.createConnection({ port, host });

      socket.once('connect', () => {
        socket.end();
        resolve();
      });

      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - start >= timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}`));
          return;
        }
        setTimeout(tryConnect, 1_000);
      });
    }

    tryConnect();
  });
}

async function main() {
  ensureDockerDaemon();
  runCommand('docker', ['compose', 'up', '-d']);

  await Promise.all([
    waitForPort(5432),
    waitForPort(6379),
    waitForPort(10000),
  ]);

  if (process.platform === 'win32') {
    runCommand('cmd.exe', ['/c', 'npm', 'run', 'prisma:seed', '--workspace', '@albasti/api']);
    return;
  }

  runCommand('npm', ['run', 'prisma:seed', '--workspace', '@albasti/api']);
}

main().catch((error) => {
  console.error('\nPlaywright prepare failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
