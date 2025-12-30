import fs from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';

export function createLogger(name = 'script') {
  const prefix = `[${name}]`;

  return {
    info: (msg) => console.log(`${prefix} ${msg}`),
    warn: (msg) => console.warn(`${prefix} ⚠️  ${msg}`),
    error: (msg) => console.error(`${prefix} ❌ ${msg}`),
    success: (msg) => console.log(`${prefix} ✅ ${msg}`),
  };
}

export function resolveRepoRoot(fromUrl = import.meta.url) {
  let dir = dirname(fileURLToPath(fromUrl));

  while (!fs.existsSync(join(dir, 'package.json'))) {
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return dir;
}

export function resolveDbPath({ cliPath, fromUrl = import.meta.url } = {}) {
  const root = resolveRepoRoot(fromUrl);
  const dbPath = resolve(root, cliPath || process.env.MUSCLEMAP_DB_PATH || 'musclemap.db');
  return { dbPath, exists: fs.existsSync(dbPath) };
}

export function parseScriptArgs(argv) {
  const args = argv.slice(2);
  const options = { jobType: 'all', dryRun: false, smokeTest: false, dbPath: undefined };
  const positional = [];

  for (const arg of args) {
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--smoke-test') options.smokeTest = true;
    else if (arg.startsWith('--db=')) options.dbPath = arg.replace('--db=', '');
    else positional.push(arg);
  }

  if (positional.length > 0) {
    options.jobType = positional[0];
  }

  return options;
}

export function exitSuccess(logger, message) {
  if (message) {
    (logger?.success ? logger.success(message) : console.log(message));
  }
  process.exit(0);
}

export function exitFailure(logger, error) {
  const msg = error instanceof Error ? error.message : String(error);
  (logger?.error ? logger.error(msg) : console.error(msg));
  process.exit(1);
}
