/**
 * Escrow Service
 *
 * Manages escrow holds for class bookings, challenges, and marketplace transactions.
 * Credits are held until conditions are met, then released to recipients.
 */

import crypto from 'crypto';
import { queryOne, queryAll, query, serializableTransaction } from '../../db/client';
import { loggers } from '../../lib/logger';
import { ValidationError, NotFoundError } from '../../lib/errors';
import { walletService } from './wallet.service';

const log = loggers.economy;

// Types
export type HoldType = 'class_booking' | 'challenge_stake' | 'marketplace' | 'other';
export type EscrowStatus = 'held' | 'released' | 'refunded' | 'disputed' | 'forfeited';

export interface EscrowHold {
  id: string;
  userId: string;
  amount: number;
  holdType: HoldType;
  referenceType: string;
  referenceId: string;
  status: EscrowStatus;
  releaseTo?: string;
  releaseAmount?: number;
  feeAmount: number;
  holdUntil?: Date;
  autoRelease: boolean;
  createdAt: Date;
  releasedAt?: Date;
}

export interface CreateEscrowInput {
  userId: string;
  amount: number;
  holdType: HoldType;
  referenceType: string;
  referenceId: string;
  releaseTo?: string;
  holdUntil?: Date;
  autoRelease?: boolean;
}

export interface ReleaseEscrowInput {
  escrowId: string;
  releaseTo?: string;
  releaseAmount?: number;
  feeAmount?: number;
  releasedBy: string;
  reason: string;
}

