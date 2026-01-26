/**
 * SQLite State Backend
 *
 * High-performance SQLite backend with configurable path.
 * Supports:
 * - Server/node/directory/filename configuration
 * - WAL mode for better concurrency
 * - Performance metrics and benchmarking
 * - Distributed locks via table-based locking
 * - Pub/Sub emulation via trigger tables
 */

import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { hostname } from 'node:os';
import type { Lock, StateBackend, StateCapabilities } from '../types/index.js';

// Dynamic import for better-sqlite3 (optional dependency)
let Database: typeof import('better-sqlite3').default | undefined;

try {
  const betterSqlite3 = await import('better-sqlite3');
  Database = betterSqlite3.default;
} catch {
  // better-sqlite3 not installed
}

export interface SQLiteBackendConfig {
  /**
   * Server identifier (used in path construction)
   */
  server?: string;

  /**
   * Node identifier (used in path construction)
   */
  node?: string;

  /**
   * Base directory for SQLite databases
   */
  directory?: string;

  /**
   * Database filename (defaults to 'buildnet.db')
   */
  filename?: string;

  /**
   * Full path override (if set, ignores server/node/directory/filename)
   */
  path?: string;

  /**
   * Enable WAL mode (recommended for better concurrency)
   */
  wal_mode?: boolean;

  /**
   * Busy timeout in milliseconds
   */
  busy_timeout_ms?: number;

  /**
   * Cache size in KB (negative = KB, positive = pages)
   */
  cache_size_kb?: number;

  /**
   * Memory-map size in bytes (0 = disable mmap)
   */
  mmap_size?: number;

  /**
   * Synchronous mode: 'off' | 'normal' | 'full' | 'extra'
   */
  synchronous?: 'off' | 'normal' | 'full' | 'extra';

  /**
   * Performance metrics collection
   */
  metrics?: {
    enabled?: boolean;
    sample_interval_ms?: number;
  };
}

interface StoredValue {
  key: string;
  value: string;
  expires_at: number | null;
  created_at: number;
  updated_at: number;
}

interface LockRecord {
  resource: string;
  token: string;
  expires_at: number;
  holder_pid: number;
  holder_hostname: string;
  acquired_at: number;
}

interface PubSubMessage {
  id: number;
  channel: string;
  message: string;
  created_at: number;
}

export interface SQLiteMetrics {
  reads: number;
  writes: number;
  avgReadLatencyMs: number;
  avgWriteLatencyMs: number;
  lockAcquisitions: number;
  lockFailures: number;
  cacheHitRatio: number;
  dbSizeBytes: number;
  walSizeBytes: number;
}

export class SQLiteBackend implements StateBackend {
  readonly name = 'sqlite';
  readonly capabilities: StateCapabilities = {
    multiNode: false, // SQLite is single-process, but we emulate some features
    persistent: true,
    distributedLocks: true, // Via table-based locking
    pubSub: true, // Via trigger tables with polling
  };

  private config: SQLiteBackendConfig;
  private dbPath: string;
  private db: import('better-sqlite3').Database | null = null;
  private connected = false;
  private subscriptions: Map<string, Set<(message: string) => void>> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;
  private lastPubSubId = 0;

  // Metrics tracking
  private metricsEnabled: boolean;
  private readCount = 0;
  private writeCount = 0;
  private totalReadLatency = 0;
  private totalWriteLatency = 0;
  private lockSuccessCount = 0;
  private lockFailureCount = 0;

  // Prepared statements (lazy initialized)
  private stmtGet: import('better-sqlite3').Statement | null = null;
  private stmtSet: import('better-sqlite3').Statement | null = null;
  private stmtDel: import('better-sqlite3').Statement | null = null;
  private stmtKeys: import('better-sqlite3').Statement | null = null;
  private stmtAcquireLock: import('better-sqlite3').Statement | null = null;
  private stmtReleaseLock: import('better-sqlite3').Statement | null = null;
  private stmtCheckLock: import('better-sqlite3').Statement | null = null;
  private stmtPublish: import('better-sqlite3').Statement | null = null;
  private stmtPoll: import('better-sqlite3').Statement | null = null;

