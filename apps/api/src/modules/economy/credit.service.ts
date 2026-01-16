/**
 * Enhanced Credit Service
 *
 * Handles the credit economy with:
 * - Atomic transactions with idempotency
 * - P2P credit transfers
 * - Rep-based credit awards (1 credit per rep)
 * - Redis caching for balance lookups
 * - Transaction history with audit trails
 */

import crypto from 'crypto';
import { db, serializableTransaction, queryOne, queryAll, query } from '../../db/client';
import { getRedis, isRedisAvailable } from '../../lib/redis';
import { ConflictError, ValidationError, NotFoundError } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import { entitlementsService } from '../entitlements';

const log = loggers.economy;

// Credit reason codes (matches database migration)
export enum CreditReason {
  REP_COMPLETED = 1,
  DM_SENT = 2,
  AI_QUERY = 3,
  POST_CREATED = 4,
  AD_POSTED = 5,
  TRANSFER_SENT = 6,
  TRANSFER_RECEIVED = 7,
  ADMIN_ADJUSTMENT = 8,
  WORKOUT_COMPLETED = 9,
  PURCHASE = 10,
  SUBSCRIPTION_BONUS = 11,
  REFERRAL_BONUS = 12,
  MILESTONE_REWARD = 13,
}

// Reference type codes
export enum RefType {
  REP_EVENT = 1,
  MESSAGE = 2,
  AI_REQUEST = 3,
  POST = 4,
  AD = 5,
  TRANSFER = 6,
  WORKOUT = 7,
  PURCHASE = 8,
  MILESTONE = 9,
}

interface TransactionRequest {
  userId: string;
  delta: number;
  reason: CreditReason;
  refType?: RefType;
  refId?: string;
  idempotencyKey: string;
  metadata?: {
    ip?: string;
    userAgent?: string;
  };
}

interface TransactionResult {
  entryId: string;
  newBalance: number;
  wasDuplicate: boolean;
  version: number;
}

interface TransferRequest {
  senderId: string;
  recipientId: string;
  amount: number;
  note?: string;
}

interface TransferResult {
  transferId: string;
  senderNewBalance: number;
  recipientNewBalance: number;
}

interface ChargeRequest {
  userId: string;
  action: string;
  amount?: number;
  metadata?: Record<string, unknown>;
  idempotencyKey: string;
}

interface ChargeResult {
  success: boolean;
  ledgerEntryId?: string;
  newBalance?: number;
  error?: string;
}

// Cache settings
const BALANCE_CACHE_TTL = 60; // 60 seconds
const BALANCE_CACHE_PREFIX = 'balance:';

/**
 * Invalidate cached balance
 */
async function invalidateBalanceCache(userId: string): Promise<void> {
  if (!isRedisAvailable()) return;

  try {
    const redis = getRedis();
    if (redis) {
      await redis.del(`${BALANCE_CACHE_PREFIX}${userId}`);
    }
  } catch (error) {
    log.warn({ userId, error }, 'Failed to invalidate balance cache');
  }
}

/**
 * Get cached balance or null
 */
