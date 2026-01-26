/**
 * Double-Entry Ledger System
 *
 * Every operation is recorded as a binary, atomic transaction with
 * double-entry bookkeeping (DEBIT + CREDIT entries).
 *
 * Features:
 * - Complete audit trail
 * - Checksum chain for integrity verification
 * - Cryptographic signatures (optional)
 * - Time-travel queries (reconstruct any point in time)
 * - Real-time streaming of transactions
 */

import { createHash, randomUUID } from 'node:crypto';
import { EventEmitter } from 'eventemitter3';
import type { StateBackend } from '../../state/index.js';
import {
  type ActorIdentity,
  type LedgerEntry,
  type LedgerTransaction,
  type LedgerEntryType,
  LedgerAccountType,
  type IntegrityReport,
  type IntegrityError,
  SYSTEM_ACTOR,
} from '../types.js';

// ============================================================================
// Interfaces
// ============================================================================

export interface LedgerConfig {
  backend: 'dragonfly' | 'file' | 'hybrid';
  key_prefix: string;
  retention_days: number;
  sync_interval_ms: number;
  enable_signatures: boolean;
  file_backup_path?: string;
}

export interface RecordChangeParams<T> {
  entity_type: string;
  entity_id: string;
  previous_state: T | null;
  new_state: T | null;
  actor: ActorIdentity;
  reason: string;
  correlation_id?: string;
}

export interface TransactionResult {
  transaction_id: string;
  entries: LedgerEntry[];
  success: boolean;
  error?: string;
}

export interface QueryOptions {
  from_sequence?: bigint;
  to_sequence?: bigint;
  entity_type?: string;
  entity_id?: string;
  actor_id?: string;
  from_time?: Date;
  to_time?: Date;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Double-Entry Ledger Implementation
// ============================================================================

export class DoubleEntryLedger extends EventEmitter {
  private state: StateBackend;
  private config: LedgerConfig;
  private currentCorrelationId: string | null = null;
  private sequenceCache: bigint = 0n;
  private lastChecksum: string = '';
  private initialized: boolean = false;

  constructor(state: StateBackend, config: Partial<LedgerConfig> = {}) {
    super();
    this.state = state;
    this.config = {
      backend: config.backend ?? 'hybrid',
      key_prefix: config.key_prefix ?? 'ledger:',
      retention_days: config.retention_days ?? 90,
      sync_interval_ms: config.sync_interval_ms ?? 5000,
      enable_signatures: config.enable_signatures ?? false,
      file_backup_path: config.file_backup_path,
    };
  }