export const escrowService = {
  /**
   * Create an escrow hold by charging the user
   */
  async createHold(input: CreateEscrowInput): Promise<EscrowHold> {
    const { userId, amount, holdType, referenceType, referenceId, releaseTo, holdUntil, autoRelease = true } = input;

    if (amount <= 0) {
      throw new ValidationError('Escrow amount must be positive');
    }

    // Check for existing hold on same reference
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM escrow_holds WHERE reference_type = $1 AND reference_id = $2 AND status = 'held'`,
      [referenceType, referenceId]
    );

    if (existing) {
      throw new ValidationError('An escrow hold already exists for this reference');
    }

    const escrowId = `escrow_${crypto.randomBytes(12).toString('hex')}`;

    // Charge user and create escrow in transaction
    return await serializableTransaction(async (client) => {
      // Check balance
      const balance = await client.query<{ balance: number }>(
        `SELECT balance FROM credit_balances WHERE user_id = $1 FOR UPDATE`,
        [userId]
      );

      if (!balance.rows[0] || balance.rows[0].balance < amount) {
        throw new ValidationError('Insufficient credits for escrow hold');
      }

      // Deduct from balance
      await client.query(
        `UPDATE credit_balances SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2`,
        [amount, userId]
      );

      // Create ledger entry
      const ledgerId = `txn_${crypto.randomBytes(12).toString('hex')}`;
      await client.query(
        `INSERT INTO credit_ledger (id, user_id, action, amount, balance_after, metadata, idempotency_key)
         VALUES ($1, $2, 'escrow_hold', $3, (SELECT balance FROM credit_balances WHERE user_id = $2), $4, $5)`,
        [ledgerId, userId, -amount, JSON.stringify({ escrowId, holdType, referenceType, referenceId }), `escrow-${escrowId}`]
      );

      // Create escrow hold
      await client.query(
        `INSERT INTO escrow_holds (id, user_id, amount, hold_type, reference_type, reference_id, release_to, hold_until, auto_release, ledger_entry_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [escrowId, userId, amount, holdType, referenceType, referenceId, releaseTo || null, holdUntil || null, autoRelease, ledgerId]
      );

      log.info({ escrowId, userId, amount, holdType, referenceId }, 'Escrow hold created');

      return {
        id: escrowId,
        userId,
        amount,
        holdType,
        referenceType,
        referenceId,
        status: 'held' as EscrowStatus,
        releaseTo,
        feeAmount: 0,
        holdUntil,
        autoRelease,
        createdAt: new Date(),
      };
    });
  },

  /**
   * Get escrow hold by ID
   */
  async getHold(escrowId: string): Promise<EscrowHold | null> {
    const row = await queryOne<{
      id: string;
      user_id: string;
      amount: number;
      hold_type: string;
      reference_type: string;
      reference_id: string;
      status: string;
      release_to: string | null;
      release_amount: number | null;
      fee_amount: number;
      hold_until: Date | null;
      auto_release: boolean;
      created_at: Date;
      released_at: Date | null;
    }>(`SELECT * FROM escrow_holds WHERE id = $1`, [escrowId]);

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      amount: row.amount,
      holdType: row.hold_type as HoldType,
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      status: row.status as EscrowStatus,
      releaseTo: row.release_to ?? undefined,
      releaseAmount: row.release_amount ?? undefined,
      feeAmount: row.fee_amount,
      holdUntil: row.hold_until ?? undefined,
      autoRelease: row.auto_release,
      createdAt: row.created_at,
      releasedAt: row.released_at ?? undefined,
    };
  },

  /**
   * Get escrow hold by reference
   */
  async getHoldByReference(referenceType: string, referenceId: string): Promise<EscrowHold | null> {
    const row = await queryOne<{ id: string }>(
      `SELECT id FROM escrow_holds WHERE reference_type = $1 AND reference_id = $2 AND status = 'held'`,
      [referenceType, referenceId]
    );

    if (!row) return null;
    return this.getHold(row.id);
  },

  /**
   * Release escrow to recipient
   */
  async release(input: ReleaseEscrowInput): Promise<{ released: boolean; recipientNewBalance?: number }> {
    const { escrowId, releaseTo, releaseAmount, feeAmount = 0, releasedBy, reason } = input;

    const hold = await this.getHold(escrowId);
    if (!hold) {
      throw new NotFoundError('Escrow hold not found');
    }

    if (hold.status !== 'held') {
      throw new ValidationError(`Escrow is already ${hold.status}`);
    }

    const recipient = releaseTo || hold.releaseTo;
    if (!recipient) {
      throw new ValidationError('No recipient specified for escrow release');
    }

    const amountToRelease = releaseAmount ?? (hold.amount - feeAmount);
    if (amountToRelease < 0 || amountToRelease > hold.amount) {
      throw new ValidationError('Invalid release amount');
    }

    return await serializableTransaction(async (client) => {
      // Credit recipient
      const ledgerId = `txn_${crypto.randomBytes(12).toString('hex')}`;
      await client.query(
        `INSERT INTO credit_balances (user_id, balance, lifetime_earned)
         VALUES ($1, $2, $2)
         ON CONFLICT (user_id) DO UPDATE SET
           balance = credit_balances.balance + $2,
           lifetime_earned = credit_balances.lifetime_earned + $2,
           updated_at = NOW()`,
        [recipient, amountToRelease]
      );

      // Create ledger entry for recipient
      await client.query(
        `INSERT INTO credit_ledger (id, user_id, action, amount, balance_after, metadata, idempotency_key)
         VALUES ($1, $2, 'escrow_release', $3, (SELECT balance FROM credit_balances WHERE user_id = $2), $4, $5)`,
        [ledgerId, recipient, amountToRelease, JSON.stringify({ escrowId, fromUser: hold.userId, reason }), `escrow-release-${escrowId}`]
      );

      // Update escrow status
      await client.query(
        `UPDATE escrow_holds SET
           status = 'released',
           release_to = $1,
           release_amount = $2,
           fee_amount = $3,
           release_ledger_id = $4,
           released_at = NOW(),
           released_by = $5,
           release_reason = $6
         WHERE id = $7`,
        [recipient, amountToRelease, feeAmount, ledgerId, releasedBy, reason, escrowId]
      );

      // Get new balance
      const newBalance = await client.query<{ balance: number }>(
        `SELECT balance FROM credit_balances WHERE user_id = $1`,
        [recipient]
      );

      log.info({ escrowId, recipient, amountToRelease, feeAmount }, 'Escrow released');

      return {
        released: true,
        recipientNewBalance: newBalance.rows[0]?.balance,
      };
    });
  },

  /**
   * Refund escrow to original holder
   */
  async refund(escrowId: string, refundedBy: string, reason: string): Promise<{ refunded: boolean; newBalance: number }> {
    const hold = await this.getHold(escrowId);
    if (!hold) {
      throw new NotFoundError('Escrow hold not found');
    }

    if (hold.status !== 'held' && hold.status !== 'disputed') {
      throw new ValidationError(`Cannot refund escrow in ${hold.status} status`);
    }

    return await serializableTransaction(async (client) => {
      // Credit back to original holder
      const ledgerId = `txn_${crypto.randomBytes(12).toString('hex')}`;
      await client.query(
        `UPDATE credit_balances SET
           balance = balance + $1,
           updated_at = NOW()
         WHERE user_id = $2`,
        [hold.amount, hold.userId]
      );

      // Create ledger entry
      await client.query(
        `INSERT INTO credit_ledger (id, user_id, action, amount, balance_after, metadata, idempotency_key)
         VALUES ($1, $2, 'escrow_refund', $3, (SELECT balance FROM credit_balances WHERE user_id = $2), $4, $5)`,
        [ledgerId, hold.userId, hold.amount, JSON.stringify({ escrowId, reason }), `escrow-refund-${escrowId}`]
      );

      // Update escrow status
      await client.query(
        `UPDATE escrow_holds SET
           status = 'refunded',
           release_ledger_id = $1,
           released_at = NOW(),
           released_by = $2,
           release_reason = $3
         WHERE id = $4`,
        [ledgerId, refundedBy, reason, escrowId]
      );

      // Get new balance
      const newBalance = await client.query<{ balance: number }>(
        `SELECT balance FROM credit_balances WHERE user_id = $1`,
        [hold.userId]
      );

      log.info({ escrowId, userId: hold.userId, amount: hold.amount }, 'Escrow refunded');

      return {
        refunded: true,
        newBalance: newBalance.rows[0]?.balance || 0,
      };
    });
  },

  /**
   * Mark escrow as disputed
   */
  async dispute(escrowId: string): Promise<void> {
    const hold = await this.getHold(escrowId);
    if (!hold) {
      throw new NotFoundError('Escrow hold not found');
    }

    if (hold.status !== 'held') {
      throw new ValidationError(`Cannot dispute escrow in ${hold.status} status`);
    }

    await query(
      `UPDATE escrow_holds SET status = 'disputed' WHERE id = $1`,
      [escrowId]
    );

    log.info({ escrowId }, 'Escrow marked as disputed');
  },

  /**
   * Get user's active escrow holds
   */
  async getUserHolds(userId: string, status?: EscrowStatus): Promise<EscrowHold[]> {
    let sql = `SELECT * FROM escrow_holds WHERE user_id = $1`;
    const params: unknown[] = [userId];

    if (status) {
      sql += ` AND status = $2`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC`;

    const rows = await queryAll<{
      id: string;
      user_id: string;
      amount: number;
      hold_type: string;
      reference_type: string;
      reference_id: string;
      status: string;
      release_to: string | null;
      release_amount: number | null;
      fee_amount: number;
      hold_until: Date | null;
      auto_release: boolean;
      created_at: Date;
      released_at: Date | null;
    }>(sql, params);

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      amount: row.amount,
      holdType: row.hold_type as HoldType,
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      status: row.status as EscrowStatus,
      releaseTo: row.release_to ?? undefined,
      releaseAmount: row.release_amount ?? undefined,
      feeAmount: row.fee_amount,
      holdUntil: row.hold_until ?? undefined,
      autoRelease: row.auto_release,
      createdAt: row.created_at,
      releasedAt: row.released_at ?? undefined,
    }));
  },

  /**
   * Process auto-release for expired holds
   */
  async processAutoReleases(): Promise<{ processed: number }> {
    const expiredHolds = await queryAll<{ id: string; release_to: string }>(
      `SELECT id, release_to FROM escrow_holds
       WHERE status = 'held' AND auto_release = TRUE AND hold_until IS NOT NULL AND hold_until <= NOW()
       LIMIT 100`
    );

    let processed = 0;
    for (const hold of expiredHolds) {
      try {
        await this.release({
          escrowId: hold.id,
          releaseTo: hold.release_to,
          releasedBy: 'system',
          reason: 'Auto-release after hold period',
        });
        processed++;
      } catch (error) {
        log.error({ escrowId: hold.id, error }, 'Failed to auto-release escrow');
      }
    }

    if (processed > 0) {
      log.info({ processed }, 'Processed auto-release escrows');
    }

    return { processed };
  },
};

export default escrowService;
