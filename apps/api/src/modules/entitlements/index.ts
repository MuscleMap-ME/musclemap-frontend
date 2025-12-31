/**
 * Entitlements Module
 *
 * Determines user access based on:
 * 1. Trial period (first 90 days free)
 * 2. Active subscription ($1/month)
 * 3. Credit balance (for non-subscribers after trial)
 */

import { Router, Request, Response } from 'express';
import { db, transaction } from '../../db/client';
import { authenticateToken } from '../auth';
import { asyncHandler } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import crypto from 'crypto';

const log = loggers.economy;

export interface Entitlements {
  unlimited: boolean;
  creditsVisible: boolean;
  creditBalance: number | null;
  reason: 'trial' | 'subscribed' | 'credits';
  trialEndsAt: string | null;
  subscriptionStatus: string | null;
  daysLeftInTrial: number | null;
}

interface UserTrialInfo {
  trial_started_at: string | null;
  trial_ends_at: string | null;
}

interface SubscriptionInfo {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: number;
}

const INITIAL_FREE_CREDITS = 150;

export const entitlementsService = {
  /**
   * Get user's current entitlements
   */
  getEntitlements(userId: string): Entitlements {
    // Get user trial info
    const user = db.prepare(
      'SELECT trial_started_at, trial_ends_at FROM users WHERE id = ?'
    ).get(userId) as UserTrialInfo | undefined;

    if (!user) {
      return {
        unlimited: false,
        creditsVisible: true,
        creditBalance: 0,
        reason: 'credits',
        trialEndsAt: null,
        subscriptionStatus: null,
        daysLeftInTrial: null,
      };
    }

    // Check for active subscription first
    const subscription = db.prepare(
      'SELECT status, current_period_end, cancel_at_period_end FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(userId) as SubscriptionInfo | undefined;

    if (subscription?.status === 'active') {
      return {
        unlimited: true,
        creditsVisible: false,
        creditBalance: null,
        reason: 'subscribed',
        trialEndsAt: user.trial_ends_at,
        subscriptionStatus: 'active',
        daysLeftInTrial: null,
      };
    }

    // Check if still in trial period
    const now = new Date();
    const trialEndsAt = user.trial_ends_at ? new Date(user.trial_ends_at) : null;

    if (trialEndsAt && now < trialEndsAt) {
      const daysLeft = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        unlimited: true,
        creditsVisible: false,
        creditBalance: null,
        reason: 'trial',
        trialEndsAt: user.trial_ends_at,
        subscriptionStatus: subscription?.status || null,
        daysLeftInTrial: daysLeft,
      };
    }

    // Trial ended, not subscribed - use credits
    // Grant 150 free credits if they haven't received them yet
    this.grantInitialCreditsIfNeeded(userId);

    const balance = db.prepare(
      'SELECT balance FROM credit_balances WHERE user_id = ?'
    ).get(userId) as { balance: number } | undefined;

    return {
      unlimited: false,
      creditsVisible: true,
      creditBalance: balance?.balance ?? 0,
      reason: 'credits',
      trialEndsAt: user.trial_ends_at,
      subscriptionStatus: subscription?.status || null,
      daysLeftInTrial: 0,
    };
  },

  /**
   * Grant 150 free credits when user first enters credit mode (after trial ends)
   * This is idempotent - only grants once
   */
  grantInitialCreditsIfNeeded(userId: string): boolean {
    return transaction(() => {
      // Check if they already received the initial grant
      const existingGrant = db.prepare(
        "SELECT id FROM credit_ledger WHERE user_id = ? AND action = 'initial_grant_150'"
      ).get(userId);

      if (existingGrant) {
        return false; // Already granted
      }

      // Get current balance
      const balanceRow = db.prepare(
        'SELECT balance, version FROM credit_balances WHERE user_id = ?'
      ).get(userId) as { balance: number; version: number } | undefined;

      if (!balanceRow) {
        // Create credit account if it doesn't exist
        db.prepare(
          'INSERT INTO credit_balances (user_id, balance, lifetime_earned) VALUES (?, ?, ?)'
        ).run(userId, INITIAL_FREE_CREDITS, INITIAL_FREE_CREDITS);
      } else {
        // Add to existing balance
        const newBalance = balanceRow.balance + INITIAL_FREE_CREDITS;
        db.prepare(
          'UPDATE credit_balances SET balance = ?, lifetime_earned = lifetime_earned + ?, version = version + 1 WHERE user_id = ? AND version = ?'
        ).run(newBalance, INITIAL_FREE_CREDITS, userId, balanceRow.version);
      }

      // Record the grant in ledger
      const entryId = `txn_${crypto.randomBytes(12).toString('hex')}`;
      const newBalance = (balanceRow?.balance ?? 0) + INITIAL_FREE_CREDITS;

      db.prepare(
        'INSERT INTO credit_ledger (id, user_id, action, amount, balance_after, metadata, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(
        entryId,
        userId,
        'initial_grant_150',
        INITIAL_FREE_CREDITS,
        newBalance,
        JSON.stringify({ reason: 'Trial ended - initial credits grant' }),
        `initial_grant_${userId}`
      );

      log.info('Granted initial 150 credits', { userId });
      return true;
    });
  },

  /**
   * Check if user can perform an action (has unlimited access or sufficient credits)
   */
  canPerformAction(userId: string, creditCost: number): { allowed: boolean; reason: string } {
    const entitlements = this.getEntitlements(userId);

    if (entitlements.unlimited) {
      return { allowed: true, reason: entitlements.reason };
    }

    if (entitlements.creditBalance !== null && entitlements.creditBalance >= creditCost) {
      return { allowed: true, reason: 'credits' };
    }

    return {
      allowed: false,
      reason: `Insufficient credits. Need ${creditCost}, have ${entitlements.creditBalance ?? 0}`,
    };
  },
};

export const entitlementsRouter = Router();

// Get current user's entitlements
entitlementsRouter.get('/', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const entitlements = entitlementsService.getEntitlements(req.user!.userId);
  res.json({ data: entitlements });
}));

// Alias for frontend convenience
entitlementsRouter.get('/me', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const entitlements = entitlementsService.getEntitlements(req.user!.userId);
  res.json({ data: entitlements });
}));
