import type { FastifyInstance } from 'fastify';
import path from 'path';
import dotenv from 'dotenv';

// Load .env file from the api directory BEFORE any other setup
dotenv.config({ path: path.join(__dirname, '../.env') });

// Ensure test environment variables are set before any imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'test-secret-32-bytes-minimum-aaaaaaaaaaaa';

// Use test database if DATABASE_URL points to production
// Only replace the database name (after the last slash), not the username
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('_test')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/\/musclemap$/, '/musclemap_test');
}

// Track if we have database available
let _dbAvailable = false;

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
  console.log('[test_app] DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'not set');

  try {
    await initializePool();
    console.log('[test_app] Database pool initialized');

    // Verify pool is actually ready
    const { isPoolHealthy } = clientModule;
    const healthy = await isPoolHealthy();
    if (!healthy) {
      console.warn('[test_app] Database pool not healthy, tests requiring database will be skipped');
      _dbAvailable = false;
    } else {
      console.log('[test_app] Database pool health check passed');
      _dbAvailable = true;
    }
  } catch (error) {
    console.warn('[test_app] Database connection failed, tests requiring database will be skipped');
    console.warn('[test_app] Error:', error instanceof Error ? error.message : String(error));
    _dbAvailable = false;
    _modulesLoaded = true;
    return;
  }

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

  // Check if database is available
  if (!_dbAvailable) {
    throw new Error(
      'SKIP: Database not available. Set DATABASE_URL in apps/api/.env to run integration tests.\n' +
      'Example: DATABASE_URL=postgresql://user:password@localhost:5432/musclemap_test'
    );
  }

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

  // Direct import of createServer - we know exactly where the app factory is
  console.log('[test_app] Importing createServer from ../src/http/server...');
  try {
    const { createServer } = await import('../src/http/server');
    console.log('[test_app] createServer imported successfully, calling it...');
    _app = await createServer();
    console.log('[test_app] Fastify app created, waiting for ready...');
    await _app.ready();
    console.log('[test_app] Fastify app ready');
    return _app;
  } catch (error) {
    console.error('[test_app] Failed to create server:', error);
    throw new Error(
      `getTestApp: Failed to create Fastify server.\n` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Check if database is available for tests
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  await loadModules();
  return _dbAvailable;
}

/**
 * Safely get test app, returning null if database is unavailable.
 * Use this for tests that should skip when no database is present.
 */
export async function tryGetTestApp(): Promise<FastifyInstance | null> {
  try {
    return await getTestApp();
  } catch (error: any) {
    // Skip on explicit SKIP message
    if (error instanceof Error && error.message.startsWith('SKIP:')) {
      return null;
    }
    // Skip on database connection errors (role doesn't exist, auth failed, connection refused, db doesn't exist)
    const pgErrorCodes = ['28000', '28P01', 'ECONNREFUSED', '3D000'];
    if (error?.code && pgErrorCodes.includes(error.code)) {
      console.warn(`[test_app] Database error (${error.code}), skipping tests`);
      return null;
    }
    // Skip on common connection error messages
    const skipPatterns = [
      'role .* does not exist',
      'password authentication failed',
      'database .* does not exist',
      'could not connect to server',
      'Connection refused',
      'SKIP:',
    ];
    if (error?.message && skipPatterns.some(p => new RegExp(p, 'i').test(error.message))) {
      console.warn(`[test_app] Database connection error, skipping tests: ${error.message}`);
      return null;
    }
    throw error;
  }
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

  // Reset state flags so pool can be re-initialized by next test suite
  _modulesLoaded = false;
  _dbInitialized = false;
  _dbAvailable = false;
}