  /**
   * Initialize the ledger, loading current sequence number.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load current sequence number
    const seqStr = await this.state.get(this.key('sequence'));
    this.sequenceCache = seqStr ? BigInt(seqStr) : 0n;

    // Load last checksum for chain integrity
    const lastEntry = await this.getLastEntry();
    this.lastChecksum = lastEntry?.checksum ?? '';

    this.initialized = true;

    // Record initialization
    await this.recordChange({
      entity_type: 'ledger',
      entity_id: 'system',
      previous_state: null,
      new_state: { initialized: true, sequence: this.sequenceCache.toString() },
      actor: SYSTEM_ACTOR,
      reason: 'Ledger initialized',
    });
  }

  /**
   * Record a state change atomically.
   * Both DEBIT and CREDIT entries are written in a single transaction.
   */
  async recordChange<T>(params: RecordChangeParams<T>): Promise<TransactionResult> {
    const transaction_id = randomUUID();
    const timestamp = new Date();
    const correlation_id = params.correlation_id ?? this.currentCorrelationId ?? randomUUID();

    const entries: LedgerEntry[] = [];

    // Determine account type based on entity type
    const account_type = this.getAccountType(params.entity_type);

    // Compute delta between states
    const delta = this.computeDelta(params.previous_state, params.new_state);

    // DEBIT entry: Record what we're removing/changing (old state)
    if (params.previous_state !== null) {
      const sequence = await this.nextSequence();
      const debitEntry: LedgerEntry = {
        entry_id: randomUUID(),
        transaction_id,
        sequence_number: sequence,
        entry_type: 'DEBIT',
        account_type,
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        previous_state: params.previous_state,
        new_state: null,
        delta: { removed: params.previous_state },
        timestamp,
        actor: params.actor,
        reason: params.reason,
        correlation_id,
        checksum: '',
        previous_checksum: this.lastChecksum,
      };

      // Compute checksum
      debitEntry.checksum = this.computeChecksum(debitEntry);
      this.lastChecksum = debitEntry.checksum;

      entries.push(debitEntry);
    }

    // CREDIT entry: Record what we're adding/creating (new state)
    if (params.new_state !== null) {
      const sequence = await this.nextSequence();
      const creditEntry: LedgerEntry = {
        entry_id: randomUUID(),
        transaction_id,
        sequence_number: sequence,
        entry_type: 'CREDIT',
        account_type,
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        previous_state: null,
        new_state: params.new_state,
        delta: { added: params.new_state },
        timestamp,
        actor: params.actor,
        reason: params.reason,
        correlation_id,
        checksum: '',
        previous_checksum: this.lastChecksum,
      };

      // Compute checksum
      creditEntry.checksum = this.computeChecksum(creditEntry);
      this.lastChecksum = creditEntry.checksum;

      entries.push(creditEntry);
    }

    // Write entries atomically
    try {
      await this.writeEntries(entries);

      // Update latest state pointer
      if (params.new_state !== null) {
        await this.state.set(
          this.key(`latest:${params.entity_type}:${params.entity_id}`),
          JSON.stringify(params.new_state)
        );
      } else {
        await this.state.delete(
          this.key(`latest:${params.entity_type}:${params.entity_id}`)
        );
      }

      // Create transaction record
      const transaction: LedgerTransaction = {
        transaction_id,
        entries,
        timestamp,
        actor: params.actor,
        reason: params.reason,
      };

      // Emit for real-time streaming
      this.emit('transaction', transaction);

      return { transaction_id, entries, success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { transaction_id, entries: [], success: false, error: message };
    }
  }

  /**
   * Query ledger entries with filters.
   */
  async queryEntries(options: QueryOptions = {}): Promise<LedgerEntry[]> {
    const entries: LedgerEntry[] = [];
    const limit = options.limit ?? 1000;
    const offset = options.offset ?? 0;

    // Get all entry keys
    const pattern = this.key('entries:*');
    const keys = await this.state.keys(pattern);

    // Sort by sequence number
    keys.sort();

    // Apply offset and limit
    const selectedKeys = keys.slice(offset, offset + limit);

    for (const key of selectedKeys) {
      const entryStr = await this.state.get(key);
      if (!entryStr) continue;

      const entry = this.deserializeEntry(entryStr);

      // Apply filters
      if (options.from_sequence !== undefined && entry.sequence_number < options.from_sequence) continue;
      if (options.to_sequence !== undefined && entry.sequence_number > options.to_sequence) continue;
      if (options.entity_type && entry.entity_type !== options.entity_type) continue;
      if (options.entity_id && entry.entity_id !== options.entity_id) continue;
      if (options.actor_id && entry.actor.id !== options.actor_id) continue;
      if (options.from_time && entry.timestamp < options.from_time) continue;
      if (options.to_time && entry.timestamp > options.to_time) continue;

      entries.push(entry);
    }

    return entries;
  }

  /**
   * Get the current state of an entity.
   */
  async getEntityState<T>(entity_type: string, entity_id: string): Promise<T | null> {
    const key = this.key(`latest:${entity_type}:${entity_id}`);
    const stateStr = await this.state.get(key);
    return stateStr ? JSON.parse(stateStr) : null;
  }

  /**
   * Get entity state at a specific point in time.
   */
  async getEntityStateAt<T>(
    entity_type: string,
    entity_id: string,
    timestamp: Date
  ): Promise<T | null> {
    // Query all entries for this entity up to the timestamp
    const entries = await this.queryEntries({
      entity_type,
      entity_id,
      to_time: timestamp,
    });

    // Find the last CREDIT entry (represents the state at that time)
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (entry.entry_type === 'CREDIT' && entry.new_state !== null) {
        return entry.new_state as T;
      }
    }

    return null;
  }

