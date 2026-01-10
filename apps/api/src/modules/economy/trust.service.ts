/**
 * Trust Tier Service
 *
 * Manages user trust levels based on account age, activity, and verification.
 * Trust tiers gate transfer limits and other economy features.
 */

import { queryOne, queryAll, query } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.economy;

// Types
export interface TrustTier {
  tier: number;
  name: string;
  description: string;
  minAccountAgeDays: number;
  minWorkouts: number;
  minCreditsEarned: number;
  requiresEmailVerified: boolean;
  requiresPhoneVerified: boolean;
  dailyTransferLimit: number;
  singleTransferLimit: number;
  canReceiveTransfers: boolean;
  canSendTransfers: boolean;
  canCreateClasses: boolean;
  canHostHangouts: boolean;
}

export interface UserTrustInfo {
  userId: string;
  currentTier: number;
  tierName: string;
  accountAgeDays: number;
  workoutCount: number;
  creditsEarned: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  manualOverride: boolean;
  limits: {
    dailyTransferLimit: number;
    singleTransferLimit: number;
    canSendTransfers: boolean;
    canReceiveTransfers: boolean;
    canCreateClasses: boolean;
    canHostHangouts: boolean;
  };
  nextTierProgress: {
    nextTier: number;
    nextTierName: string;
    requirements: {
      accountAgeDays: { current: number; required: number; met: boolean };
      workouts: { current: number; required: number; met: boolean };
      creditsEarned: { current: number; required: number; met: boolean };
      emailVerified: { current: boolean; required: boolean; met: boolean };
    };
    overallProgress: number;
  } | null;
}

