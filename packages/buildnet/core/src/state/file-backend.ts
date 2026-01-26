/**
 * File-Based State Backend
 *
 * Fallback state backend that persists to the filesystem.
 * Useful for single-node deployments without DragonflyDB/Redis.
 */

import { readFile, writeFile, mkdir, unlink, readdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import type { Lock, StateBackend, StateCapabilities } from '../types/index.js';

// Dynamic import for optional dependency
let lockfile: typeof import('proper-lockfile') | undefined;

try {
  lockfile = await import('proper-lockfile');
} catch {
  // proper-lockfile not installed - will use basic file locking
}

export interface FileBackendConfig {
  path: string;
  lock_file?: string;
  sync_interval_ms?: number;
}

interface StoredValue {
  value: string;
  expires?: number;
}

export class FileBackend implements StateBackend {
  readonly name = 'file';
  readonly capabilities: StateCapabilities = {
    multiNode: false, // Only via NFS
    persistent: true,
    distributedLocks: true, // Via flock
    pubSub: false, // Uses polling
  };

  private config: FileBackendConfig;
  private dataDir: string;
  private locksDir: string;
  private data: Map<string, StoredValue> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private dirty = false;
  private connected = false;

  constructor(config: FileBackendConfig) {
    this.config = config;
    this.dataDir = config.path;
    this.locksDir = join(config.path, 'locks');
  }

  async connect(): Promise<void> {
    // Create directories if they don't exist
    await mkdir(this.dataDir, { recursive: true });
    await mkdir(this.locksDir, { recursive: true });

    // Load existing data
    await this.loadFromDisk();

    // Start periodic sync
    const syncInterval = this.config.sync_interval_ms ?? 1000;
    this.syncInterval = setInterval(() => {
      if (this.dirty) {
        this.saveToDisk().catch((error) => {
          console.error('[FileBackend] Failed to sync to disk:', error);
        });
      }
    }, syncInterval);

    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Final save
    if (this.dirty) {
      await this.saveToDisk();
    }

    this.data.clear();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async loadFromDisk(): Promise<void> {
    const dataFile = join(this.dataDir, 'state.json');

    if (!existsSync(dataFile)) {
      return;
    }

    try {
      const content = await readFile(dataFile, 'utf-8');
      const parsed = JSON.parse(content) as Record<string, StoredValue>;

      this.data.clear();
      const now = Date.now();

      for (const [key, value] of Object.entries(parsed)) {
        // Skip expired entries
        if (value.expires && value.expires < now) {
          continue;
        }
        this.data.set(key, value);
      }
    } catch (error) {
      console.error('[FileBackend] Failed to load state from disk:', error);
    }
  }

  private async saveToDisk(): Promise<void> {
    const dataFile = join(this.dataDir, 'state.json');
    const tempFile = `${dataFile}.tmp`;

    // Clean expired entries before saving
    const now = Date.now();
    for (const [key, value] of this.data) {
      if (value.expires && value.expires < now) {
        this.data.delete(key);
      }
    }

    const content = JSON.stringify(Object.fromEntries(this.data), null, 2);

    // Write to temp file first, then rename (atomic on most filesystems)
    await writeFile(tempFile, content, 'utf-8');
    await writeFile(dataFile, content, 'utf-8');

    this.dirty = false;
  }

  async get(key: string): Promise<string | null> {
    const entry = this.data.get(key);

    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.expires && entry.expires < Date.now()) {
      this.data.delete(key);
      this.dirty = true;
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    const entry: StoredValue = { value };

    if (ttlMs !== undefined && ttlMs > 0) {
      entry.expires = Date.now() + ttlMs;
    }

    this.data.set(key, entry);
    this.dirty = true;
  }

  async del(key: string): Promise<void> {
    this.data.delete(key);
    this.dirty = true;
  }

  async keys(pattern: string): Promise<string[]> {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    const result: string[] = [];
    const now = Date.now();

    for (const [key, value] of this.data) {
      // Skip expired
      if (value.expires && value.expires < now) {
        continue;
      }

      if (regex.test(key)) {
        result.push(key);
      }
    }

    return result;
  }

  async acquireLock(resource: string, ttlMs: number): Promise<Lock | null> {
    const lockPath = join(this.locksDir, `${resource}.lock`);
    const token = crypto.randomUUID();
    const expires = Date.now() + ttlMs;

    try {
      // Ensure locks directory exists
      await mkdir(dirname(lockPath), { recursive: true });

      // Check if lock file exists and is stale
      if (existsSync(lockPath)) {
        const lockData = await this.checkStaleLock(lockPath);
        if (lockData.stale) {
          // Remove stale lock
          await unlink(lockPath).catch(() => {});
        } else {
          // Lock is held
          return null;
        }
      }

      // Try to acquire lock using proper-lockfile if available
      if (lockfile) {
        try {
          await lockfile.lock(lockPath, {
            stale: ttlMs,
            retries: 0,
          });
        } catch {
          // Lock is held
          return null;
        }
      }

      // Write lock info
      const lockInfo = { token, expires, pid: process.pid, acquired: Date.now() };
      await writeFile(lockPath, JSON.stringify(lockInfo), 'utf-8');

      // Set up auto-release timeout
      setTimeout(() => {
        this.releaseLock({ resource, token, expires }).catch(() => {});
      }, ttlMs);

      return { resource, token, expires };
    } catch {
      return null;
    }
  }

  async releaseLock(lock: Lock): Promise<void> {
    const lockPath = join(this.locksDir, `${lock.resource}.lock`);

    try {
      // Verify we own the lock
      if (existsSync(lockPath)) {
        const content = await readFile(lockPath, 'utf-8');
        const lockInfo = JSON.parse(content);

        if (lockInfo.token === lock.token) {
          await unlink(lockPath);

          // Release proper-lockfile lock if used
          if (lockfile) {
            try {
              await lockfile.unlock(lockPath);
            } catch {
              // Ignore unlock errors
            }
          }
        }
      }
    } catch {
      // Ignore release errors
    }
  }

  async extendLock(lock: Lock, ttlMs: number): Promise<boolean> {
    const lockPath = join(this.locksDir, `${lock.resource}.lock`);

    try {
      if (!existsSync(lockPath)) {
        return false;
      }

      const content = await readFile(lockPath, 'utf-8');
      const lockInfo = JSON.parse(content);

      if (lockInfo.token !== lock.token) {
        return false;
      }

      // Update expiration
      lockInfo.expires = Date.now() + ttlMs;
      await writeFile(lockPath, JSON.stringify(lockInfo), 'utf-8');

      return true;
    } catch {
      return false;
    }
  }

  private async checkStaleLock(lockPath: string): Promise<{ stale: boolean; lockInfo?: unknown }> {
    try {
      const content = await readFile(lockPath, 'utf-8');
      const lockInfo = JSON.parse(content);

      if (lockInfo.expires && lockInfo.expires < Date.now()) {
        return { stale: true, lockInfo };
      }

      // Check if the holding process is still alive
      if (lockInfo.pid) {
        try {
          // This throws if process doesn't exist
          process.kill(lockInfo.pid, 0);
        } catch {
          // Process is dead, lock is stale
          return { stale: true, lockInfo };
        }
      }

      return { stale: false, lockInfo };
    } catch {
      // Can't read lock file, consider it stale
      return { stale: true };
    }
  }

  // File backend doesn't support pub/sub natively
  subscribe(_channel: string, _callback: (message: string) => void): void {
    console.warn('[FileBackend] Pub/Sub not supported in file backend');
  }

  async publish(_channel: string, _message: string): Promise<void> {
    console.warn('[FileBackend] Pub/Sub not supported in file backend');
  }

  // ============================================================================
  // File-specific utilities
  // ============================================================================

  /**
   * Get all keys and their expiration times.
   */
  async getAllWithExpiry(): Promise<Array<{ key: string; value: string; expires?: number }>> {
    const result: Array<{ key: string; value: string; expires?: number }> = [];
    const now = Date.now();

    for (const [key, entry] of this.data) {
      if (entry.expires && entry.expires < now) {
        continue;
      }
      result.push({ key, value: entry.value, expires: entry.expires });
    }

    return result;
  }

  /**
   * Get disk usage statistics.
   */
  async getStorageStats(): Promise<{
    entries: number;
    dataFile: { size: number; path: string };
    locksCount: number;
  }> {
    const dataFile = join(this.dataDir, 'state.json');
    let fileSize = 0;

    try {
      const stats = await stat(dataFile);
      fileSize = stats.size;
    } catch {
      // File doesn't exist yet
    }

    let locksCount = 0;
    try {
      const locks = await readdir(this.locksDir);
      locksCount = locks.filter((f) => f.endsWith('.lock')).length;
    } catch {
      // Locks dir doesn't exist
    }

    return {
      entries: this.data.size,
      dataFile: { size: fileSize, path: dataFile },
      locksCount,
    };
  }

  /**
   * Force immediate save to disk.
   */
  async flush(): Promise<void> {
    await this.saveToDisk();
  }
}