  constructor(config: SQLiteBackendConfig) {
    this.config = config;
    this.dbPath = this.constructPath(config);
    this.metricsEnabled = config.metrics?.enabled ?? true;
  }

  /**
   * Construct the database path from configuration.
   */
  private constructPath(config: SQLiteBackendConfig): string {
    // If full path is specified, use it directly
    if (config.path) {
      return resolve(config.path);
    }

    // Construct path from components
    const server = config.server ?? 'default';
    const node = config.node ?? hostname();
    const directory = config.directory ?? '.buildnet';
    const filename = config.filename ?? 'buildnet.db';

    // Path format: {directory}/{server}/{node}/{filename}
    return resolve(join(directory, server, node, filename));
  }

  /**
   * Get the configured database path.
   */
  getPath(): string {
    return this.dbPath;
  }

  async connect(): Promise<void> {
    if (!Database) {
      throw new Error(
        'SQLite backend requires better-sqlite3 package. Install with: pnpm add better-sqlite3',
      );
    }

    // Ensure directory exists
    const dir = dirname(this.dbPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    // Open database
    this.db = new Database(this.dbPath);

    // Configure database
    this.configurePragmas();

    // Create tables
    this.createTables();

    // Prepare statements
    this.prepareStatements();

    // Start pub/sub polling if we have subscribers
    this.startPubSubPolling();

    // Clean expired entries periodically
    setInterval(() => this.cleanExpired(), 60000);

    this.connected = true;
  }

  private configurePragmas(): void {
    if (!this.db) return;

    const config = this.config;

    // WAL mode for better concurrency (default: enabled)
    if (config.wal_mode !== false) {
      this.db.pragma('journal_mode = WAL');
    }

    // Busy timeout
    this.db.pragma(`busy_timeout = ${config.busy_timeout_ms ?? 5000}`);

    // Cache size (in KB, so multiply by -1 to use KB units)
    const cacheSizeKb = config.cache_size_kb ?? 64000; // 64MB default
    this.db.pragma(`cache_size = -${cacheSizeKb}`);

    // Memory-map size
    if (config.mmap_size) {
      this.db.pragma(`mmap_size = ${config.mmap_size}`);
    }

    // Synchronous mode
    this.db.pragma(`synchronous = ${config.synchronous ?? 'normal'}`);

    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Temp store in memory
    this.db.pragma('temp_store = MEMORY');
  }

  private createTables(): void {
    if (!this.db) return;

    // Main key-value store
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_kv_expires ON kv_store(expires_at)
        WHERE expires_at IS NOT NULL;
    `);

    // Distributed locks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS locks (
        resource TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        holder_pid INTEGER NOT NULL,
        holder_hostname TEXT NOT NULL,
        acquired_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_locks_expires ON locks(expires_at);
    `);

    // Pub/Sub messages table (for polling-based pub/sub)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pubsub_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_pubsub_channel ON pubsub_messages(channel);
      CREATE INDEX IF NOT EXISTS idx_pubsub_id ON pubsub_messages(id);
    `);

    // Performance metrics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        tags TEXT,
        timestamp INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_metrics_name_time ON metrics(metric_name, timestamp);
    `);
  }

  private prepareStatements(): void {
    if (!this.db) return;

    this.stmtGet = this.db.prepare(
      'SELECT value, expires_at FROM kv_store WHERE key = ?',
    );

    this.stmtSet = this.db.prepare(`
      INSERT INTO kv_store (key, value, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at
    `);

    this.stmtDel = this.db.prepare('DELETE FROM kv_store WHERE key = ?');

    this.stmtKeys = this.db.prepare(`
      SELECT key FROM kv_store
      WHERE key GLOB ?
        AND (expires_at IS NULL OR expires_at > ?)
    `);

    this.stmtAcquireLock = this.db.prepare(`
      INSERT INTO locks (resource, token, expires_at, holder_pid, holder_hostname, acquired_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(resource) DO NOTHING
    `);

    this.stmtReleaseLock = this.db.prepare(
      'DELETE FROM locks WHERE resource = ? AND token = ?',
    );

    this.stmtCheckLock = this.db.prepare(
      'SELECT * FROM locks WHERE resource = ?',
    );

    this.stmtPublish = this.db.prepare(
      'INSERT INTO pubsub_messages (channel, message, created_at) VALUES (?, ?, ?)',
    );

    this.stmtPoll = this.db.prepare(
      'SELECT * FROM pubsub_messages WHERE id > ? ORDER BY id ASC LIMIT 100',
    );
  }

  async disconnect(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.db) {
      // Checkpoint WAL before closing
      try {
        this.db.pragma('wal_checkpoint(TRUNCATE)');
      } catch {
        // Ignore checkpoint errors
      }
      this.db.close();
      this.db = null;
    }

    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected && this.db !== null;
  }

  async get(key: string): Promise<string | null> {
    if (!this.db || !this.stmtGet) return null;

    const start = this.metricsEnabled ? performance.now() : 0;

    const row = this.stmtGet.get(key) as { value: string; expires_at: number | null } | undefined;

    if (this.metricsEnabled) {
      this.readCount++;
      this.totalReadLatency += performance.now() - start;
    }

    if (!row) return null;

    // Check expiration
    if (row.expires_at && row.expires_at < Date.now()) {
      // Delete expired entry
      this.stmtDel?.run(key);
      return null;
    }

    return row.value;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    if (!this.db || !this.stmtSet) return;

    const start = this.metricsEnabled ? performance.now() : 0;
    const now = Date.now();
    const expiresAt = ttlMs ? now + ttlMs : null;

    this.stmtSet.run(key, value, expiresAt, now, now);

    if (this.metricsEnabled) {
      this.writeCount++;
      this.totalWriteLatency += performance.now() - start;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.db || !this.stmtDel) return;

    const start = this.metricsEnabled ? performance.now() : 0;

    this.stmtDel.run(key);

    if (this.metricsEnabled) {
      this.writeCount++;
      this.totalWriteLatency += performance.now() - start;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.db || !this.stmtKeys) return [];

    const start = this.metricsEnabled ? performance.now() : 0;

    // Convert Redis-style pattern to SQLite GLOB pattern
    // Redis: * = any characters, ? = single character
    // SQLite GLOB: * = any characters, ? = single character (same!)
    const globPattern = pattern;

    const rows = this.stmtKeys.all(globPattern, Date.now()) as { key: string }[];

    if (this.metricsEnabled) {
      this.readCount++;
      this.totalReadLatency += performance.now() - start;
    }

    return rows.map((r) => r.key);
  }

  async acquireLock(resource: string, ttlMs: number): Promise<Lock | null> {
    if (!this.db) return null;

    const token = crypto.randomUUID();
    const now = Date.now();
    const expiresAt = now + ttlMs;

    // First, clean up expired locks
    this.db.prepare('DELETE FROM locks WHERE expires_at < ?').run(now);

    // Try to acquire lock
    const result = this.stmtAcquireLock?.run(
      resource,
      token,
      expiresAt,
      process.pid,
      hostname(),
      now,
    );

    if (result && result.changes > 0) {
      if (this.metricsEnabled) this.lockSuccessCount++;
      return { resource, token, expires: expiresAt };
    }

    if (this.metricsEnabled) this.lockFailureCount++;
    return null;
  }

  async releaseLock(lock: Lock): Promise<void> {
    if (!this.db || !this.stmtReleaseLock) return;

    this.stmtReleaseLock.run(lock.resource, lock.token);
  }

  async extendLock(lock: Lock, ttlMs: number): Promise<boolean> {
    if (!this.db) return false;

    const newExpires = Date.now() + ttlMs;
    const result = this.db
      .prepare('UPDATE locks SET expires_at = ? WHERE resource = ? AND token = ?')
      .run(newExpires, lock.resource, lock.token);

    return result.changes > 0;
  }

  subscribe(channel: string, callback: (message: string) => void): void {
    let subscribers = this.subscriptions.get(channel);
    if (!subscribers) {
      subscribers = new Set();
      this.subscriptions.set(channel, subscribers);
    }
    subscribers.add(callback);

    // Start polling if not already running
    this.startPubSubPolling();
  }

  async publish(channel: string, message: string): Promise<void> {
    if (!this.db || !this.stmtPublish) return;

    this.stmtPublish.run(channel, message, Date.now());
  }

  private startPubSubPolling(): void {
    if (this.pollInterval) return;

    // Get the latest message ID to start from
    if (this.db) {
      const latest = this.db.prepare('SELECT MAX(id) as max_id FROM pubsub_messages').get() as { max_id: number | null };
      this.lastPubSubId = latest?.max_id ?? 0;
    }

    // Poll every 100ms for new messages
    this.pollInterval = setInterval(() => {
      this.pollMessages();
    }, 100);
  }

  private pollMessages(): void {
    if (!this.db || !this.stmtPoll) return;

    const messages = this.stmtPoll.all(this.lastPubSubId) as PubSubMessage[];

    for (const msg of messages) {
      this.lastPubSubId = msg.id;

      const subscribers = this.subscriptions.get(msg.channel);
      if (subscribers) {
        for (const callback of subscribers) {
          try {
            callback(msg.message);
          } catch (error) {
            console.error('[SQLiteBackend] Subscriber error:', error);
          }
        }
      }
    }

    // Clean up old messages (keep last hour)
    const cutoff = Date.now() - 3600000;
    this.db.prepare('DELETE FROM pubsub_messages WHERE created_at < ?').run(cutoff);
  }

  private cleanExpired(): void {
    if (!this.db) return;

    try {
      const now = Date.now();

      // Clean expired key-value entries
      this.db.prepare('DELETE FROM kv_store WHERE expires_at IS NOT NULL AND expires_at < ?').run(now);

      // Clean expired locks
      this.db.prepare('DELETE FROM locks WHERE expires_at < ?').run(now);
    } catch (error) {
      console.error('[SQLiteBackend] Failed to clean expired entries:', error);
    }
  }

  // ============================================================================
  // Performance Metrics
  // ============================================================================

  /**
   * Get current performance metrics.
   */
  getMetrics(): SQLiteMetrics {
    let dbSizeBytes = 0;
    let walSizeBytes = 0;

    if (this.db) {
      try {
        const pageCount = this.db.pragma('page_count', { simple: true }) as number;
        const pageSize = this.db.pragma('page_size', { simple: true }) as number;
        dbSizeBytes = pageCount * pageSize;

        // Try to get WAL size
        const walStats = this.db.pragma('wal_checkpoint') as Array<{ busy: number; log: number; checkpointed: number }>;
        if (walStats && walStats[0]) {
          walSizeBytes = walStats[0].log * pageSize;
        }
      } catch {
        // Ignore pragma errors
      }
    }

    return {
      reads: this.readCount,
      writes: this.writeCount,
      avgReadLatencyMs: this.readCount > 0 ? this.totalReadLatency / this.readCount : 0,
      avgWriteLatencyMs: this.writeCount > 0 ? this.totalWriteLatency / this.writeCount : 0,
      lockAcquisitions: this.lockSuccessCount,
      lockFailures: this.lockFailureCount,
      cacheHitRatio: 0, // Would need to track separately
      dbSizeBytes,
      walSizeBytes,
    };
  }

  /**
   * Reset metrics counters.
   */
  resetMetrics(): void {
    this.readCount = 0;
    this.writeCount = 0;
    this.totalReadLatency = 0;
    this.totalWriteLatency = 0;
    this.lockSuccessCount = 0;
    this.lockFailureCount = 0;
  }

  /**
   * Run a benchmark test.
   */
  async benchmark(iterations = 1000): Promise<{
    readLatencyMs: { avg: number; min: number; max: number; p99: number };
    writeLatencyMs: { avg: number; min: number; max: number; p99: number };
    throughput: { readsPerSec: number; writesPerSec: number };
  }> {
    const readLatencies: number[] = [];
    const writeLatencies: number[] = [];

    // Write benchmark
    const writeStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.set(`benchmark:${i}`, `value-${i}`, 60000);
      writeLatencies.push(performance.now() - start);
    }
    const writeTime = performance.now() - writeStart;

    // Read benchmark
    const readStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.get(`benchmark:${i}`);
      readLatencies.push(performance.now() - start);
    }
    const readTime = performance.now() - readStart;

    // Clean up
    for (let i = 0; i < iterations; i++) {
      await this.del(`benchmark:${i}`);
    }

    // Calculate statistics
    const calcStats = (arr: number[]) => {
      arr.sort((a, b) => a - b);
      return {
        avg: arr.reduce((a, b) => a + b, 0) / arr.length,
        min: arr[0],
        max: arr[arr.length - 1],
        p99: arr[Math.floor(arr.length * 0.99)],
      };
    };

    return {
      readLatencyMs: calcStats(readLatencies),
      writeLatencyMs: calcStats(writeLatencies),
      throughput: {
        readsPerSec: (iterations / readTime) * 1000,
        writesPerSec: (iterations / writeTime) * 1000,
      },
    };
  }

  // ============================================================================
  // Database Management
  // ============================================================================

  /**
   * Get database statistics.
   */
  async getStats(): Promise<{
    path: string;
    sizeBytes: number;
    walSizeBytes: number;
    kvEntries: number;
    activeLocks: number;
    pendingMessages: number;
    walMode: boolean;
  }> {
    if (!this.db) {
      return {
        path: this.dbPath,
        sizeBytes: 0,
        walSizeBytes: 0,
        kvEntries: 0,
        activeLocks: 0,
        pendingMessages: 0,
        walMode: false,
      };
    }

    const pageCount = this.db.pragma('page_count', { simple: true }) as number;
    const pageSize = this.db.pragma('page_size', { simple: true }) as number;
    const journalMode = this.db.pragma('journal_mode', { simple: true }) as string;

    let walSizeBytes = 0;
    try {
      const walStats = this.db.pragma('wal_checkpoint') as Array<{ log: number }>;
      if (walStats && walStats[0]) {
        walSizeBytes = walStats[0].log * pageSize;
      }
    } catch {
      // No WAL
    }

    const kvCount = this.db.prepare('SELECT COUNT(*) as count FROM kv_store WHERE expires_at IS NULL OR expires_at > ?').get(Date.now()) as { count: number };
    const lockCount = this.db.prepare('SELECT COUNT(*) as count FROM locks WHERE expires_at > ?').get(Date.now()) as { count: number };
    const msgCount = this.db.prepare('SELECT COUNT(*) as count FROM pubsub_messages WHERE id > ?').get(this.lastPubSubId) as { count: number };

    return {
      path: this.dbPath,
      sizeBytes: pageCount * pageSize,
      walSizeBytes,
      kvEntries: kvCount.count,
      activeLocks: lockCount.count,
      pendingMessages: msgCount.count,
      walMode: journalMode === 'wal',
    };
  }

  /**
   * Vacuum the database to reclaim space.
   */
  async vacuum(): Promise<void> {
    if (!this.db) return;

    // Checkpoint WAL first
    this.db.pragma('wal_checkpoint(TRUNCATE)');

    // Run vacuum
    this.db.exec('VACUUM');
  }

  /**
   * Create a backup of the database.
   */
  async backup(destPath: string): Promise<void> {
    if (!this.db) return;

    // Ensure destination directory exists
    const dir = dirname(destPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    // Use SQLite's backup API
    await this.db.backup(destPath);
  }
}
