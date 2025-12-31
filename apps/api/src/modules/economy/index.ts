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
  getBalance(userId: string): number {
    const row = db.prepare('SELECT balance FROM credit_balances WHERE user_id = ?').get(userId) as { balance: number } | undefined;
    return row?.balance ?? 0;
  },

  canCharge(userId: string, amount: number): boolean {
    return this.getBalance(userId) >= amount;
  },

  charge(request: CreditChargeRequest): CreditChargeResult {
    // Check if user has unlimited access (trial or subscription)
    const entitlements = entitlementsService.getEntitlements(request.userId);

    if (entitlements.unlimited) {
      // User has unlimited access - don't charge credits, just log the action
      log.info('Action performed with unlimited access', {
        userId: request.userId,
        action: request.action,
        reason: entitlements.reason
      });
      return {
        success: true,
        ledgerEntryId: undefined,
        newBalance: entitlements.creditBalance ?? undefined
      };
    }

    return transaction(() => {
      const existing = db.prepare('SELECT id, balance_after FROM credit_ledger WHERE idempotency_key = ?').get(request.idempotencyKey) as any;

      if (existing) {
        return { success: true, ledgerEntryId: existing.id, newBalance: existing.balance_after };
      }

      let cost = request.amount;
      if (cost === undefined) {
        const action = db.prepare('SELECT default_cost FROM credit_actions WHERE id = ? AND enabled = 1').get(request.action) as any;
        if (!action) return { success: false, error: `Unknown action: ${request.action}` };
        cost = action.default_cost;
      }

      const balance = db.prepare('SELECT balance, version FROM credit_balances WHERE user_id = ?').get(request.userId) as any;
      if (!balance) return { success: false, error: 'User has no credit account' };
      if (balance.balance < cost) return { success: false, error: 'Insufficient credits' };

      const newBalance = balance.balance - cost;
      const entryId = `txn_${crypto.randomBytes(12).toString('hex')}`;

      const result = db.prepare('UPDATE credit_balances SET balance = ?, lifetime_spent = lifetime_spent + ?, version = version + 1 WHERE user_id = ? AND version = ?').run(newBalance, cost, request.userId, balance.version);

      if (result.changes === 0) throw new ConflictError('Concurrent modification');

      db.prepare('INSERT INTO credit_ledger (id, user_id, action, amount, balance_after, metadata, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?)').run(entryId, request.userId, request.action, -cost, newBalance, request.metadata ? JSON.stringify(request.metadata) : null, request.idempotencyKey);

      log.info('Credits charged', { userId: request.userId, action: request.action, amount: cost, newBalance });

      return { success: true, ledgerEntryId: entryId, newBalance };
    });
  },

  getHistory(userId: string, limit: number = 50, offset: number = 0) {
    return db.prepare('SELECT id, action, amount, balance_after, metadata, created_at FROM credit_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(userId, limit, offset) as any[];
  },
};

export const economyRouter = Router();

economyRouter.get('/pricing', (req: Request, res: Response) => {
  res.json({ tiers: PRICING_TIERS, rate: PRICING_RATE });
});

economyRouter.get('/balance', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: { balance: economyService.getBalance(req.user!.userId) } });
}));

economyRouter.get('/history', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const offset = parseInt(req.query.offset as string) || 0;
  const transactions = economyService.getHistory(req.user!.userId, limit, offset);
  res.json({
    data: transactions.map((t: any) => ({ ...t, metadata: t.metadata ? JSON.parse(t.metadata) : null })),
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
  const result = economyService.charge({ 
    userId: req.user!.userId, 
    action: data.action,
    amount: data.amount,
    metadata: data.metadata,
    idempotencyKey: data.idempotencyKey
  });

  if (!result.success) {
    if (result.error?.includes('Insufficient')) {
      throw new InsufficientCreditsError(data.amount || 0, economyService.getBalance(req.user!.userId));
    }
    throw new ValidationError(result.error || 'Charge failed');
  }

  res.json({ data: result });
}));

economyRouter.get('/actions', asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: db.prepare('SELECT id, name, description, default_cost, plugin_id FROM credit_actions WHERE enabled = 1').all() });
}));
