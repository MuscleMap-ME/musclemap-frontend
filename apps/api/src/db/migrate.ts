/**
 * Database Migration Script
 *
 * Initializes PostgreSQL schema and runs migrations.
 * Usage: pnpm db:migrate
 */

import fs from 'fs';
import path from 'path';
import { db, query, queryOne, closePool, initializePool } from './client';
import { loggers } from '../lib/logger';

const log = loggers.db;

// Helper to get pool for connection testing
const getPool = () => db.getPool();

interface _Migration {
  id: number;
  name: string;
  applied_at: Date;
}

/**
 * Ensure migrations table exists
 */
async function ensureMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

/**
 * Get list of applied migrations
 */
async function getAppliedMigrations(): Promise<string[]> {
  const rows = await query<{ name: string }>('SELECT name FROM migrations ORDER BY id');
  return rows.rows.map((r) => r.name);
}

/**
 * Record a migration as applied
 */
async function recordMigration(name: string): Promise<void> {
  await query('INSERT INTO migrations (name) VALUES ($1)', [name]);
}

/**
 * Run the base schema
 */
async function runBaseSchema(): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');

  if (!fs.existsSync(schemaPath)) {
    log.error('Schema file not found', { path: schemaPath });
    throw new Error('Schema file not found');
  }

  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Split by semicolons but be careful with function bodies
  // PostgreSQL can handle multiple statements, so we'll execute the whole file
  await query(schema);
  log.info('Base schema applied');
}

/**
 * Seed credit actions
 */
async function seedCreditActions(): Promise<void> {
  const actions = [
    { id: 'workout.complete', name: 'Complete Workout', cost: 25 },
    { id: 'ai.generate', name: 'AI Generation', cost: 50 },
    { id: 'competition.create', name: 'Create Competition', cost: 100 },
    { id: 'prescription.generate', name: 'Generate Prescription', cost: 1 },
  ];

  for (const action of actions) {
    await query(
      `INSERT INTO credit_actions (id, name, default_cost)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [action.id, action.name, action.cost]
    );
  }

  log.info('Credit actions seeded');
}

/**
 * Check if database is empty (first run)
 */
async function isDatabaseEmpty(): Promise<boolean> {
  const result = await queryOne<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'users'
    )
  `);

  return !result?.exists;
}

/**
 * Main migration runner
 */
async function migrate(): Promise<void> {
  log.info('Starting database migration...');

  try {
    // Initialize the pool first
    await initializePool();

    // Test connection
    const pool = getPool();
    await pool.query('SELECT 1');
    log.info('Database connection successful');

    // Check if this is a fresh database
    const isEmpty = await isDatabaseEmpty();

    if (isEmpty) {
      log.info('Empty database detected, running base schema...');
      await runBaseSchema();
      await seedCreditActions();
    }

    // Ensure migrations table exists
    await ensureMigrationsTable();

    // Get applied migrations
    const applied = await getAppliedMigrations();
    log.info(`${applied.length} migrations already applied`);

    // Get migration files
    const migrationsDir = path.join(__dirname, 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql') || f.endsWith('.ts'))
      .sort();

    // Run pending migrations
    let migrationsRun = 0;

    for (const file of migrationFiles) {
      const migrationName = file.replace(/\.(sql|ts)$/, '');

      if (applied.includes(migrationName)) {
        continue;
      }

      log.info(`Running migration: ${migrationName}`);

      const filePath = path.join(migrationsDir, file);

      if (file.endsWith('.sql')) {
        const sql = fs.readFileSync(filePath, 'utf-8');
        await query(sql);
      } else if (file.endsWith('.ts')) {
        // Dynamic import for TypeScript migrations
        const migration = await import(filePath);
        if (typeof migration.up === 'function') {
          await migration.up();
        }
      }

      await recordMigration(migrationName);
      migrationsRun++;
      log.info(`Migration applied: ${migrationName}`);
    }

    if (migrationsRun > 0) {
      log.info(`${migrationsRun} migrations applied successfully`);
    } else {
      log.info('Database is up to date');
    }
  } catch (error) {
    log.error({ error }, 'Migration failed');
    throw error;
  } finally {
    await closePool();
  }
}

// Run if called directly
if (require.main === module) {
  migrate()
    .then(() => {
      log.info('Migration completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      log.error({ error: err }, 'Migration failed');
      process.exit(1);
    });
}

export { migrate, ensureMigrationsTable, getAppliedMigrations };