async function getCachedBalance(userId: string): Promise<number | null> {
  if (!isRedisAvailable()) return null;

  try {
    const redis = getRedis();
    if (!redis) return null;

    const cached = await redis.get(`${BALANCE_CACHE_PREFIX}${userId}`);
    return cached !== null ? parseInt(cached, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Cache a balance value
 */
async function cacheBalance(userId: string, balance: number): Promise<void> {
  if (!isRedisAvailable()) return;

  try {
    const redis = getRedis();
    if (redis) {
      await redis.set(`${BALANCE_CACHE_PREFIX}${userId}`, balance.toString(), 'EX', BALANCE_CACHE_TTL, 'NX');
    }
  } catch (error) {
    log.warn({ userId, error }, 'Failed to cache balance');
  }
}

export const creditService = {
  /**
   * Get user's current credit balance
   * Uses Redis cache with 60s TTL for performance
   */
  async getBalance(userId: string): Promise<number> {
    // Try cache first
    const cached = await getCachedBalance(userId);
    if (cached !== null) {
      return cached;
    }

    // Query database
    const row = await queryOne<{ balance: number }>('SELECT balance FROM credit_balances WHERE user_id = $1', [userId]);

    const balance = row?.balance ?? 0;

    // Cache the result
    await cacheBalance(userId, balance);

    return balance;
  },

  /**
   * Get detailed balance info
   */
  async getBalanceDetails(userId: string): Promise<{
    balance: number;
    totalEarned: number;
    totalSpent: number;
    version: number;
  }> {
    const row = await queryOne<{
      balance: number;
      total_earned: number;
      total_spent: number;
      version: number;
    }>(
      `SELECT balance, COALESCE(total_earned, lifetime_earned) as total_earned,
              COALESCE(total_spent, lifetime_spent) as total_spent, version
       FROM credit_balances WHERE user_id = $1`,
      [userId]
    );

    return {
      balance: row?.balance ?? 0,
      totalEarned: row?.total_earned ?? 0,
      totalSpent: row?.total_spent ?? 0,
      version: row?.version ?? 0,
    };
  },

  /**
   * Execute an atomic credit transaction using the database function
   */
  async transact(request: TransactionRequest): Promise<TransactionResult> {
    const { userId, delta, reason, refType, refId, idempotencyKey, metadata } = request;

    // Hash user agent if provided
    let userAgentHash: Buffer | null = null;
    if (metadata?.userAgent) {
      userAgentHash = crypto.createHash('sha256').update(metadata.userAgent).digest().slice(0, 16);
    }

    // RC-005 FIX: Invalidate cache BEFORE the transaction
    // This ensures any reads during or after the transaction will fetch fresh data
    // The database function handles its own transaction, so we can't invalidate inside it
    await invalidateBalanceCache(userId);

    try {
      const result = await db.queryOne<{
        entry_id: string;
        new_balance: string;
        was_duplicate: boolean;
        version: number;
      }>(
        `SELECT * FROM credit_transaction($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          delta,
          reason,
          refType ?? null,
          refId ?? null,
          idempotencyKey,
          metadata?.ip ?? null,
          userAgentHash,
        ]
      );

      if (!result) {
        throw new Error('Transaction returned no result');
      }

      // Log on success (unless duplicate)
      if (!result.was_duplicate) {
        log.info({
          userId,
          delta,
          reason,
          newBalance: result.new_balance,
        }, 'Credit transaction completed');
      }

      return {
        entryId: result.entry_id,
        newBalance: parseInt(result.new_balance, 10),
        wasDuplicate: result.was_duplicate,
        version: result.version,
      };
    } catch (error: any) {
      // Handle specific errors
      if (error.message?.includes('INSUFFICIENT_CREDITS')) {
        throw new ValidationError('Insufficient credits');
      }

      log.error({ userId, delta, reason, error }, 'Credit transaction failed');
      throw error;
    }
  },

  /**
   * Transfer credits between users
   */
  async transfer(request: TransferRequest): Promise<TransferResult> {
    const { senderId, recipientId, amount, note } = request;

    if (senderId === recipientId) {
      throw new ValidationError('Cannot transfer credits to yourself');
    }

    if (amount <= 0 || amount > 1000000) {
      throw new ValidationError('Transfer amount must be between 1 and 1,000,000');
    }

    // Verify recipient exists
    const recipient = await queryOne<{ id: string }>('SELECT id FROM users WHERE id = $1', [recipientId]);

    if (!recipient) {
      throw new NotFoundError('Recipient not found');
    }

    // Generate transfer ID
    const transferId = `xfer_${crypto.randomBytes(12).toString('hex')}`;

    // RC-005 FIX: Invalidate caches BEFORE the transaction
    // This ensures any reads during or after the transaction will fetch fresh data
    await Promise.all([invalidateBalanceCache(senderId), invalidateBalanceCache(recipientId)]);

    try {
      const result = await db.queryOne<{
        transfer_id: string;
        sender_new_balance: string;
        recipient_new_balance: string;
      }>(`SELECT * FROM credit_transfer($1, $2, $3, $4)`, [senderId, recipientId, amount, transferId]);

      if (!result) {
        throw new Error('Transfer returned no result');
      }

      log.info({
        transferId: result.transfer_id,
        senderId,
        recipientId,
        amount,
        note: note?.slice(0, 100),
      }, 'Credit transfer completed');

      return {
        transferId: result.transfer_id,
        senderNewBalance: parseInt(result.sender_new_balance, 10),
        recipientNewBalance: parseInt(result.recipient_new_balance, 10),
      };
    } catch (error: any) {
      if (error.message?.includes('INSUFFICIENT_CREDITS')) {
        throw new ValidationError('Insufficient credits for transfer');
      }
      if (error.message?.includes('SELF_TRANSFER')) {
        throw new ValidationError('Cannot transfer credits to yourself');
      }
      if (error.message?.includes('INVALID_AMOUNT')) {
        throw new ValidationError('Invalid transfer amount');
      }

      log.error({ senderId, recipientId, amount, error }, 'Credit transfer failed');
      throw error;
    }
  },

  /**
   * Award credits for completed reps
   * Awards 1 credit per rep completed
   */
  async awardForReps(userId: string, repEventId: string, repCount: number): Promise<TransactionResult> {
    if (repCount <= 0 || repCount > 500) {
      throw new ValidationError('Rep count must be between 1 and 500');
    }

    return this.transact({
      userId,
      delta: repCount, // 1 credit per rep
      reason: CreditReason.REP_COMPLETED,
      refType: RefType.REP_EVENT,
      refId: repEventId,
      idempotencyKey: `reps:${repEventId}`,
    });
  },

  /**
   * Spend credits for an action
   */
  async spend(
    userId: string,
    amount: number,
    reason: CreditReason,
    refType: RefType,
    refId: string,
    idempotencyKey: string
  ): Promise<TransactionResult> {
    if (amount <= 0) {
      throw new ValidationError('Amount must be positive');
    }

    return this.transact({
      userId,
      delta: -amount,
      reason,
      refType,
      refId,
      idempotencyKey,
    });
  },

  /**
   * Charge credits using the action-based system
   * Compatible with the original economy service interface
   */
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const { userId, action, amount, metadata, idempotencyKey } = request;

    // Check if user has unlimited access (trial or subscription)
    const entitlements = await entitlementsService.getEntitlements(userId);

    if (entitlements.unlimited) {
      log.info({
        userId,
        action,
        reason: entitlements.reason,
      }, 'Action performed with unlimited access');

      return {
        success: true,
        ledgerEntryId: undefined,
        newBalance: entitlements.creditBalance ?? undefined,
      };
    }

    try {
      return await serializableTransaction(async (client) => {
        // Check for existing idempotent transaction
        const existing = await client.query<{ id: string; balance_after: number }>(
          'SELECT id, balance_after FROM credit_ledger WHERE idempotency_key = $1',
          [idempotencyKey]
        );

        if (existing.rows.length > 0) {
          return {
            success: true,
            ledgerEntryId: existing.rows[0].id,
            newBalance: existing.rows[0].balance_after,
          };
        }

        // Get action cost
        let cost = amount;
        if (cost === undefined) {
          const actionRow = await client.query<{ default_cost: number }>(
            'SELECT default_cost FROM credit_actions WHERE id = $1 AND enabled = TRUE',
            [action]
          );

          if (actionRow.rows.length === 0) {
            return { success: false, error: `Unknown action: ${action}` };
          }

          cost = actionRow.rows[0].default_cost;
        }

        // Get current balance with row-level lock
        const balance = await client.query<{ balance: number; version: number }>(
          'SELECT balance, version FROM credit_balances WHERE user_id = $1 FOR UPDATE',
          [userId]
        );

        if (balance.rows.length === 0) {
          return { success: false, error: 'User has no credit account' };
        }

        const currentBalance = balance.rows[0].balance;
        const currentVersion = balance.rows[0].version;

        if (currentBalance < cost) {
          return { success: false, error: 'Insufficient credits' };
        }

        const newBalance = currentBalance - cost;
        const entryId = `txn_${crypto.randomBytes(12).toString('hex')}`;

        // Atomic update with version check
        const updateResult = await client.query(
          `UPDATE credit_balances
           SET balance = $1, lifetime_spent = lifetime_spent + $2, version = version + 1, updated_at = NOW()
           WHERE user_id = $3 AND version = $4`,
          [newBalance, cost, userId, currentVersion]
        );

        if (updateResult.rowCount === 0) {
          throw new ConflictError('Concurrent modification detected');
        }

        // Insert ledger entry
        await client.query(
          `INSERT INTO credit_ledger (id, user_id, action, amount, balance_after, metadata, idempotency_key)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [entryId, userId, action, -cost, newBalance, metadata ? JSON.stringify(metadata) : null, idempotencyKey]
        );

        // Invalidate cache
        await invalidateBalanceCache(userId);

        log.info({
          userId,
          action,
          amount: cost,
          newBalance,
        }, 'Credits charged');

        return { success: true, ledgerEntryId: entryId, newBalance };
      });
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === '23505' && error.constraint?.includes('idempotency')) {
        const existing = await queryOne<{ id: string; balance_after: number }>(
          'SELECT id, balance_after FROM credit_ledger WHERE idempotency_key = $1',
          [idempotencyKey]
        );

        if (existing) {
          return {
            success: true,
            ledgerEntryId: existing.id,
            newBalance: existing.balance_after,
          };
        }
      }

      log.error({ error, request }, 'Credit charge failed');
      throw error;
    }
  },

  /**
   * Add credits to a user's balance
   */
  async addCredits(
    userId: string,
    amount: number,
    action: string,
    metadata?: Record<string, unknown>,
    idempotencyKey?: string
  ): Promise<ChargeResult> {
    const key = idempotencyKey || `add-${userId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    return await serializableTransaction(async (client) => {
      // Check for existing idempotent transaction
      if (idempotencyKey) {
        const existing = await client.query<{ id: string; balance_after: number }>(
          'SELECT id, balance_after FROM credit_ledger WHERE idempotency_key = $1',
          [key]
        );

        if (existing.rows.length > 0) {
          return {
            success: true,
            ledgerEntryId: existing.rows[0].id,
            newBalance: existing.rows[0].balance_after,
          };
        }
      }

      // Upsert credit balance
      const result = await client.query<{ balance: number }>(
        `INSERT INTO credit_balances (user_id, balance, lifetime_earned, version)
         VALUES ($1, $2, $2, 1)
         ON CONFLICT (user_id) DO UPDATE SET
           balance = credit_balances.balance + $2,
           lifetime_earned = credit_balances.lifetime_earned + $2,
           version = credit_balances.version + 1,
           updated_at = NOW()
         RETURNING balance`,
        [userId, amount]
      );

      const newBalance = result.rows[0].balance;
      const entryId = `txn_${crypto.randomBytes(12).toString('hex')}`;

      // Insert ledger entry
      await client.query(
        `INSERT INTO credit_ledger (id, user_id, action, amount, balance_after, metadata, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [entryId, userId, action, amount, newBalance, metadata ? JSON.stringify(metadata) : null, key]
      );

      // Invalidate cache
      await invalidateBalanceCache(userId);

      log.info({ userId, action, amount, newBalance }, 'Credits added');

      return { success: true, ledgerEntryId: entryId, newBalance };
    });
  },

  /**
   * Get transaction history with pagination
   */
  async getHistory(
    userId: string,
    options: { limit?: number; offset?: number; reason?: CreditReason } = {}
  ): Promise<{
    transactions: Array<{
      id: string;
      action: string;
      amount: number;
      balanceAfter: number;
      reason?: CreditReason;
      refType?: RefType;
      refId?: string;
      metadata: Record<string, unknown> | null;
      createdAt: Date;
    }>;
    total: number;
  }> {
    const { limit = 50, offset = 0, reason } = options;

    const whereClause = reason ? 'WHERE user_id = $1 AND reason = $4' : 'WHERE user_id = $1';

    const params = reason ? [userId, limit, offset, reason] : [userId, limit, offset];

    const rows = await queryAll<{
      id: string;
      action: string;
      amount: number;
      balance_after: number;
      reason: number | null;
      ref_type: number | null;
      ref_id: string | null;
      metadata: Record<string, unknown> | null;
      created_at: Date;
    }>(
      `SELECT id, action, amount, balance_after, reason, ref_type, ref_id, metadata, created_at
       FROM credit_ledger
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      params
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM credit_ledger ${whereClause}`,
      reason ? [userId, reason] : [userId]
    );

    return {
      transactions: rows.map((row) => ({
        id: row.id,
        action: row.action,
        amount: row.amount,
        balanceAfter: row.balance_after,
        reason: row.reason as CreditReason | undefined,
        refType: row.ref_type as RefType | undefined,
        refId: row.ref_id ?? undefined,
        metadata: row.metadata || null,
        createdAt: row.created_at,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  /**
   * Initialize credit balance for new user
   */
  async initializeBalance(userId: string, initialBalance: number = 100): Promise<void> {
    await query(
      `INSERT INTO credit_balances (user_id, balance, lifetime_earned)
       VALUES ($1, $2, $2)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, initialBalance]
    );
  },

  /**
   * Check if user can afford a charge
   */
  async canAfford(userId: string, amount: number): Promise<boolean> {
    // Check for unlimited access first
    const entitlements = await entitlementsService.getEntitlements(userId);
    if (entitlements.unlimited) {
      return true;
    }

    const balance = await this.getBalance(userId);
    return balance >= amount;
  },
};