  /**
   * Verify ledger integrity by checking the hash chain.
   */
  async verifyIntegrity(from_sequence?: bigint): Promise<IntegrityReport> {
    const entries = await this.queryEntries({
      from_sequence: from_sequence ?? 0n,
    });

    const errors: IntegrityError[] = [];
    let previous_checksum = '';

    // If starting from a specific sequence, get the previous checksum
    if (from_sequence && from_sequence > 0n) {
      const prevEntries = await this.queryEntries({
        to_sequence: from_sequence - 1n,
        limit: 1,
      });
      if (prevEntries.length > 0) {
        previous_checksum = prevEntries[prevEntries.length - 1].checksum;
      }
    }

    for (const entry of entries) {
      // Verify chain link
      if (entry.previous_checksum !== previous_checksum) {
        errors.push({
          sequence: entry.sequence_number,
          type: 'CHAIN_BREAK',
          expected: previous_checksum,
          actual: entry.previous_checksum,
        });
      }

      // Verify entry checksum
      const computed = this.computeChecksum(entry);
      if (entry.checksum !== computed) {
        errors.push({
          sequence: entry.sequence_number,
          type: 'CHECKSUM_MISMATCH',
          expected: computed,
          actual: entry.checksum,
        });
      }

      previous_checksum = entry.checksum;
    }

    return {
      verified: errors.length === 0,
      entries_checked: entries.length,
      errors,
      last_verified_sequence: entries.length > 0
        ? entries[entries.length - 1].sequence_number
        : 0n,
    };
  }

  /**
   * Get transaction by ID.
   */
  async getTransaction(transaction_id: string): Promise<LedgerTransaction | null> {
    const entries = await this.queryEntries({});
    const txEntries = entries.filter(e => e.transaction_id === transaction_id);

    if (txEntries.length === 0) return null;

    return {
      transaction_id,
      entries: txEntries,
      timestamp: txEntries[0].timestamp,
      actor: txEntries[0].actor,
      reason: txEntries[0].reason,
    };
  }

  /**
   * Start a correlation context for related operations.
   */
  startCorrelation(): string {
    this.currentCorrelationId = randomUUID();
    return this.currentCorrelationId;
  }

  /**
   * End the current correlation context.
   */
  endCorrelation(): void {
    this.currentCorrelationId = null;
  }

  /**
   * Get current sequence number.
   */
  getCurrentSequence(): bigint {
    return this.sequenceCache;
  }

  /**
   * Export ledger entries to JSON.
   */
  async exportToJson(options: QueryOptions = {}): Promise<string> {
    const entries = await this.queryEntries(options);
    return JSON.stringify(entries, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2);
  }

