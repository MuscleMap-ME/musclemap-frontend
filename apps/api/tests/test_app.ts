import type { FastifyInstance } from 'fastify';

// Ensure test environment variables are set before any imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'test-secret-32-bytes-minimum-aaaaaaaaaaaa';

// Use test database if DATABASE_URL points to production
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('_test')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace('/musclemap', '/musclemap_test');
}

// Dynamic imports to ensure env vars are set first
let initializePool: typeof import('../src/db/client').initializePool;
let initializeSchema: typeof import('../src/db/schema').initializeSchema;
let seedCreditActions: typeof import('../src/db/schema').seedCreditActions;
let migrateTrialAndSubscriptions: typeof import('../src/db/migrations/001_add_trial_and_subscriptions').migrate;
let migrateCommunityDashboard: typeof import('../src/db/migrations/002_community_dashboard').migrate;
let migrateMessaging: typeof import('../src/db/migrations/003_messaging').migrate;

let _app: FastifyInstance | null = null;
let _dbInitialized = false;
let _modulesLoaded = false;

async function loadModules() {
  if (_modulesLoaded) return;

  // Import client module first and initialize pool BEFORE importing other modules
  // This is critical because schema and migration modules import `db` which needs the pool
  const clientModule = await import('../src/db/client');
  initializePool = clientModule.initializePool;

  // Initialize pool before importing modules that use db
  console.log('[test_app] Initializing database pool...');
  await initializePool();
  console.log('[test_app] Database pool initialized');

  // Verify pool is actually ready
  const { isPoolHealthy } = clientModule;
  const healthy = await isPoolHealthy();
  if (!healthy) {
    throw new Error('Database pool initialization failed - pool is not healthy');
  }
  console.log('[test_app] Database pool health check passed');

  // Now safe to import modules that use db
  const schemaModule = await import('../src/db/schema');
  const migration1 = await import('../src/db/migrations/001_add_trial_and_subscriptions');
  const migration2 = await import('../src/db/migrations/002_community_dashboard');
  const migration3 = await import('../src/db/migrations/003_messaging');

  initializeSchema = schemaModule.initializeSchema;
  seedCreditActions = schemaModule.seedCreditActions;
  migrateTrialAndSubscriptions = migration1.migrate;
  migrateCommunityDashboard = migration2.migrate;
  migrateMessaging = migration3.migrate;

  _modulesLoaded = true;
}

function isFastify(x: any): x is FastifyInstance {
  return !!x && typeof x === 'object' && typeof x.inject === 'function' && typeof x.ready === 'function';
}

function isThenable(x: any): boolean {
  return !!x && (typeof x === 'object' || typeof x === 'function') && typeof x.then === 'function';
}

async function tryImport(path: string): Promise<any | null> {
  try {
    return await import(path);
  } catch {
    return null;
  }
}

function looksDangerousFactory(fn: any): boolean {
  if (typeof fn !== 'function') return false;
  const name = String(fn.name || '').toLowerCase();
  // avoid anything that hints it will start listening / boot the process
  if (name.includes('start') || name.includes('listen') || name.includes('run')) return true;
  return false;
}

function looksLikeFactory(fn: any): boolean {
  if (typeof fn !== 'function') return false;
  const name = String(fn.name || '').toLowerCase();
  // allow anonymous functions if they are explicitly on known keys (handled elsewhere)
  if (!name) return true;
  return name.includes('create') || name.includes('build') || name.includes('make');
}

async function tryCall(fn: any): Promise<any> {
  if (typeof fn !== 'function') return undefined;
  if (looksDangerousFactory(fn)) return undefined;

  // try common signatures, keep logger quiet
  // (also pass listen:false if your factories support it—harmless otherwise)
  try { return await fn({ logger: false, listen: false }); } catch {}
  try { return await fn({ logger: false }); } catch {}
  try { return await fn({}); } catch {}
  try { return await fn(); } catch {}
  return undefined;
}

function pickCandidates(mod: any): Array<{ label: string; value: any }> {
  if (!mod) return [];

  const candidates: Array<{ label: string; value: any }> = [];

  // Direct instances first
  for (const key of ['app', 'fastify', 'instance']) {
    if (key in mod) candidates.push({ label: `export:${key}`, value: (mod as any)[key] });
  }

  // default export: ONLY accept if it is already a Fastify instance (never call it)
  if ('default' in mod) candidates.push({ label: 'export:default', value: (mod as any).default });

  // Known factory names
  for (const key of [
    'createServer',
    'buildServer',
    'makeServer',
    'createApp',
    'buildApp',
    'makeApp',
  ]) {
    if (key in mod) candidates.push({ label: `export:${key}`, value: (mod as any)[key] });
  }

  return candidates.filter((c) => c.value !== undefined && c.value !== null);
}

export async function getTestApp(): Promise<FastifyInstance> {
  // Load modules dynamically to ensure env vars are set first
  // This also initializes the database pool
  await loadModules();

  // Ensure database schema and migrations are run
  if (!_dbInitialized) {
    await initializeSchema();
    await seedCreditActions();
    await migrateTrialAndSubscriptions();
    await migrateCommunityDashboard();
    await migrateMessaging();
    _dbInitialized = true;
  }

  if (_app) return _app;

  const tried: string[] = [];

  // IMPORTANT: do NOT import ../src/index or ../dist/index (they start listening)
  // Keep this list tight and “server factory only”.
  const modulePaths = [
    '../src/http/server',
    '../src/http',
    '../src/server',
    '../src/app',
    '../dist/http/server',
    '../dist/http',
    '../dist/server',
    '../dist/app',
  ];

  for (const p of modulePaths) {
    const mod = await tryImport(p);
    tried.push(`${p}${mod ? '' : ' (import failed)'}`);
    if (!mod) continue;

    for (const { label, value } of pickCandidates(mod)) {
      // If it’s a promise somehow, skip (we only want actual instances/functions)
      if (isThenable(value)) continue;

      // direct instance
      if (isFastify(value)) {
        _app = value;
        await _app.ready();
        return _app;
      }

      // only call functions that look like factories
      if (typeof value === 'function' && looksLikeFactory(value)) {
        const made = await tryCall(value);
        if (isFastify(made)) {
          _app = made;
          await _app.ready();
          return _app;
        }
      }

      // NEVER call default exports (this is where accidental startServer tends to hide)
      if (label === 'export:default' && typeof value === 'function') {
        continue;
      }
    }
  }

  throw new Error(
    `getTestApp: could not resolve Fastify instance.\n` +
      `Tried modules: ${modulePaths.join(', ')}\n` +
      `tried:\n- ${tried.join('\n- ')}\n`
  );
}

export async function closeTestApp(): Promise<void> {
  const app = _app;
  _app = null;
  if (!app) return;

  try {
    await app.close();
  } catch {
    // ignore close errors in tests
  }

  // Close database pool
  try {
    if (_modulesLoaded) {
      const { closePool } = await import('../src/db/client');
      await closePool();
    }
  } catch {
    // ignore close errors
  }
}
