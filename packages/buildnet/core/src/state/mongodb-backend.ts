/**
 * MongoDB State Backend
 *
 * High-performance MongoDB backend for distributed deployments.
 * Supports:
 * - Connection URI configuration with replica sets
 * - Change streams for real-time pub/sub
 * - Distributed locks via findOneAndUpdate with TTL
 * - Performance metrics and benchmarking
 * - Multi-node operation with automatic failover
 */

import type { Lock, StateBackend, StateCapabilities } from '../types/index.js';

// Dynamic import for mongodb (optional dependency)
let MongoClient: typeof import('mongodb').MongoClient | undefined;
let Collection: typeof import('mongodb').Collection | undefined;

try {
  const mongodb = await import('mongodb');
  MongoClient = mongodb.MongoClient;
  Collection = mongodb.Collection;
} catch {
  // mongodb not installed
}

export interface MongoDBBackendConfig {
  /**
   * MongoDB connection URI
   * Examples:
   * - mongodb://localhost:27017/buildnet
   * - mongodb+srv://user:pass@cluster.mongodb.net/buildnet
   * - mongodb://host1:27017,host2:27017,host3:27017/buildnet?replicaSet=rs0
   */
  url: string;

  /**
   * Database name (overrides URI database if set)
   */
  database?: string;

  /**
   * Collection prefix for all BuildNet collections
   */
  prefix?: string;

  /**
   * Connection timeout in milliseconds
   */
  connect_timeout_ms?: number;

  /**
   * Server selection timeout in milliseconds
   */
  server_selection_timeout_ms?: number;

  /**
   * Maximum pool size
   */
  max_pool_size?: number;

  /**
   * Minimum pool size
   */
  min_pool_size?: number;

  /**
   * Read preference: 'primary' | 'primaryPreferred' | 'secondary' | 'secondaryPreferred' | 'nearest'
   */
  read_preference?: 'primary' | 'primaryPreferred' | 'secondary' | 'secondaryPreferred' | 'nearest';

  /**
   * Write concern
   */
  write_concern?: {
    w?: number | 'majority';
    j?: boolean;
    wtimeout?: number;
  };

  /**
   * Performance metrics collection
   */
  metrics?: {
    enabled?: boolean;
    sample_interval_ms?: number;
  };
}

interface KVDocument {
  _id: string; // The key
  value: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface LockDocument {
  _id: string; // The resource
  token: string;
  expiresAt: Date;
  holderPid: number;
  holderHostname: string;
  acquiredAt: Date;
}

interface PubSubDocument {
  _id: import('mongodb').ObjectId;
  channel: string;
  message: string;
  createdAt: Date;
}

export interface MongoDBMetrics {
  reads: number;
  writes: number;
  avgReadLatencyMs: number;
  avgWriteLatencyMs: number;
  lockAcquisitions: number;
  lockFailures: number;
  connectionPoolSize: number;
  connectionPoolAvailable: number;
  operationsPerSec: number;
}

export class MongoDBBackend implements StateBackend {
  readonly name = 'mongodb';
  readonly capabilities: StateCapabilities = {
    multiNode: true, // MongoDB supports replica sets and sharding
    persistent: true,
    distributedLocks: true, // Via findOneAndUpdate with TTL
    pubSub: true, // Via change streams
  };

  private config: MongoDBBackendConfig;
  private client: import('mongodb').MongoClient | null = null;
  private db: import('mongodb').Db | null = null;
  private kvCollection: import('mongodb').Collection<KVDocument> | null = null;
  private locksCollection: import('mongodb').Collection<LockDocument> | null = null;
  private pubsubCollection: import('mongodb').Collection<PubSubDocument> | null = null;
  private connected = false;
  private subscriptions: Map<string, Set<(message: string) => void>> = new Map();
  private changeStream: import('mongodb').ChangeStream | null = null;

  // Metrics tracking
  private metricsEnabled: boolean;
  private readCount = 0;
  private writeCount = 0;
  private totalReadLatency = 0;
  private totalWriteLatency = 0;
  private lockSuccessCount = 0;
  private lockFailureCount = 0;
  private opsStartTime = Date.now();

  constructor(config: MongoDBBackendConfig) {
    this.config = config;
    this.metricsEnabled = config.metrics?.enabled ?? true;
  }

  async connect(): Promise<void> {
    if (!MongoClient) {
      throw new Error(
        'MongoDB backend requires mongodb package. Install with: pnpm add mongodb',
      );
    }

    // Build connection options
    const options: import('mongodb').MongoClientOptions = {
      connectTimeoutMS: this.config.connect_timeout_ms ?? 10000,
      serverSelectionTimeoutMS: this.config.server_selection_timeout_ms ?? 5000,
      maxPoolSize: this.config.max_pool_size ?? 100,
      minPoolSize: this.config.min_pool_size ?? 5,
    };

    if (this.config.read_preference) {
      options.readPreference = this.config.read_preference;
    }

    if (this.config.write_concern) {
      options.writeConcern = this.config.write_concern;
    }

    // Connect to MongoDB
    this.client = new MongoClient(this.config.url, options);
    await this.client.connect();

    // Get database
    const dbName = this.config.database ?? 'buildnet';
    this.db = this.client.db(dbName);

    // Get collections with prefix
    const prefix = this.config.prefix ?? 'buildnet';
    this.kvCollection = this.db.collection<KVDocument>(`${prefix}_kv`);
    this.locksCollection = this.db.collection<LockDocument>(`${prefix}_locks`);
    this.pubsubCollection = this.db.collection<PubSubDocument>(`${prefix}_pubsub`);

    // Create indexes
    await this.createIndexes();

    // Start change stream for pub/sub
    await this.startChangeStream();

    this.connected = true;
  }

