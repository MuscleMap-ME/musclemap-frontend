/**
 * Database Client
 */

import Database from 'better-sqlite3';
import { config } from '../config';
import { loggers } from '../lib/logger';
import fs from 'fs';
import path from 'path';

const log = loggers.db;

const dbDir = path.dirname(config.DATABASE_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const database = new Database(config.DATABASE_PATH);

database.pragma('journal_mode = WAL');
database.pragma('synchronous = NORMAL');
database.pragma('cache_size = -64000');
database.pragma('busy_timeout = 5000');
database.pragma('foreign_keys = ON');

log.info('Database connection established', { path: config.DATABASE_PATH });

export const db = database;

export function transaction<T>(fn: () => T): T {
  return database.transaction(fn)();
}

export function closeDatabase(): void {
  database.close();
  log.info('Database connection closed');
}

process.on('SIGTERM', closeDatabase);
process.on('SIGINT', closeDatabase);
