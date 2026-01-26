/**
 * Memory State Backend
 *
 * In-memory state backend for development and testing.
 * Data is NOT persisted - lost on process restart.
 */

import { EventEmitter } from 'eventemitter3';
import type { Lock, StateBackend, StateCapabilities } from '../types/index.js';

export interface MemoryBackendConfig {
  max_entries?: number;
}

interface StoredValue {
  value: string;
  expires?: number;
}

export class MemoryBackend implements StateBackend {
  readonly name = 'memory';
  readonly capabilities: StateCapabilities = {
    multiNode: false,
    persistent: false,
    distributedLocks: true, // Process-local
    pubSub: true, // Via EventEmitter
  };

  private config: MemoryBackendConfig;
  private store = new Map<string, StoredValue>();
  private locks = new Map<string, Lock>();
  private events = new EventEmitter();
  private connected = false;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: MemoryBackendConfig = {}) {
    this.config = {
      max_entries: config.max_entries ?? 10000,
    };
  }

  async connect(): Promise<void> {
    // Start periodic cleanup of expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Every minute

    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.store.clear();
    this.locks.clear();
    this.events.removeAllListeners();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private cleanupExpired(): void {
    const now = Date.now();

    // Clean expired values
    for (const [key, entry] of this.store) {
      if (entry.expires && entry.expires < now) {
        this.store.delete(key);
      }
    }

    // Clean expired locks
    for (const [resource, lock] of this.locks) {
      if (lock.expires < now) {
        this.locks.delete(resource);
      }
    }
  }

  private enforceMaxEntries(): void {
    const maxEntries = this.config.max_entries ?? 10000;

    if (this.store.size >= maxEntries) {
      // LRU eviction: remove oldest entries (first in map order)
      const toRemove = Math.ceil(maxEntries * 0.1); // Remove 10%
      let removed = 0;

      for (const key of this.store.keys()) {
        if (removed >= toRemove) break;
        this.store.delete(key);
        removed++;
      }
    }
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.expires && entry.expires < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    this.enforceMaxEntries();

    const entry: StoredValue = { value };

    if (ttlMs !== undefined && ttlMs > 0) {
      entry.expires = Date.now() + ttlMs;
    }

    this.store.set(key, entry);
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  /** Alias for del() for API consistency */
  async delete(key: string): Promise<void> {
    return this.del(key);
  }

  /**
   * Set a key only if it doesn't exist (atomic operation).
   * Returns true if the key was set, false if it already existed.
   */
  async setIfNotExists(key: string, value: string, ttlMs?: number): Promise<boolean> {
    const existing = this.store.get(key);

    // Check if key exists and is not expired
    if (existing) {
      if (!existing.expires || existing.expires >= Date.now()) {
        return false; // Key exists and is valid
      }
      // Key is expired, remove it
      this.store.delete(key);
    }

    // Key doesn't exist or was expired, set it
    await this.set(key, value, ttlMs);
    return true;
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

    for (const [key, entry] of this.store) {
      // Skip expired
      if (entry.expires && entry.expires < now) {
        continue;
      }

      if (regex.test(key)) {
        result.push(key);
      }
    }

    return result;
  }

  async acquireLock(resource: string, ttlMs: number): Promise<Lock | null> {
    const existing = this.locks.get(resource);

    if (existing) {
      if (existing.expires > Date.now()) {
        // Lock is still held
        return null;
      }
      // Lock expired, can take it
    }

    const lock: Lock = {
      resource,
      token: crypto.randomUUID(),
      expires: Date.now() + ttlMs,
    };

    this.locks.set(resource, lock);

    // Set up auto-release
    setTimeout(() => {
      const current = this.locks.get(resource);
      if (current?.token === lock.token) {
        this.locks.delete(resource);
      }
    }, ttlMs);

    return lock;
  }

  async releaseLock(lock: Lock): Promise<void> {
    const current = this.locks.get(lock.resource);

    if (current?.token === lock.token) {
      this.locks.delete(lock.resource);
    }
  }

  async extendLock(lock: Lock, ttlMs: number): Promise<boolean> {
    const current = this.locks.get(lock.resource);

    if (!current || current.token !== lock.token) {
      return false;
    }

    current.expires = Date.now() + ttlMs;
    return true;
  }

  subscribe(channel: string, callback: (message: string) => void): void {
    this.events.on(`channel:${channel}`, callback);
  }

  async publish(channel: string, message: string): Promise<void> {
    this.events.emit(`channel:${channel}`, message);
  }

  // ============================================================================
  // Memory-specific utilities
  // ============================================================================

  /**
   * Get memory usage statistics.
   */
  getStats(): {
    entries: number;
    maxEntries: number;
    locks: number;
    channels: number;
  } {
    return {
      entries: this.store.size,
      maxEntries: this.config.max_entries ?? 10000,
      locks: this.locks.size,
      channels: this.events.eventNames().length,
    };
  }

  /**
   * Clear all data.
   */
  clear(): void {
    this.store.clear();
    this.locks.clear();
  }

  /**
   * Get all entries (for debugging).
   */
  getAllEntries(): Array<{ key: string; value: string; expires?: number }> {
    const result: Array<{ key: string; value: string; expires?: number }> = [];
    const now = Date.now();

    for (const [key, entry] of this.store) {
      if (entry.expires && entry.expires < now) {
        continue;
      }
      result.push({ key, value: entry.value, expires: entry.expires });
    }

    return result;
  }

  /**
   * Unsubscribe from a channel.
   */
  unsubscribe(channel: string, callback: (message: string) => void): void {
    this.events.off(`channel:${channel}`, callback);
  }
}
