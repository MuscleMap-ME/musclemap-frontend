import os from 'node:os';
import path from 'node:path';
import { beforeAll, afterAll } from 'vitest';
import { makeTestApp } from "\.\/_fastify\-harness";

// Make tests stable even if prod env is missing vars
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'test-secret-32-bytes-minimum-aaaaaaaaaaaa';

// Try to isolate DB if the app honors DB_PATH / MUSCLEMAP_DB_PATH.
// If it doesn't, we still avoid destructive deletes (we only delete vitest_* records).
const testDbPath = path.join(os.tmpdir(), `musclemap_vitest_${process.pid}.db`);
process.env.MUSCLEMAP_DB_PATH ||= testDbPath;
process.env.DB_PATH ||= testDbPath;

let db: any;
let initializeSchema: any;
let seedCreditActions: any;

beforeAll(async () => {
  // Dynamic imports so env is set before modules load
  ({ db } = await import('../src/db/client'));
  ({ initializeSchema, seedCreditActions } = await import('../src/db/schema'));

  initializeSchema();
  seedCreditActions();
});

afterAll(async () => {
  try {
    // Best-effort cleanup of only vitest-created records
    if (db) {
      db.prepare("DELETE FROM competition_entries WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'vitest_%')").run();
      db.prepare("DELETE FROM users WHERE username LIKE 'vitest_%'").run();
      db.prepare("DELETE FROM competitions WHERE name LIKE 'Vitest_%'").run();
    }
  } catch {}
});
