/**
 * Economy Module
 *
 * Handles credit balance management with proper transaction isolation
 * and race condition prevention using PostgreSQL's serializable transactions.
 */

import { serializableTransaction, queryOne, queryAll, query } from '../../db/client';
import { ConflictError } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import crypto from 'crypto';
import { entitlementsService } from '../entitlements';

const log = loggers.economy;

interface CreditChargeRequest {
  userId: string;
  action: string;
  amount?: number;
  metadata?: Record<string, unknown>;
  idempotencyKey: string;
}

interface CreditChargeResult {
  success: boolean;
  ledgerEntryId?: string;
  newBalance?: number;
  error?: string;
}

export const economyService = {
  /**
   * Get user's current credit balance
   */
  async getBalance(userId: string): Promise<number> {
    const row = await queryOne<{ balance: number }>(
      'SELECT balance FROM credit_balances WHERE user_id = $1',
      [userId]
    );
    return row?.balance ?? 0;
  },

  /**
   * Check if user can afford a charge
   */
  async canCharge(userId: string, amount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= amount;
  },

  /**
   * Charge credits with proper transaction isolation
   *
   * Uses PostgreSQL's serializable isolation level for:
   * - Idempotency via unique constraint on idempotency_key
   * - Atomic balance update with version checking
   * - Automatic retry on serialization failure
   */
  async charge(request: CreditChargeRequest): Promise<CreditChargeResult> {
    // Check if user has unlimited access (trial or subscription)
    const entitlements = await entitlementsService.getEntitlements(request.userId);

    if (entitlements.unlimited) {
      log.info('Action performed with unlimited access', {
        userId: request.userId,
        action: request.action,
        reason: entitlements.reason,
      });
      return {
        success: true,
        ledgerEntryId: undefined,
        newBalance: entitlements.creditBalance ?? undefined,
      };
    }

    try {
      // Use serializable transaction for strongest isolation
      return await serializableTransaction(async (client) => {
        // Check for existing idempotent transaction
        const existing = await client.query<{ id: string; balance_after: number }>(
          'SELECT id, balance_after FROM credit_ledger WHERE idempotency_key = $1',
          [request.idempotencyKey]
        );

        if (existing.rows.length > 0) {
          return {
            success: true,
            ledgerEntryId: existing.rows[0].id,
            newBalance: existing.rows[0].balance_after,
          };
        }

        // Get action cost
        let cost = request.amount;
        if (cost === undefined) {
          const action = await client.query<{ default_cost: number }>(
            'SELECT default_cost FROM credit_actions WHERE id = $1 AND enabled = TRUE',
            [request.action]
          );
          if (action.rows.length === 0) {
            return { success: false, error: `Unknown action: ${request.action}` };
          }
          cost = action.rows[0].default_cost;
        }

        // Get current balance with row-level lock (FOR UPDATE)
        const balance = await client.query<{ balance: number; version: number }>(
          'SELECT balance, version FROM credit_balances WHERE user_id = $1 FOR UPDATE',
          [request.userId]
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
          [newBalance, cost, request.userId, currentVersion]
        );

        if (updateResult.rowCount === 0) {
          throw new ConflictError('Concurrent modification detected');
        }

        // Insert ledger entry (idempotency_key has UNIQUE constraint)
        await client.query(
          `INSERT INTO credit_ledger (id, user_id, action, amount, balance_after, metadata, idempotency_key)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            entryId,
            request.userId,
            request.action,
            -cost,
            newBalance,
            request.metadata ? JSON.stringify(request.metadata) : null,
            request.idempotencyKey,
          ]
        );

        log.info('Credits charged', {
          userId: request.userId,
          action: request.action,
          amount: cost,
          newBalance,
        });

        return { success: true, ledgerEntryId: entryId, newBalance };
      });
    } catch (error: any) {
      // Handle unique constraint violation (duplicate idempotency key from race)
      if (error.code === '23505' && error.constraint?.includes('idempotency')) {
        const existing = await queryOne<{ id: string; balance_after: number }>(
          'SELECT id, balance_after FROM credit_ledger WHERE idempotency_key = $1',
          [request.idempotencyKey]
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
   * Add credits to a user's balance (for purchases, rewards, etc.)
   */
  async addCredits(
    userId: string,
    amount: number,
    action: string,
    metadata?: Record<string, unknown>,
    idempotencyKey?: string
  ): Promise<CreditChargeResult> {
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

      log.info('Credits added', { userId, action, amount, newBalance });

      return { success: true, ledgerEntryId: entryId, newBalance };
    });
  },

  /**
   * Get transaction history with pagination
   */
  async getHistory(userId: string, limit: number = 50, offset: number = 0) {
    const rows = await queryAll<{
      id: string;
      action: string;
      amount: number;
      balance_after: number;
      metadata: string | null;
      created_at: Date;
    }>(
      `SELECT id, action, amount, balance_after, metadata, created_at
       FROM credit_ledger
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return rows;
  },

  /**
   * Get total transaction count for pagination
   */
  async getHistoryCount(userId: string): Promise<number> {
    const result = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM credit_ledger WHERE user_id = $1',
      [userId]
    );
    return parseInt(result?.count || '0', 10);
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
};

// Note: Express router removed - routes now in src/http/routes/economy.ts
