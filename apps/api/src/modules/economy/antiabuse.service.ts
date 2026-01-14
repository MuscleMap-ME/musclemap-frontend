/**
 * Anti-Abuse Service
 *
 * Detects and prevents economic abuse:
 * - Velocity checks (too many transfers/actions)
 * - Unusual pattern detection
 * - Self-farming detection
 * - Bot detection
 * - Admin audit logging
 */

import crypto from 'crypto';
import { queryOne, queryAll, query } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.economy;

// Fraud flag types
export const FRAUD_FLAG_TYPES = {
  VELOCITY: 'velocity',
  SELF_FARMING: 'self_farming',
  SUSPICIOUS_PATTERN: 'suspicious_pattern',
  BOT_BEHAVIOR: 'bot_behavior',
  COLLUSION: 'collusion',
  MANUAL: 'manual',
} as const;

export type FraudFlagType = (typeof FRAUD_FLAG_TYPES)[keyof typeof FRAUD_FLAG_TYPES];

// Flag severities
export const FLAG_SEVERITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type FlagSeverity = (typeof FLAG_SEVERITIES)[keyof typeof FLAG_SEVERITIES];

// Flag statuses
export const FLAG_STATUSES = {
  OPEN: 'open',
  INVESTIGATING: 'investigating',
  RESOLVED_VALID: 'resolved_valid',
  RESOLVED_INVALID: 'resolved_invalid',
  ESCALATED: 'escalated',
} as const;

export type FlagStatus = (typeof FLAG_STATUSES)[keyof typeof FLAG_STATUSES];

export interface FraudFlag {
  id: string;
  userId: string;
  flagType: FraudFlagType;
  severity: FlagSeverity;
  description: string;
  metadata: Record<string, unknown>;
  status: FlagStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
}

export interface RateLimit {
  action: string;
  maxPerHour: number;
  maxPerDay: number;
  cooldownSeconds: number;
}

export interface VelocityCheck {
  action: string;
  count: number;
  limit: number;
  period: 'hour' | 'day';
  blocked: boolean;
}

