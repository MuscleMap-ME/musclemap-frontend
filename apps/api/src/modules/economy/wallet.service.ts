/**
 * Enhanced Wallet Service
 *
 * Extends the credit service with:
 * - P2P credit transfers with atomic transactions
 * - Wallet freeze/unfreeze for anti-abuse
 * - Transaction reversals for admin
 * - Rate limiting integration
 * - Audit logging
 */

import crypto from 'crypto';
import { db, queryOne, queryAll, query, serializableTransaction } from '../../db/client';
import { getRedis, isRedisAvailable } from '../../lib/redis';
import { ValidationError, NotFoundError, ForbiddenError } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import { creditService, CreditReason, RefType } from './credit.service';
import { antiabuseService } from './antiabuse.service';

const log = loggers.economy;

// Cache settings
const BALANCE_CACHE_TTL = 60;
const BALANCE_CACHE_PREFIX = 'balance:';

export interface WalletDetails {
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  totalTransferredOut: number;
  totalTransferredIn: number;
  status: 'active' | 'frozen' | 'suspended';
  frozenAt?: Date;
  frozenReason?: string;
}

export interface TransferRequest {
  senderId: string;
  recipientId: string;
  amount: number;
  note?: string;
  tipType?: 'trainer' | 'user' | 'group';
}

export interface TransferResult {
  transferId: string;
  senderNewBalance: number;
  recipientNewBalance: number;
}

export interface ReverseRequest {
  transactionId: string;
  adminUserId: string;
  reason: string;
}

export interface ReverseResult {
  reversalId: string;
  reversedAmount: number;
  newBalance: number;
}

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