  private async createIndexes(): Promise<void> {
    if (!this.kvCollection || !this.locksCollection || !this.pubsubCollection) return;

    // KV collection: TTL index on expiresAt
    await this.kvCollection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 },
    );

    // Locks collection: TTL index on expiresAt
    await this.locksCollection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 },
    );

    // PubSub collection: indexes for efficient queries
    await this.pubsubCollection.createIndex({ channel: 1, createdAt: -1 });
    await this.pubsubCollection.createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 3600 }, // Auto-delete after 1 hour
    );
  }

  private async startChangeStream(): Promise<void> {
    if (!this.pubsubCollection) return;

    try {
      // Only works with replica sets or sharded clusters
      this.changeStream = this.pubsubCollection.watch(
        [{ $match: { operationType: 'insert' } }],
        { fullDocument: 'updateLookup' },
      );

      this.changeStream.on('change', (change: import('mongodb').ChangeStreamInsertDocument<PubSubDocument>) => {
        if (change.operationType === 'insert' && change.fullDocument) {
          const { channel, message } = change.fullDocument;
          const subscribers = this.subscriptions.get(channel);
          if (subscribers) {
            for (const callback of subscribers) {
              try {
                callback(message);
              } catch (error) {
                console.error('[MongoDBBackend] Subscriber error:', error);
              }
            }
          }
        }
      });

      this.changeStream.on('error', (error) => {
        console.error('[MongoDBBackend] Change stream error:', error);
        // Try to restart
        setTimeout(() => this.startChangeStream(), 5000);
      });
    } catch (error) {
      // Change streams not supported (standalone instance)
      console.warn('[MongoDBBackend] Change streams not available, falling back to polling');
      this.startPolling();
    }
  }

  private lastPollTime = Date.now();
  private pollInterval: NodeJS.Timeout | null = null;

  private startPolling(): void {
    if (this.pollInterval) return;

    this.pollInterval = setInterval(async () => {
      if (!this.pubsubCollection) return;

      try {
        const messages = await this.pubsubCollection
          .find({ createdAt: { $gt: new Date(this.lastPollTime) } })
          .sort({ createdAt: 1 })
          .toArray();

        for (const msg of messages) {
          this.lastPollTime = msg.createdAt.getTime();
          const subscribers = this.subscriptions.get(msg.channel);
          if (subscribers) {
            for (const callback of subscribers) {
              try {
                callback(msg.message);
              } catch (error) {
                console.error('[MongoDBBackend] Subscriber error:', error);
              }
            }
          }
        }
      } catch (error) {
        console.error('[MongoDBBackend] Polling error:', error);
      }
    }, 100);
  }

  async disconnect(): Promise<void> {
    if (this.changeStream) {
      await this.changeStream.close();
      this.changeStream = null;
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.client) {
      await this.client.close();
      this.client = null;
    }

    this.db = null;
    this.kvCollection = null;
    this.locksCollection = null;
    this.pubsubCollection = null;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  async get(key: string): Promise<string | null> {
    if (!this.kvCollection) return null;

    const start = this.metricsEnabled ? performance.now() : 0;

    const doc = await this.kvCollection.findOne({ _id: key });

    if (this.metricsEnabled) {
      this.readCount++;
      this.totalReadLatency += performance.now() - start;
    }

    if (!doc) return null;

    // Check expiration (MongoDB TTL might not have cleaned it yet)
    if (doc.expiresAt && doc.expiresAt < new Date()) {
      return null;
    }

    return doc.value;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    if (!this.kvCollection) return;

    const start = this.metricsEnabled ? performance.now() : 0;
    const now = new Date();

    const doc: KVDocument = {
      _id: key,
      value,
      createdAt: now,
      updatedAt: now,
    };

    if (ttlMs) {
      doc.expiresAt = new Date(now.getTime() + ttlMs);
    }

    await this.kvCollection.replaceOne(
      { _id: key },
      doc,
      { upsert: true },
    );

    if (this.metricsEnabled) {
      this.writeCount++;
      this.totalWriteLatency += performance.now() - start;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.kvCollection) return;

    const start = this.metricsEnabled ? performance.now() : 0;

    await this.kvCollection.deleteOne({ _id: key });

    if (this.metricsEnabled) {
      this.writeCount++;
      this.totalWriteLatency += performance.now() - start;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.kvCollection) return [];

    const start = this.metricsEnabled ? performance.now() : 0;

    // Convert glob pattern to MongoDB regex
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);

    const docs = await this.kvCollection
      .find({
        _id: { $regex: regex },
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } },
        ],
      })
      .project({ _id: 1 })
      .toArray();

    if (this.metricsEnabled) {
      this.readCount++;
      this.totalReadLatency += performance.now() - start;
    }

    return docs.map((d) => d._id);
  }

  async acquireLock(resource: string, ttlMs: number): Promise<Lock | null> {
    if (!this.locksCollection) return null;

    const token = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    try {
      // Try to insert a new lock or update an expired one
      const result = await this.locksCollection.findOneAndUpdate(
        {
          _id: resource,
          $or: [
            { expiresAt: { $lt: now } }, // Expired lock
          ],
        },
        {
          $set: {
            token,
            expiresAt,
            holderPid: process.pid,
            holderHostname: (await import('node:os')).hostname(),
            acquiredAt: now,
          },
        },
        {
          upsert: true,
          returnDocument: 'after',
        },
      );

      if (result && result.token === token) {
        if (this.metricsEnabled) this.lockSuccessCount++;
        return { resource, token, expires: expiresAt.getTime() };
      }

      // Lock already held by someone else
      if (this.metricsEnabled) this.lockFailureCount++;
      return null;
    } catch (error) {
      // Duplicate key error means lock is already held
      if ((error as { code?: number }).code === 11000) {
        if (this.metricsEnabled) this.lockFailureCount++;
        return null;
      }
      throw error;
    }
  }

  async releaseLock(lock: Lock): Promise<void> {
    if (!this.locksCollection) return;

    await this.locksCollection.deleteOne({
      _id: lock.resource,
      token: lock.token,
    });
  }

  async extendLock(lock: Lock, ttlMs: number): Promise<boolean> {
    if (!this.locksCollection) return false;

    const newExpires = new Date(Date.now() + ttlMs);

    const result = await this.locksCollection.updateOne(
      { _id: lock.resource, token: lock.token },
      { $set: { expiresAt: newExpires } },
    );

    return result.modifiedCount > 0;
  }

  subscribe(channel: string, callback: (message: string) => void): void {
    let subscribers = this.subscriptions.get(channel);
    if (!subscribers) {
      subscribers = new Set();
      this.subscriptions.set(channel, subscribers);
    }
    subscribers.add(callback);
  }

  async publish(channel: string, message: string): Promise<void> {
    if (!this.pubsubCollection) return;

    await this.pubsubCollection.insertOne({
      channel,
      message,
      createdAt: new Date(),
    } as PubSubDocument);
  }

  // ============================================================================
  // Performance Metrics
  // ============================================================================

  /**
   * Get current performance metrics.
   */
  async getMetrics(): Promise<MongoDBMetrics> {
    let poolSize = 0;
    let poolAvailable = 0;

    // Note: MongoDB driver doesn't expose pool stats directly
    // You would need to use server monitoring events

    const elapsed = (Date.now() - this.opsStartTime) / 1000;
    const totalOps = this.readCount + this.writeCount;

    return {
      reads: this.readCount,
      writes: this.writeCount,
      avgReadLatencyMs: this.readCount > 0 ? this.totalReadLatency / this.readCount : 0,
      avgWriteLatencyMs: this.writeCount > 0 ? this.totalWriteLatency / this.writeCount : 0,
      lockAcquisitions: this.lockSuccessCount,
      lockFailures: this.lockFailureCount,
      connectionPoolSize: poolSize,
      connectionPoolAvailable: poolAvailable,
      operationsPerSec: elapsed > 0 ? totalOps / elapsed : 0,
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
    this.opsStartTime = Date.now();
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
    if (this.kvCollection) {
      await this.kvCollection.deleteMany({ _id: { $regex: /^benchmark:/ } });
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
    url: string;
    database: string;
    kvEntries: number;
    activeLocks: number;
    pendingMessages: number;
    storageSize: number;
    indexSize: number;
  }> {
    if (!this.db || !this.kvCollection || !this.locksCollection || !this.pubsubCollection) {
      return {
        url: this.config.url,
        database: this.config.database ?? 'buildnet',
        kvEntries: 0,
        activeLocks: 0,
        pendingMessages: 0,
        storageSize: 0,
        indexSize: 0,
      };
    }

    const [kvCount, lockCount, msgCount, dbStats] = await Promise.all([
      this.kvCollection.countDocuments({
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } },
        ],
      }),
      this.locksCollection.countDocuments({ expiresAt: { $gt: new Date() } }),
      this.pubsubCollection.countDocuments({}),
      this.db.stats(),
    ]);

    return {
      url: this.config.url,
      database: this.db.databaseName,
      kvEntries: kvCount,
      activeLocks: lockCount,
      pendingMessages: msgCount,
      storageSize: dbStats.storageSize ?? 0,
      indexSize: dbStats.indexSize ?? 0,
    };
  }

  /**
   * Compact the collections.
   */
  async compact(): Promise<void> {
    if (!this.db) return;

    const prefix = this.config.prefix ?? 'buildnet';

    await this.db.command({ compact: `${prefix}_kv` });
    await this.db.command({ compact: `${prefix}_locks` });
    await this.db.command({ compact: `${prefix}_pubsub` });
  }
}
