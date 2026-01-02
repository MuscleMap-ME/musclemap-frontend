/**
 * Economy Module
 */

import { Router, Request, Response } from 'express';
import { db, transaction } from '../../db/client';
import { authenticateToken } from '../auth';
import { asyncHandler, InsufficientCreditsError, ValidationError, ConflictError } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import { PRICING_TIERS, PRICING_RATE } from '@musclemap/core';
import { z } from 'zod';
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
  async getBalance(userId: string): Promise<number> {
    const row = await db.queryOne<{ balance: number }>(
      'SELECT balance FROM credit_balances WHERE user_id = $1',
      [userId]
    );
    return row?.balance ?? 0;
  },

  async canCharge(userId: string, amount: number): Promise<boolean> {
    return (await this.getBalance(userId)) >= amount;
  },

  async charge(request: CreditChargeRequest): Promise<CreditChargeResult> {
    // Check if user has unlimited access (trial or subscription)
    const entitlements = await entitlementsService.getEntitlements(request.userId);

    if (entitlements.unlimited) {
      // User has unlimited access - don't charge credits, just log the action
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

    return transaction(async (client) => {
      const existingResult = await client.query(
        'SELECT id, balance_after FROM credit_ledger WHERE idempotency_key = $1',
        [request.idempotencyKey]
      );
      const existing = existingResult.rows[0];

      if (existing) {
        return { success: true, ledgerEntryId: existing.id, newBalance: existing.balance_after };
      }

      let cost = request.amount;
      if (cost === undefined) {
        const actionResult = await client.query(
          'SELECT default_cost FROM credit_actions WHERE id = $1 AND enabled = TRUE',
          [request.action]
        );
        const action = actionResult.rows[0];
        if (!action) return { success: false, error: `Unknown action: ${request.action}` };
        cost = action.default_cost;
      }

      // Use SELECT FOR UPDATE to lock the row and prevent concurrent modifications
      // This is more efficient than optimistic locking for high-contention scenarios
      const balanceResult = await client.query(
        'SELECT balance, version FROM credit_balances WHERE user_id = $1 FOR UPDATE',
        [request.userId]
      );
      const balance = balanceResult.rows[0];
      if (!balance) return { success: false, error: 'User has no credit account' };
      if (balance.balance < cost) return { success: false, error: 'Insufficient credits' };

      const newBalance = balance.balance - cost;
      const entryId = `txn_${crypto.randomBytes(12).toString('hex')}`;

      // No need for version check since we hold the row lock
      await client.query(
        `UPDATE credit_balances
         SET balance = $1, lifetime_spent = lifetime_spent + $2, version = version + 1, updated_at = NOW()
         WHERE user_id = $3`,
        [newBalance, cost, request.userId]
      );

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

      log.info('Credits charged', { userId: request.userId, action: request.action, amount: cost, newBalance });

      return { success: true, ledgerEntryId: entryId, newBalance };
    });
  },

  async getHistory(userId: string, limit: number = 50, offset: number = 0) {
    return db.queryAll(
      `SELECT id, action, amount, balance_after, metadata, created_at
       FROM credit_ledger WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
  },
};

export const economyRouter = Router();

economyRouter.get('/pricing', (req: Request, res: Response) => {
  res.json({ tiers: PRICING_TIERS, rate: PRICING_RATE });
});

economyRouter.get('/balance', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: { balance: await economyService.getBalance(req.user!.userId) } });
}));

economyRouter.get('/history', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const offset = parseInt(req.query.offset as string) || 0;
  const transactions = await economyService.getHistory(req.user!.userId, limit, offset);
  res.json({
    data: transactions.map((t: any) => ({ ...t, metadata: t.metadata || null })),
    meta: { limit, offset },
  });
}));

const chargeSchema = z.object({
  action: z.string(),
  amount: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  idempotencyKey: z.string(),
});

economyRouter.post('/charge', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const data = chargeSchema.parse(req.body);
  const result = await economyService.charge({
    userId: req.user!.userId,
    action: data.action,
    amount: data.amount,
    metadata: data.metadata,
    idempotencyKey: data.idempotencyKey,
  });

  if (!result.success) {
    if (result.error?.includes('Insufficient')) {
      throw new InsufficientCreditsError(data.amount || 0, await economyService.getBalance(req.user!.userId));
    }
    throw new ValidationError(result.error || 'Charge failed');
  }

  res.json({ data: result });
}));

economyRouter.get('/actions', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    data: await db.queryAll(
      'SELECT id, name, description, default_cost, plugin_id FROM credit_actions WHERE enabled = TRUE'
    ),
  });
}));