export const antiabuseService = {
  // ============================================
  // RATE LIMITING
  // ============================================

  /**
   * Check if an action exceeds rate limits
   */
  async checkRateLimit(userId: string, action: string): Promise<{
    allowed: boolean;
    hourlyCount: number;
    hourlyLimit: number;
    dailyCount: number;
    dailyLimit: number;
    cooldownRemaining: number;
  }> {
    // Get rate limit config
    const config = await queryOne<{
      max_per_hour: number;
      max_per_day: number;
      cooldown_seconds: number;
    }>(
      'SELECT max_per_hour, max_per_day, cooldown_seconds FROM economy_rate_limits WHERE action = $1',
      [action]
    );

    // Default limits if not configured
    const maxPerHour = config?.max_per_hour ?? 100;
    const maxPerDay = config?.max_per_day ?? 500;
    const cooldownSeconds = config?.cooldown_seconds ?? 0;

    // Count hourly actions
    const hourlyResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM credit_ledger
       WHERE user_id = $1 AND action LIKE $2 || '%' AND created_at >= NOW() - INTERVAL '1 hour'`,
      [userId, action]
    );
    const hourlyCount = parseInt(hourlyResult?.count || '0', 10);

    // Count daily actions
    const dailyResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM credit_ledger
       WHERE user_id = $1 AND action LIKE $2 || '%' AND created_at >= NOW() - INTERVAL '24 hours'`,
      [userId, action]
    );
    const dailyCount = parseInt(dailyResult?.count || '0', 10);

    // Check cooldown
    let cooldownRemaining = 0;
    if (cooldownSeconds > 0) {
      const lastAction = await queryOne<{ created_at: Date }>(
        `SELECT created_at FROM credit_ledger
         WHERE user_id = $1 AND action LIKE $2 || '%'
         ORDER BY created_at DESC LIMIT 1`,
        [userId, action]
      );

      if (lastAction) {
        const elapsed = (Date.now() - lastAction.created_at.getTime()) / 1000;
        cooldownRemaining = Math.max(0, cooldownSeconds - elapsed);
      }
    }

    const allowed = hourlyCount < maxPerHour && dailyCount < maxPerDay && cooldownRemaining <= 0;

    return {
      allowed,
      hourlyCount,
      hourlyLimit: maxPerHour,
      dailyCount,
      dailyLimit: maxPerDay,
      cooldownRemaining: Math.ceil(cooldownRemaining),
    };
  },

  /**
   * Get all rate limit configurations
   */
  async getRateLimits(): Promise<RateLimit[]> {
    const rows = await queryAll<{
      action: string;
      max_per_hour: number;
      max_per_day: number;
      cooldown_seconds: number;
    }>('SELECT * FROM economy_rate_limits ORDER BY action');

    return rows.map((r) => ({
      action: r.action,
      maxPerHour: r.max_per_hour,
      maxPerDay: r.max_per_day,
      cooldownSeconds: r.cooldown_seconds,
    }));
  },

  /**
   * Update rate limit configuration
   */
  async updateRateLimit(action: string, limits: Partial<RateLimit>): Promise<void> {
    const updates: string[] = [];
    const params: unknown[] = [action];
    let paramIndex = 2;

    if (limits.maxPerHour !== undefined) {
      updates.push(`max_per_hour = $${paramIndex++}`);
      params.push(limits.maxPerHour);
    }
    if (limits.maxPerDay !== undefined) {
      updates.push(`max_per_day = $${paramIndex++}`);
      params.push(limits.maxPerDay);
    }
    if (limits.cooldownSeconds !== undefined) {
      updates.push(`cooldown_seconds = $${paramIndex++}`);
      params.push(limits.cooldownSeconds);
    }

    if (updates.length > 0) {
      updates.push('updated_at = NOW()');
      await query(
        `UPDATE economy_rate_limits SET ${updates.join(', ')} WHERE action = $1`,
        params
      );
    }
  },

  // ============================================
  // FRAUD DETECTION
  // ============================================

  /**
   * Check for suspicious transfer patterns
   */
  async checkTransferPatterns(userId: string, toUserId: string, amount: number): Promise<{
    suspicious: boolean;
    reasons: string[];
    severity: FlagSeverity;
  }> {
    const reasons: string[] = [];
    let severity: FlagSeverity = 'low';

    // Check for self-farming (same IP, device, or circular transfers)
    const circularTransfer = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM credit_transfers
       WHERE sender_id = $1 AND recipient_id = $2
         AND created_at >= NOW() - INTERVAL '7 days'`,
      [toUserId, userId]
    );

    if (parseInt(circularTransfer?.count || '0', 10) > 0) {
      reasons.push('Circular transfer pattern detected');
      severity = 'high';
    }

    // Check for rapid repeated transfers
    const recentTransfers = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM credit_transfers
       WHERE sender_id = $1 AND recipient_id = $2
         AND created_at >= NOW() - INTERVAL '1 hour'`,
      [userId, toUserId]
    );

    if (parseInt(recentTransfers?.count || '0', 10) >= 5) {
      reasons.push('High frequency transfers to same user');
      severity = severity === 'high' ? 'critical' : 'high';
    }

    // Check for new account receiving large transfers
    const recipientAge = await queryOne<{ created_at: Date }>(
      'SELECT created_at FROM users WHERE id = $1',
      [toUserId]
    );

    if (recipientAge) {
      const accountAgeDays = (Date.now() - recipientAge.created_at.getTime()) / (1000 * 60 * 60 * 24);
      if (accountAgeDays < 7 && amount >= 500) {
        reasons.push('Large transfer to new account');
        severity = 'medium';
      }
    }

    // Check for unusual amount patterns (round numbers, specific amounts)
    const recentAmounts = await queryAll<{ amount: number }>(
      `SELECT amount FROM credit_transfers
       WHERE sender_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
      [userId]
    );

    const roundNumbers = recentAmounts.filter((t) => t.amount % 100 === 0).length;
    if (roundNumbers >= 5) {
      reasons.push('Multiple round number transfers');
      if (severity === 'low') severity = 'medium';
    }

    return {
      suspicious: reasons.length > 0,
      reasons,
      severity,
    };
  },

  /**
   * Check for bot-like behavior patterns
   */
  async checkBotPatterns(userId: string): Promise<{
    suspicious: boolean;
    score: number;
    indicators: string[];
  }> {
    const indicators: string[] = [];
    let score = 0;

    // Check workout timing patterns (bots often submit at exact intervals)
    const workoutTimes = await queryAll<{ created_at: Date }>(
      `SELECT created_at FROM workouts
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
       ORDER BY created_at`,
      [userId]
    );

    if (workoutTimes.length >= 5) {
      // Check for suspiciously regular intervals
      const intervals = [];
      for (let i = 1; i < workoutTimes.length; i++) {
        const interval = workoutTimes[i].created_at.getTime() - workoutTimes[i - 1].created_at.getTime();
        intervals.push(interval);
      }

      // Check if all intervals are similar (within 5% variance)
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const allSimilar = intervals.every((i) => Math.abs(i - avgInterval) / avgInterval < 0.05);

      if (allSimilar && avgInterval > 0) {
        indicators.push('Suspiciously regular workout timing');
        score += 30;
      }
    }

    // Check for extremely fast workout submissions
    const fastWorkouts = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM workouts
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
      [userId]
    );

    if (parseInt(fastWorkouts?.count || '0', 10) > 20) {
      indicators.push('Unusually high workout frequency');
      score += 20;
    }

    // Check for earning patterns at unusual hours
    const nightEarnings = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM earning_awards
       WHERE user_id = $1
         AND EXTRACT(HOUR FROM created_at) BETWEEN 2 AND 5
         AND created_at >= NOW() - INTERVAL '7 days'`,
      [userId]
    );

    const totalEarnings = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM earning_awards
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
      [userId]
    );

    const nightCount = parseInt(nightEarnings?.count || '0', 10);
    const total = parseInt(totalEarnings?.count || '0', 10);

    if (total > 10 && nightCount / total > 0.5) {
      indicators.push('High activity during unusual hours');
      score += 25;
    }

    return {
      suspicious: score >= 50,
      score,
      indicators,
    };
  },

  // ============================================
  // FRAUD FLAGS MANAGEMENT
  // ============================================

  /**
   * Create a fraud flag
   */
  async createFlag(params: {
    userId: string;
    flagType: FraudFlagType;
    severity: FlagSeverity;
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<FraudFlag> {
    const flagId = `flag_${crypto.randomBytes(12).toString('hex')}`;

    await query(
      `INSERT INTO economy_fraud_flags (id, user_id, flag_type, severity, description, metadata, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'open')`,
      [
        flagId,
        params.userId,
        params.flagType,
        params.severity,
        params.description,
        JSON.stringify(params.metadata || {}),
      ]
    );

    log.warn({
      flagId,
      userId: params.userId,
      flagType: params.flagType,
      severity: params.severity,
      description: params.description,
    }, 'Fraud flag created');

    return {
      id: flagId,
      userId: params.userId,
      flagType: params.flagType,
      severity: params.severity,
      description: params.description,
      metadata: params.metadata || {},
      status: 'open',
      createdAt: new Date(),
    };
  },

  /**
   * Get fraud flags with filters
   */
  async getFlags(options: {
    userId?: string;
    status?: FlagStatus;
    severity?: FlagSeverity;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ flags: FraudFlag[]; total: number }> {
    const { userId, status, severity, limit = 50, offset = 0 } = options;

    let whereClause = '1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (userId) {
      whereClause += ` AND user_id = $${paramIndex++}`;
      params.push(userId);
    }
    if (status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (severity) {
      whereClause += ` AND severity = $${paramIndex++}`;
      params.push(severity);
    }

    params.push(limit, offset);

    const rows = await queryAll<{
      id: string;
      user_id: string;
      flag_type: string;
      severity: string;
      description: string;
      metadata: string;
      status: string;
      reviewed_by: string | null;
      reviewed_at: Date | null;
      review_notes: string | null;
      created_at: Date;
    }>(
      `SELECT * FROM economy_fraud_flags
       WHERE ${whereClause}
       ORDER BY
         CASE severity
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
         END,
         created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM economy_fraud_flags WHERE ${whereClause}`,
      params.slice(0, -2)
    );

    return {
      flags: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        flagType: r.flag_type as FraudFlagType,
        severity: r.severity as FlagSeverity,
        description: r.description,
        metadata: JSON.parse(r.metadata || '{}'),
        status: r.status as FlagStatus,
        reviewedBy: r.reviewed_by ?? undefined,
        reviewedAt: r.reviewed_at ?? undefined,
        reviewNotes: r.review_notes ?? undefined,
        createdAt: r.created_at,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  /**
   * Update flag status (review)
   */
  async reviewFlag(
    flagId: string,
    reviewerId: string,
    status: FlagStatus,
    notes?: string
  ): Promise<void> {
    await query(
      `UPDATE economy_fraud_flags
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_notes = $3, updated_at = NOW()
       WHERE id = $4`,
      [status, reviewerId, notes, flagId]
    );

    log.info({ flagId, reviewerId, status, notes }, 'Fraud flag reviewed');
  },

  // ============================================
  // ADMIN AUDIT LOG
  // ============================================

  /**
   * Log an admin action on the economy
   */
  async logAdminAction(params: {
    adminId: string;
    action: string;
    targetUserId?: string;
    targetType: string;
    targetId: string;
    details: Record<string, unknown>;
    reason?: string;
  }): Promise<void> {
    const logId = `audit_${crypto.randomBytes(12).toString('hex')}`;

    await query(
      `INSERT INTO admin_credit_audit_log (id, admin_id, action, target_user_id, target_type, target_id, details, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        logId,
        params.adminId,
        params.action,
        params.targetUserId,
        params.targetType,
        params.targetId,
        JSON.stringify(params.details),
        params.reason,
      ]
    );

    log.info({
      logId,
      adminId: params.adminId,
      action: params.action,
      targetUserId: params.targetUserId,
      targetType: params.targetType,
      targetId: params.targetId,
    }, 'Admin action logged');
  },

  /**
   * Get admin audit log
   */
  async getAuditLog(options: {
    adminId?: string;
    targetUserId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    entries: Array<{
      id: string;
      adminId: string;
      adminUsername?: string;
      action: string;
      targetUserId?: string;
      targetUsername?: string;
      targetType: string;
      targetId: string;
      details: Record<string, unknown>;
      reason?: string;
      createdAt: Date;
    }>;
    total: number;
  }> {
    const { adminId, targetUserId, action, limit = 50, offset = 0 } = options;

    let whereClause = '1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (adminId) {
      whereClause += ` AND al.admin_id = $${paramIndex++}`;
      params.push(adminId);
    }
    if (targetUserId) {
      whereClause += ` AND al.target_user_id = $${paramIndex++}`;
      params.push(targetUserId);
    }
    if (action) {
      whereClause += ` AND al.action = $${paramIndex++}`;
      params.push(action);
    }

    params.push(limit, offset);

    const rows = await queryAll<{
      id: string;
      admin_id: string;
      admin_username: string | null;
      action: string;
      target_user_id: string | null;
      target_username: string | null;
      target_type: string;
      target_id: string;
      details: string;
      reason: string | null;
      created_at: Date;
    }>(
      `SELECT al.*, admin.username as admin_username, target.username as target_username
       FROM admin_credit_audit_log al
       LEFT JOIN users admin ON admin.id = al.admin_id
       LEFT JOIN users target ON target.id = al.target_user_id
       WHERE ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM admin_credit_audit_log al WHERE ${whereClause}`,
      params.slice(0, -2)
    );

    return {
      entries: rows.map((r) => ({
        id: r.id,
        adminId: r.admin_id,
        adminUsername: r.admin_username ?? undefined,
        action: r.action,
        targetUserId: r.target_user_id ?? undefined,
        targetUsername: r.target_username ?? undefined,
        targetType: r.target_type,
        targetId: r.target_id,
        details: JSON.parse(r.details || '{}'),
        reason: r.reason ?? undefined,
        createdAt: r.created_at,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  // ============================================
  // AUTOMATED CHECKS
  // ============================================

  /**
   * Run all automated abuse checks for a user
   */
  async runChecks(userId: string): Promise<{
    passed: boolean;
    flags: FraudFlag[];
  }> {
    const flags: FraudFlag[] = [];

    // Check bot patterns
    const botCheck = await this.checkBotPatterns(userId);
    if (botCheck.suspicious) {
      const flag = await this.createFlag({
        userId,
        flagType: 'bot_behavior',
        severity: botCheck.score >= 75 ? 'high' : 'medium',
        description: 'Bot-like behavior detected',
        metadata: { score: botCheck.score, indicators: botCheck.indicators },
      });
      flags.push(flag);
    }

    return {
      passed: flags.length === 0,
      flags,
    };
  },

  /**
   * Run pre-transfer checks
   */
  async preTransferCheck(
    fromUserId: string,
    toUserId: string,
    amount: number
  ): Promise<{
    allowed: boolean;
    reason?: string;
    flagCreated?: FraudFlag;
  }> {
    // Check rate limits
    const rateCheck = await this.checkRateLimit(fromUserId, 'transfer');
    if (!rateCheck.allowed) {
      return {
        allowed: false,
        reason: rateCheck.cooldownRemaining > 0
          ? `Please wait ${rateCheck.cooldownRemaining} seconds before transferring again`
          : 'Transfer rate limit exceeded',
      };
    }

    // Check for suspicious patterns
    const patternCheck = await this.checkTransferPatterns(fromUserId, toUserId, amount);
    if (patternCheck.suspicious) {
      // Create a flag but still allow the transfer (unless critical)
      const flag = await this.createFlag({
        userId: fromUserId,
        flagType: patternCheck.severity === 'critical' ? 'collusion' : 'suspicious_pattern',
        severity: patternCheck.severity,
        description: patternCheck.reasons.join('; '),
        metadata: { toUserId, amount, reasons: patternCheck.reasons },
      });

      if (patternCheck.severity === 'critical') {
        return {
          allowed: false,
          reason: 'Transfer blocked for review',
          flagCreated: flag,
        };
      }

      return {
        allowed: true,
        flagCreated: flag,
      };
    }

    return { allowed: true };
  },
};

export default antiabuseService;