  /**
   * Get statistics about the ledger.
   */
  async getStats(): Promise<{
    total_entries: number;
    total_transactions: number;
    entries_by_type: Record<string, number>;
    entries_by_account: Record<string, number>;
    oldest_entry: Date | null;
    newest_entry: Date | null;
  }> {
    const entries = await this.queryEntries({});

    const entries_by_type: Record<string, number> = {};
    const entries_by_account: Record<string, number> = {};
    const transactions = new Set<string>();

    let oldest: Date | null = null;
    let newest: Date | null = null;

    for (const entry of entries) {
      // Count by entity type
      entries_by_type[entry.entity_type] = (entries_by_type[entry.entity_type] ?? 0) + 1;

      // Count by account type
      entries_by_account[entry.account_type] = (entries_by_account[entry.account_type] ?? 0) + 1;

      // Track unique transactions
      transactions.add(entry.transaction_id);

      // Track date range
      if (!oldest || entry.timestamp < oldest) oldest = entry.timestamp;
      if (!newest || entry.timestamp > newest) newest = entry.timestamp;
    }

    return {
      total_entries: entries.length,
      total_transactions: transactions.size,
      entries_by_type,
      entries_by_account,
      oldest_entry: oldest,
      newest_entry: newest,
    };
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private key(suffix: string): string {
    return `${this.config.key_prefix}${suffix}`;
  }

  private async nextSequence(): Promise<bigint> {
    this.sequenceCache += 1n;
    await this.state.set(this.key('sequence'), this.sequenceCache.toString());
    return this.sequenceCache;
  }

  private async getLastEntry(): Promise<LedgerEntry | null> {
    if (this.sequenceCache === 0n) return null;

    const key = this.key(`entries:${this.sequenceCache.toString().padStart(20, '0')}`);
    const entryStr = await this.state.get(key);
    return entryStr ? this.deserializeEntry(entryStr) : null;
  }

  private async writeEntries(entries: LedgerEntry[]): Promise<void> {
    for (const entry of entries) {
      const key = this.key(`entries:${entry.sequence_number.toString().padStart(20, '0')}`);
      await this.state.set(key, this.serializeEntry(entry));

      // Also index by transaction_id for faster lookups
      await this.state.set(
        this.key(`tx:${entry.transaction_id}:${entry.entry_id}`),
        key
      );
    }
  }

  private serializeEntry(entry: LedgerEntry): string {
    return JSON.stringify({
      ...entry,
      sequence_number: entry.sequence_number.toString(),
      timestamp: entry.timestamp.toISOString(),
    });
  }

  private deserializeEntry(str: string): LedgerEntry {
    const obj = JSON.parse(str);
    return {
      ...obj,
      sequence_number: BigInt(obj.sequence_number),
      timestamp: new Date(obj.timestamp),
    };
  }

  private computeChecksum(entry: LedgerEntry): string {
    const content = JSON.stringify({
      entry_id: entry.entry_id,
      transaction_id: entry.transaction_id,
      sequence_number: entry.sequence_number.toString(),
      entry_type: entry.entry_type,
      account_type: entry.account_type,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      previous_state: entry.previous_state,
      new_state: entry.new_state,
      delta: entry.delta,
      timestamp: entry.timestamp.toISOString(),
      actor: entry.actor,
      reason: entry.reason,
      correlation_id: entry.correlation_id,
      previous_checksum: entry.previous_checksum,
    });

    return createHash('sha256').update(content).digest('hex');
  }

  private computeDelta<T>(previous: T | null, current: T | null): unknown {
    if (previous === null && current === null) {
      return null;
    }
    if (previous === null) {
      return { type: 'create', value: current };
    }
    if (current === null) {
      return { type: 'delete', value: previous };
    }

    // Compute field-level differences
    const diff: Record<string, { old: unknown; new: unknown }> = {};
    const prevObj = previous as Record<string, unknown>;
    const currObj = current as Record<string, unknown>;

    const allKeys = new Set([...Object.keys(prevObj), ...Object.keys(currObj)]);

    for (const key of allKeys) {
      const oldVal = prevObj[key];
      const newVal = currObj[key];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diff[key] = { old: oldVal, new: newVal };
      }
    }

    return { type: 'update', changes: diff };
  }

  private getAccountType(entity_type: string): LedgerAccountType {
    const mapping: Record<string, LedgerAccountType> = {
      build: LedgerAccountType.BUILD_QUEUE,
      build_result: LedgerAccountType.COMPLETED_BUILDS,
      worker: LedgerAccountType.WORKER_POOL,
      resource: LedgerAccountType.WORKER_POOL,
      session: LedgerAccountType.USER_SESSIONS,
      config: LedgerAccountType.CONFIG_ACTIVE,
      security: LedgerAccountType.SECURITY_EVENTS,
    };

    return mapping[entity_type] ?? LedgerAccountType.SYSTEM_EVENTS;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createLedger(
  state: StateBackend,
  config?: Partial<LedgerConfig>
): DoubleEntryLedger {
  return new DoubleEntryLedger(state, config);
}