export const walletService = {
  /**
   * Get detailed wallet information
   */
  async getWalletDetails(userId: string): Promise<WalletDetails> {
    // Ensure wallet exists
    await this.ensureWallet(userId);

    const row = await queryOne<{
      user_id: string;
      balance: number;
      lifetime_earned: number;
      lifetime_spent: number;
      total_transferred_out: number;
      total_transferred_in: number;
      status: string;
      frozen_at: Date | null;
      frozen_reason: string | null;
    }>(
      `SELECT user_id, balance,
              COALESCE(lifetime_earned, 0) as lifetime_earned,
              COALESCE(lifetime_spent, 0) as lifetime_spent,
              COALESCE(total_transferred_out, 0) as total_transferred_out,
              COALESCE(total_transferred_in, 0) as total_transferred_in,
              COALESCE(status, 'active') as status,
              frozen_at, frozen_reason
       FROM credit_balances WHERE user_id = $1`,
      [userId]
    );

    return {
      userId,
      balance: row?.balance ?? 0,
      totalEarned: row?.lifetime_earned ?? 0,
      totalSpent: row?.lifetime_spent ?? 0,
      totalTransferredOut: row?.total_transferred_out ?? 0,
      totalTransferredIn: row?.total_transferred_in ?? 0,
      status: (row?.status as 'active' | 'frozen' | 'suspended') ?? 'active',
      frozenAt: row?.frozen_at ?? undefined,
      frozenReason: row?.frozen_reason ?? undefined,
    };
  },

  /**
   * Ensure wallet exists for user
   */
  async ensureWallet(userId: string): Promise<void> {
    await query(
      `INSERT INTO credit_balances (user_id, balance, lifetime_earned, version)
       VALUES ($1, 100, 100, 1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );
  },

  /**
   * Check if wallet can transact
   */
  async canTransact(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const wallet = await this.getWalletDetails(userId);

    if (wallet.status === 'frozen') {
      return { allowed: false, reason: `Wallet frozen: ${wallet.frozenReason || 'Contact support'}` };
    }

    if (wallet.status === 'suspended') {
      return { allowed: false, reason: 'Wallet suspended. Contact support.' };
    }

    return { allowed: true };
  },

  /**
   * Transfer credits between users with atomic transaction
   */
  async transfer(request: TransferRequest): Promise<TransferResult> {
    const { senderId, recipientId, amount, note, tipType } = request;

    // Validation
    if (senderId === recipientId) {
      throw new ValidationError('Cannot transfer credits to yourself');
    }

    if (amount <= 0 || amount > 1000000) {
      throw new ValidationError('Transfer amount must be between 1 and 1,000,000');
    }

    // Check both wallets can transact
    const senderCheck = await this.canTransact(senderId);
    if (!senderCheck.allowed) {
      throw new ForbiddenError(senderCheck.reason);
    }

    const recipientCheck = await this.canTransact(recipientId);
    if (!recipientCheck.allowed) {
      throw new ValidationError('Recipient wallet is not available for transfers');
    }

    // Check rate limits
    const withinLimits = await this.checkTransferRateLimit(senderId);
    if (!withinLimits.allowed) {
      throw new ValidationError(withinLimits.reason || 'Transfer rate limit exceeded');
    }

    // Run anti-abuse pre-transfer checks
    const abuseCheck = await antiabuseService.preTransferCheck(senderId, recipientId, amount);
    if (!abuseCheck.allowed) {
      throw new ForbiddenError(abuseCheck.reason || 'Transfer blocked for review');
    }

    // Verify recipient exists
    const recipient = await queryOne<{ id: string }>('SELECT id FROM users WHERE id = $1', [recipientId]);
    if (!recipient) {
      throw new NotFoundError('Recipient not found');
    }

    await this.ensureWallet(senderId);
    await this.ensureWallet(recipientId);

    const transferId = `xfer_${crypto.randomBytes(12).toString('hex')}`;

    try {
      const result = await serializableTransaction(async (client) => {
        // Lock sender balance
        const sender = await client.query<{ balance: number; version: number; status: string }>(
          'SELECT balance, version, COALESCE(status, \'active\') as status FROM credit_balances WHERE user_id = $1 FOR UPDATE',
          [senderId]
        );

        if (sender.rows.length === 0) {
          throw new NotFoundError('Sender wallet not found');
        }

        if (sender.rows[0].status !== 'active') {
          throw new ForbiddenError('Sender wallet is not active');
        }

        if (sender.rows[0].balance < amount) {
          throw new ValidationError('Insufficient credits for transfer');
        }

        // Lock recipient balance
        const recipientBal = await client.query<{ balance: number; version: number }>(
          'SELECT balance, version FROM credit_balances WHERE user_id = $1 FOR UPDATE',
          [recipientId]
        );

        const senderNewBalance = sender.rows[0].balance - amount;
        const recipientNewBalance = (recipientBal.rows[0]?.balance || 0) + amount;

        // Create ledger entries
        const senderEntryId = `txn_${crypto.randomBytes(12).toString('hex')}`;
        const recipientEntryId = `txn_${crypto.randomBytes(12).toString('hex')}`;

        // Debit sender
        await client.query(
          `UPDATE credit_balances
           SET balance = $1, lifetime_spent = lifetime_spent + $2,
               total_transferred_out = COALESCE(total_transferred_out, 0) + $2,
               version = version + 1, updated_at = NOW()
           WHERE user_id = $3`,
          [senderNewBalance, amount, senderId]
        );

        await client.query(
          `INSERT INTO credit_ledger (id, user_id, action, amount, balance_after, metadata, idempotency_key)
           VALUES ($1, $2, 'transfer_out', $3, $4, $5, $6)`,
          [senderEntryId, senderId, -amount, senderNewBalance, JSON.stringify({ transferId, recipientId, note, tipType }), `transfer-out-${transferId}`]
        );

        // Credit recipient
        await client.query(
          `UPDATE credit_balances
           SET balance = $1, lifetime_earned = lifetime_earned + $2,
               total_transferred_in = COALESCE(total_transferred_in, 0) + $2,
               version = version + 1, updated_at = NOW()
           WHERE user_id = $3`,
          [recipientNewBalance, amount, recipientId]
        );

        await client.query(
          `INSERT INTO credit_ledger (id, user_id, action, amount, balance_after, metadata, idempotency_key)
           VALUES ($1, $2, 'transfer_in', $3, $4, $5, $6)`,
          [recipientEntryId, recipientId, amount, recipientNewBalance, JSON.stringify({ transferId, senderId, note, tipType }), `transfer-in-${transferId}`]
        );

        // Record the transfer
        await client.query(
          `INSERT INTO credit_transfers (id, sender_id, recipient_id, amount, note, sender_ledger_id, recipient_ledger_id, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed')`,
          [transferId, senderId, recipientId, amount, note, senderEntryId, recipientEntryId]
        );

        return { senderNewBalance, recipientNewBalance };
      });

      // Invalidate caches
      await Promise.all([
        invalidateBalanceCache(senderId),
        invalidateBalanceCache(recipientId),
      ]);

      // Update rate limits
      await this.recordTransfer(senderId);

      log.info({
        transferId,
        senderId,
        recipientId,
        amount,
        tipType,
      }, 'Credit transfer completed');

      return {
        transferId,
        senderNewBalance: result.senderNewBalance,
        recipientNewBalance: result.recipientNewBalance,
      };
    } catch (error: any) {
      if (error.message?.includes('Insufficient')) {
        throw new ValidationError('Insufficient credits for transfer');
      }
      log.error({ senderId, recipientId, amount, error }, 'Credit transfer failed');
      throw error;
    }
  },

  /**
   * Freeze a wallet (admin action)
   */
  async freezeWallet(userId: string, adminUserId: string, reason: string): Promise<void> {
    await query(
      `UPDATE credit_balances
       SET status = 'frozen', frozen_at = NOW(), frozen_reason = $1
       WHERE user_id = $2`,
      [reason, userId]
    );

    // Audit log
    await this.logAdminAction({
      adminUserId,
      action: 'freeze_wallet',
      targetUserId: userId,
      reason,
    });

    await invalidateBalanceCache(userId);

    log.info({ userId, adminUserId, reason }, 'Wallet frozen');
  },

  /**
   * Unfreeze a wallet (admin action)
   */
  async unfreezeWallet(userId: string, adminUserId: string, reason: string): Promise<void> {
    await query(
      `UPDATE credit_balances
       SET status = 'active', frozen_at = NULL, frozen_reason = NULL
       WHERE user_id = $1`,
      [userId]
    );

    // Audit log
    await this.logAdminAction({
      adminUserId,
      action: 'unfreeze_wallet',
      targetUserId: userId,
      reason,
    });

    await invalidateBalanceCache(userId);

    log.info({ userId, adminUserId, reason }, 'Wallet unfrozen');
  },

  /**
   * Reverse a transaction (admin action)
   */
  async reverseTransaction(request: ReverseRequest): Promise<ReverseResult> {
    const { transactionId, adminUserId, reason } = request;

    // Find the original transaction
    const original = await queryOne<{
      id: string;
      user_id: string;
      amount: number;
      action: string;
      balance_after: number;
    }>('SELECT id, user_id, amount, action, balance_after FROM credit_ledger WHERE id = $1', [transactionId]);

    if (!original) {
      throw new NotFoundError('Transaction not found');
    }

    // Check if already reversed
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM credit_ledger WHERE metadata->>\'reversedTransactionId\' = $1',
      [transactionId]
    );

    if (existing) {
      throw new ValidationError('Transaction has already been reversed');
    }

    const reversalAmount = -original.amount; // Reverse the original amount
    const reversalId = `txn_${crypto.randomBytes(12).toString('hex')}`;

    const result = await serializableTransaction(async (client) => {
      // Get current balance
      const bal = await client.query<{ balance: number; version: number }>(
        'SELECT balance, version FROM credit_balances WHERE user_id = $1 FOR UPDATE',
        [original.user_id]
      );

      if (bal.rows.length === 0) {
        throw new NotFoundError('User wallet not found');
      }

      const newBalance = bal.rows[0].balance + reversalAmount;

      // Prevent negative balance
      if (newBalance < 0) {
        throw new ValidationError('Reversal would result in negative balance');
      }

      // Update balance
      if (reversalAmount > 0) {
        await client.query(
          `UPDATE credit_balances
           SET balance = $1, lifetime_earned = lifetime_earned + $2, version = version + 1, updated_at = NOW()
           WHERE user_id = $3`,
          [newBalance, reversalAmount, original.user_id]
        );
      } else {
        await client.query(
          `UPDATE credit_balances
           SET balance = $1, lifetime_spent = lifetime_spent + $2, version = version + 1, updated_at = NOW()
           WHERE user_id = $3`,
          [newBalance, Math.abs(reversalAmount), original.user_id]
        );
      }

      // Create reversal ledger entry
      await client.query(
        `INSERT INTO credit_ledger (id, user_id, action, amount, balance_after, metadata, idempotency_key)
         VALUES ($1, $2, 'reversal', $3, $4, $5, $6)`,
        [reversalId, original.user_id, reversalAmount, newBalance,
         JSON.stringify({ reversedTransactionId: transactionId, adminUserId, reason }),
         `reversal-${transactionId}`]
      );

      return { newBalance };
    });

    // Audit log
    await this.logAdminAction({
      adminUserId,
      action: 'reverse_transaction',
      targetUserId: original.user_id,
      targetTxId: transactionId,
      amount: reversalAmount,
      reason,
    });

    await invalidateBalanceCache(original.user_id);

    log.info({
      reversalId,
      originalTxId: transactionId,
      userId: original.user_id,
      reversedAmount: reversalAmount,
      adminUserId,
    }, 'Transaction reversed');

    return {
      reversalId,
      reversedAmount: Math.abs(reversalAmount),
      newBalance: result.newBalance,
    };
  },

  /**
   * Manual credit adjustment (admin action)
   */
  async adminAdjust(params: {
    userId: string;
    amount: number;
    adminUserId: string;
    reason: string;
  }): Promise<{ entryId: string; newBalance: number }> {
    const { userId, amount, adminUserId, reason } = params;

    await this.ensureWallet(userId);

    const entryId = `txn_${crypto.randomBytes(12).toString('hex')}`;
    const action = amount >= 0 ? 'admin_credit' : 'admin_debit';

    const result = await serializableTransaction(async (client) => {
      const bal = await client.query<{ balance: number; version: number }>(
        'SELECT balance, version FROM credit_balances WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      const currentBalance = bal.rows[0]?.balance || 0;
      const newBalance = currentBalance + amount;

      if (newBalance < 0) {
        throw new ValidationError('Adjustment would result in negative balance');
      }

      // Update balance
      if (amount >= 0) {
        await client.query(
          `UPDATE credit_balances
           SET balance = $1, lifetime_earned = lifetime_earned + $2, version = version + 1, updated_at = NOW()
           WHERE user_id = $3`,
          [newBalance, amount, userId]
        );
      } else {
        await client.query(
          `UPDATE credit_balances
           SET balance = $1, lifetime_spent = lifetime_spent + $2, version = version + 1, updated_at = NOW()
           WHERE user_id = $3`,
          [newBalance, Math.abs(amount), userId]
        );
      }

      // Create ledger entry
      await client.query(
        `INSERT INTO credit_ledger (id, user_id, action, amount, balance_after, metadata, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [entryId, userId, action, amount, newBalance, JSON.stringify({ adminUserId, reason }), `admin-${entryId}`]
      );

      return { newBalance };
    });

    // Audit log
    await this.logAdminAction({
      adminUserId,
      action: amount >= 0 ? 'manual_credit' : 'manual_debit',
      targetUserId: userId,
      targetTxId: entryId,
      amount,
      reason,
    });

    await invalidateBalanceCache(userId);

    log.info({ entryId, userId, amount, adminUserId, reason }, 'Admin credit adjustment');

    return { entryId, newBalance: result.newBalance };
  },

  /**
   * Get transaction history with enhanced filtering
   */
  async getTransactionHistory(userId: string, options: {
    limit?: number;
    offset?: number;
    action?: string;
    fromDate?: Date;
    toDate?: Date;
  } = {}): Promise<{
    transactions: Array<{
      id: string;
      action: string;
      amount: number;
      balanceAfter: number;
      metadata: Record<string, unknown> | null;
      createdAt: Date;
    }>;
    total: number;
  }> {
    const { limit = 50, offset = 0, action, fromDate, toDate } = options;

    let whereClause = 'user_id = $1';
    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (action) {
      whereClause += ` AND action = $${paramIndex++}`;
      params.push(action);
    }

    if (fromDate) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      params.push(fromDate);
    }

    if (toDate) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      params.push(toDate);
    }

    params.push(limit, offset);

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
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM credit_ledger WHERE ${whereClause}`,
      params.slice(0, -2)
    );

    return {
      transactions: rows.map((row) => ({
        id: row.id,
        action: row.action,
        amount: row.amount,
        balanceAfter: row.balance_after,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
        createdAt: row.created_at,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  /**
   * Get transfer history
   */
  async getTransferHistory(userId: string, options: {
    direction?: 'sent' | 'received' | 'all';
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    transfers: Array<{
      id: string;
      senderId: string;
      recipientId: string;
      amount: number;
      note?: string;
      status: string;
      createdAt: Date;
      direction: 'sent' | 'received';
    }>;
    total: number;
  }> {
    const { direction = 'all', limit = 50, offset = 0 } = options;

    let whereClause = '';
    if (direction === 'sent') {
      whereClause = 'sender_id = $1';
    } else if (direction === 'received') {
      whereClause = 'recipient_id = $1';
    } else {
      whereClause = '(sender_id = $1 OR recipient_id = $1)';
    }

    const rows = await queryAll<{
      id: string;
      sender_id: string;
      recipient_id: string;
      amount: number;
      note: string | null;
      status: string;
      created_at: Date;
    }>(
      `SELECT id, sender_id, recipient_id, amount, note, status, created_at
       FROM credit_transfers
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM credit_transfers WHERE ${whereClause}`,
      [userId]
    );

    return {
      transfers: rows.map((row) => ({
        id: row.id,
        senderId: row.sender_id,
        recipientId: row.recipient_id,
        amount: row.amount,
        note: row.note ?? undefined,
        status: row.status,
        createdAt: row.created_at,
        direction: row.sender_id === userId ? 'sent' : 'received',
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  /**
   * Check transfer rate limits
   */
  async checkTransferRateLimit(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    // Ensure rate limit record exists
    await query(
      `INSERT INTO economy_rate_limits (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    // Reset if needed
    await query(
      `UPDATE economy_rate_limits
       SET transfers_today = 0, daily_reset_at = CURRENT_DATE
       WHERE user_id = $1 AND daily_reset_at < CURRENT_DATE`,
      [userId]
    );

    await query(
      `UPDATE economy_rate_limits
       SET transfers_this_hour = 0, hourly_reset_at = NOW()
       WHERE user_id = $1 AND hourly_reset_at < NOW() - INTERVAL '1 hour'`,
      [userId]
    );

    const limits = await queryOne<{
      transfers_today: number;
      transfers_this_hour: number;
    }>('SELECT transfers_today, transfers_this_hour FROM economy_rate_limits WHERE user_id = $1', [userId]);

    if ((limits?.transfers_this_hour || 0) >= 10) {
      return { allowed: false, reason: 'Transfer limit exceeded: 10 per hour' };
    }

    if ((limits?.transfers_today || 0) >= 50) {
      return { allowed: false, reason: 'Transfer limit exceeded: 50 per day' };
    }

    return { allowed: true };
  },

  /**
   * Record a transfer for rate limiting
   */
  async recordTransfer(userId: string): Promise<void> {
    await query(
      `UPDATE economy_rate_limits
       SET transfers_today = transfers_today + 1,
           transfers_this_hour = transfers_this_hour + 1,
           last_transfer_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );
  },

  /**
   * Log admin action for audit
   */
  async logAdminAction(params: {
    adminUserId: string;
    action: string;
    targetUserId?: string;
    targetTxId?: string;
    amount?: number;
    reason: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await query(
      `INSERT INTO admin_credit_audit_log (admin_user_id, action, target_user_id, target_tx_id, amount, reason, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        params.adminUserId,
        params.action,
        params.targetUserId || null,
        params.targetTxId || null,
        params.amount || null,
        params.reason,
        params.details ? JSON.stringify(params.details) : '{}',
        params.ipAddress || null,
        params.userAgent || null,
      ]
    );
  },

  // Re-export core methods from creditService for convenience
  getBalance: creditService.getBalance.bind(creditService),
  charge: creditService.charge.bind(creditService),
  addCredits: creditService.addCredits.bind(creditService),
  canAfford: creditService.canAfford.bind(creditService),
  initializeBalance: creditService.initializeBalance.bind(creditService),
};

export default walletService;