export const trustService = {
  /**
   * Get all trust tier definitions
   */
  async getTiers(): Promise<TrustTier[]> {
    const rows = await queryAll<{
      tier: number;
      name: string;
      description: string | null;
      min_account_age_days: number;
      min_workouts: number;
      min_credits_earned: number;
      requires_email_verified: boolean;
      requires_phone_verified: boolean;
      daily_transfer_limit: number;
      single_transfer_limit: number;
      can_receive_transfers: boolean;
      can_send_transfers: boolean;
      can_create_classes: boolean;
      can_host_hangouts: boolean;
    }>(`SELECT * FROM trust_tiers ORDER BY tier ASC`);

    return rows.map((r) => ({
      tier: r.tier,
      name: r.name,
      description: r.description || '',
      minAccountAgeDays: r.min_account_age_days,
      minWorkouts: r.min_workouts,
      minCreditsEarned: r.min_credits_earned,
      requiresEmailVerified: r.requires_email_verified,
      requiresPhoneVerified: r.requires_phone_verified,
      dailyTransferLimit: r.daily_transfer_limit,
      singleTransferLimit: r.single_transfer_limit,
      canReceiveTransfers: r.can_receive_transfers,
      canSendTransfers: r.can_send_transfers,
      canCreateClasses: r.can_create_classes,
      canHostHangouts: r.can_host_hangouts,
    }));
  },

  /**
   * Calculate user's trust tier based on their activity
   */
  async calculateTier(userId: string): Promise<UserTrustInfo> {
    // Get user data
    const userData = await queryOne<{
      id: string;
      email_verified: boolean;
      phone_verified: boolean;
      created_at: Date;
    }>(`SELECT id, email_verified, COALESCE(phone_verified, FALSE) as phone_verified, created_at FROM users WHERE id = $1`, [userId]);

    if (!userData) {
      throw new Error('User not found');
    }

    // Get workout count
    const workoutData = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM workouts WHERE user_id = $1 AND completed_at IS NOT NULL`,
      [userId]
    );

    // Get credits earned
    const creditsData = await queryOne<{ total: string }>(
      `SELECT COALESCE(lifetime_earned, 0) as total FROM credit_balances WHERE user_id = $1`,
      [userId]
    );

    // Check for manual override
    const override = await queryOne<{ manual_override_tier: number | null }>(
      `SELECT manual_override_tier FROM user_trust_tiers WHERE user_id = $1`,
      [userId]
    );

    const accountAgeDays = Math.floor((Date.now() - new Date(userData.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const workoutCount = parseInt(workoutData?.count || '0');
    const creditsEarned = parseInt(creditsData?.total || '0');
    const emailVerified = userData.email_verified;
    const phoneVerified = userData.phone_verified;

    // Get all tiers
    const tiers = await this.getTiers();

    // Find highest qualifying tier
    let currentTier = 0;
    for (const tier of tiers) {
      const meetsAge = accountAgeDays >= tier.minAccountAgeDays;
      const meetsWorkouts = workoutCount >= tier.minWorkouts;
      const meetsCredits = creditsEarned >= tier.minCreditsEarned;
      const meetsEmail = !tier.requiresEmailVerified || emailVerified;
      const meetsPhone = !tier.requiresPhoneVerified || phoneVerified;

      if (meetsAge && meetsWorkouts && meetsCredits && meetsEmail && meetsPhone) {
        currentTier = tier.tier;
      }
    }

    // Apply manual override if exists
    const effectiveTier = override?.manual_override_tier ?? currentTier;
    const tierInfo = tiers.find((t) => t.tier === effectiveTier) || tiers[0];

    // Calculate next tier progress
    let nextTierProgress: UserTrustInfo['nextTierProgress'] = null;
    const nextTier = tiers.find((t) => t.tier === effectiveTier + 1);
    if (nextTier) {
      const ageMet = accountAgeDays >= nextTier.minAccountAgeDays;
      const workoutsMet = workoutCount >= nextTier.minWorkouts;
      const creditsMet = creditsEarned >= nextTier.minCreditsEarned;
      const emailMet = !nextTier.requiresEmailVerified || emailVerified;

      const requirements = [
        ageMet ? 1 : accountAgeDays / nextTier.minAccountAgeDays,
        workoutsMet ? 1 : workoutCount / nextTier.minWorkouts,
        creditsMet ? 1 : creditsEarned / nextTier.minCreditsEarned,
        emailMet ? 1 : 0,
      ];

      nextTierProgress = {
        nextTier: nextTier.tier,
        nextTierName: nextTier.name,
        requirements: {
          accountAgeDays: { current: accountAgeDays, required: nextTier.minAccountAgeDays, met: ageMet },
          workouts: { current: workoutCount, required: nextTier.minWorkouts, met: workoutsMet },
          creditsEarned: { current: creditsEarned, required: nextTier.minCreditsEarned, met: creditsMet },
          emailVerified: { current: emailVerified, required: nextTier.requiresEmailVerified, met: emailMet },
        },
        overallProgress: Math.min(100, Math.round((requirements.reduce((a, b) => a + b, 0) / 4) * 100)),
      };
    }

    // Update cached tier
    await query(
      `INSERT INTO user_trust_tiers (user_id, current_tier, account_age_days, workout_count, credits_earned, email_verified, phone_verified, next_tier_progress, calculated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         current_tier = COALESCE(user_trust_tiers.manual_override_tier, $2),
         account_age_days = $3,
         workout_count = $4,
         credits_earned = $5,
         email_verified = $6,
         phone_verified = $7,
         next_tier_progress = $8,
         calculated_at = NOW()`,
      [userId, currentTier, accountAgeDays, workoutCount, creditsEarned, emailVerified, phoneVerified, JSON.stringify(nextTierProgress)]
    );

    return {
      userId,
      currentTier: effectiveTier,
      tierName: tierInfo.name,
      accountAgeDays,
      workoutCount,
      creditsEarned,
      emailVerified,
      phoneVerified,
      manualOverride: override?.manual_override_tier !== null,
      limits: {
        dailyTransferLimit: tierInfo.dailyTransferLimit,
        singleTransferLimit: tierInfo.singleTransferLimit,
        canSendTransfers: tierInfo.canSendTransfers,
        canReceiveTransfers: tierInfo.canReceiveTransfers,
        canCreateClasses: tierInfo.canCreateClasses,
        canHostHangouts: tierInfo.canHostHangouts,
      },
      nextTierProgress,
    };
  },

  /**
   * Get user's current trust info (from cache or calculate)
   */
  async getUserTrust(userId: string): Promise<UserTrustInfo> {
    // Check cache freshness (recalculate if older than 1 hour)
    const cached = await queryOne<{ calculated_at: Date }>(
      `SELECT calculated_at FROM user_trust_tiers WHERE user_id = $1`,
      [userId]
    );

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (!cached || new Date(cached.calculated_at) < oneHourAgo) {
      return this.calculateTier(userId);
    }

    // Return cached data
    return this.calculateTier(userId); // For now, always recalculate for accuracy
  },

  /**
   * Check if user can perform a transfer
   */
  async canTransfer(senderId: string, recipientId: string, amount: number): Promise<{
    allowed: boolean;
    reason?: string;
    senderTier: number;
    recipientTier: number;
  }> {
    const [senderTrust, recipientTrust] = await Promise.all([
      this.getUserTrust(senderId),
      this.getUserTrust(recipientId),
    ]);

    // Check sender can send
    if (!senderTrust.limits.canSendTransfers) {
      return {
        allowed: false,
        reason: `Your account (${senderTrust.tierName}) cannot send transfers yet. Complete more workouts to unlock.`,
        senderTier: senderTrust.currentTier,
        recipientTier: recipientTrust.currentTier,
      };
    }

    // Check recipient can receive
    if (!recipientTrust.limits.canReceiveTransfers) {
      return {
        allowed: false,
        reason: `Recipient cannot receive transfers at this time.`,
        senderTier: senderTrust.currentTier,
        recipientTier: recipientTrust.currentTier,
      };
    }

    // Check single transfer limit
    if (amount > senderTrust.limits.singleTransferLimit) {
      return {
        allowed: false,
        reason: `Amount exceeds your single transfer limit of ${senderTrust.limits.singleTransferLimit} credits.`,
        senderTier: senderTrust.currentTier,
        recipientTier: recipientTrust.currentTier,
      };
    }

    // Check daily limit
    const todayTransfers = await queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM credit_transfers
       WHERE sender_id = $1 AND created_at >= CURRENT_DATE AND status = 'completed'`,
      [senderId]
    );
    const todayTotal = parseInt(todayTransfers?.total || '0');

    if (todayTotal + amount > senderTrust.limits.dailyTransferLimit) {
      return {
        allowed: false,
        reason: `Transfer would exceed your daily limit of ${senderTrust.limits.dailyTransferLimit} credits.`,
        senderTier: senderTrust.currentTier,
        recipientTier: recipientTrust.currentTier,
      };
    }

    return {
      allowed: true,
      senderTier: senderTrust.currentTier,
      recipientTier: recipientTrust.currentTier,
    };
  },

  /**
   * Admin: Set manual override tier
   */
  async setOverrideTier(userId: string, tier: number, adminId: string, reason: string): Promise<void> {
    await query(
      `INSERT INTO user_trust_tiers (user_id, current_tier, manual_override_tier, override_reason, override_by, override_at)
       VALUES ($1, $2, $2, $3, $4, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         manual_override_tier = $2,
         current_tier = $2,
         override_reason = $3,
         override_by = $4,
         override_at = NOW()`,
      [userId, tier, reason, adminId]
    );

    log.info({ userId, tier, adminId }, 'Trust tier override set');
  },

  /**
   * Admin: Clear manual override
   */
  async clearOverride(userId: string, adminId: string): Promise<void> {
    await query(
      `UPDATE user_trust_tiers SET
         manual_override_tier = NULL,
         override_reason = NULL,
         override_by = NULL,
         override_at = NULL
       WHERE user_id = $1`,
      [userId]
    );

    // Recalculate actual tier
    await this.calculateTier(userId);

    log.info({ userId, adminId }, 'Trust tier override cleared');
  },
};

export default trustService;
