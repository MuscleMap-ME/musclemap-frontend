/**
 * Entitlements Module
 *
 * Determines user access based on:
 * 1. Trial period (first 90 days free)
 * 2. Active subscription ($1/month)
 * 3. Credit balance (for non-subscribers after trial)
 */

import { db, transaction } from '../../db/client';
import { loggers } from '../../lib/logger';
import crypto from 'crypto';

const log = loggers.entitlements;

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
  cancel_at_period_end: boolean;
}

const INITIAL_FREE_CREDITS = 150;

export const entitlementsService = {
  /**
   * Get user's current entitlements
   */
  async getEntitlements(userId: string): Promise<Entitlements> {
    // Get user trial info
    const user = await db.queryOne<UserTrialInfo>(
      'SELECT trial_started_at, trial_ends_at FROM users WHERE id = $1',
      [userId]
    );

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
    const subscription = await db.queryOne<SubscriptionInfo>(
      'SELECT status, current_period_end, cancel_at_period_end FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

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
    await this.grantInitialCreditsIfNeeded(userId);

    const balance = await db.queryOne<{ balance: number }>(
      'SELECT balance FROM credit_balances WHERE user_id = $1',
      [userId]
    );

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
  async grantInitialCreditsIfNeeded(userId: string): Promise<boolean> {
    return transaction(async (client) => {
      // Check if they already received the initial grant
      const existingGrantResult = await client.query(
        "SELECT id FROM credit_ledger WHERE user_id = $1 AND action = 'initial_grant_150'",
        [userId]
      );

      if (existingGrantResult.rows[0]) {
        return false; // Already granted
      }

      // Get current balance
      const balanceResult = await client.query(
        'SELECT balance, version FROM credit_balances WHERE user_id = $1',
        [userId]
      );
      const balanceRow = balanceResult.rows[0] as { balance: number; version: number } | undefined;

      if (!balanceRow) {
        // Create credit account if it doesn't exist
        await client.query(
          'INSERT INTO credit_balances (user_id, balance, lifetime_earned) VALUES ($1, $2, $3)',
          [userId, INITIAL_FREE_CREDITS, INITIAL_FREE_CREDITS]
        );
      } else {
        // Add to existing balance
        const newBalance = balanceRow.balance + INITIAL_FREE_CREDITS;
        await client.query(
          'UPDATE credit_balances SET balance = $1, lifetime_earned = lifetime_earned + $2, version = version + 1 WHERE user_id = $3 AND version = $4',
          [newBalance, INITIAL_FREE_CREDITS, userId, balanceRow.version]
        );
      }

      // Record the grant in ledger
      const entryId = `txn_${crypto.randomBytes(12).toString('hex')}`;
      const newBalance = (balanceRow?.balance ?? 0) + INITIAL_FREE_CREDITS;

      await client.query(
        'INSERT INTO credit_ledger (id, user_id, action, amount, balance_after, metadata, idempotency_key) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          entryId,
          userId,
          'initial_grant_150',
          INITIAL_FREE_CREDITS,
          newBalance,
          JSON.stringify({ reason: 'Trial ended - initial credits grant' }),
          `initial_grant_${userId}`,
        ]
      );

      log.info('Granted initial 150 credits', { userId });
      return true;
    });
  },

  /**
   * Check if user can perform an action (has unlimited access or sufficient credits)
   */
  async canPerformAction(userId: string, creditCost: number): Promise<{ allowed: boolean; reason: string }> {
    const entitlements = await this.getEntitlements(userId);

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
