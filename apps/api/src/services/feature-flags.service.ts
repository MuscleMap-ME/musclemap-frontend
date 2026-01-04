/**
 * Feature Flags Service
 *
 * Manages feature flags for gradual rollouts:
 * - XR mode
 * - New features
 * - A/B testing
 */

import { queryOne, queryAll, query } from '../db/client';
import { getRedis, isRedisAvailable } from '../lib/redis';
import { loggers } from '../lib/logger';

const log = loggers.core;

// Cache settings
const FLAG_CACHE_TTL = 300; // 5 minutes
const FLAG_CACHE_PREFIX = 'feature:';

interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage: number;
  userAllowlist: string[];
  userBlocklist: string[];
  conditions: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface FlagEvaluation {
  enabled: boolean;
  reason: 'disabled' | 'allowlist' | 'blocklist' | 'rollout' | 'condition';
}

/**
 * Hash a user ID to a number between 0-99 for percentage rollout
 */
function hashUserToPercentage(userId: string, flagId: string): number {
  let hash = 0;
  const str = `${flagId}:${userId}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100;
}

export const featureFlagsService = {
  /**
   * Get all feature flags
   */
  async getAll(): Promise<FeatureFlag[]> {
    const rows = await queryAll<{
      id: string;
      name: string;
      description: string | null;
      enabled: boolean;
      rollout_percentage: number;
      user_allowlist: string[];
      user_blocklist: string[];
      conditions: string;
      created_at: Date;
      updated_at: Date;
    }>('SELECT * FROM feature_flags ORDER BY name');

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
      enabled: r.enabled,
      rolloutPercentage: r.rollout_percentage,
      userAllowlist: r.user_allowlist || [],
      userBlocklist: r.user_blocklist || [],
      conditions: JSON.parse(r.conditions || '{}'),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  /**
   * Get a single feature flag
   */
  async get(flagId: string): Promise<FeatureFlag | null> {
    // Try cache first
    if (isRedisAvailable()) {
      const redis = getRedis();
      if (redis) {
        const cached = await redis.get(`${FLAG_CACHE_PREFIX}${flagId}`);
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch {
            // Invalid cache
          }
        }
      }
    }

    const row = await queryOne<{
      id: string;
      name: string;
      description: string | null;
      enabled: boolean;
      rollout_percentage: number;
      user_allowlist: string[];
      user_blocklist: string[];
      conditions: string;
      created_at: Date;
      updated_at: Date;
    }>('SELECT * FROM feature_flags WHERE id = $1', [flagId]);

    if (!row) return null;

    const flag: FeatureFlag = {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      enabled: row.enabled,
      rolloutPercentage: row.rollout_percentage,
      userAllowlist: row.user_allowlist || [],
      userBlocklist: row.user_blocklist || [],
      conditions: JSON.parse(row.conditions || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    // Cache the result
    if (isRedisAvailable()) {
      const redis = getRedis();
      if (redis) {
        await redis.set(`${FLAG_CACHE_PREFIX}${flagId}`, JSON.stringify(flag), 'EX', FLAG_CACHE_TTL);
      }
    }

    return flag;
  },

  /**
   * Evaluate if a feature is enabled for a user
   */
  async isEnabled(flagId: string, userId?: string, context?: Record<string, unknown>): Promise<FlagEvaluation> {
    const flag = await this.get(flagId);

    // Flag doesn't exist - default to disabled
    if (!flag) {
      return { enabled: false, reason: 'disabled' };
    }

    // Globally disabled
    if (!flag.enabled) {
      return { enabled: false, reason: 'disabled' };
    }

    // Check allowlist
    if (userId && flag.userAllowlist.includes(userId)) {
      return { enabled: true, reason: 'allowlist' };
    }

    // Check blocklist
    if (userId && flag.userBlocklist.includes(userId)) {
      return { enabled: false, reason: 'blocklist' };
    }

    // Check conditions
    if (context && Object.keys(flag.conditions).length > 0) {
      const conditionsMet = this.evaluateConditions(flag.conditions, context);
      if (!conditionsMet) {
        return { enabled: false, reason: 'condition' };
      }
    }

    // Percentage rollout
    if (userId && flag.rolloutPercentage < 100) {
      const userPercentage = hashUserToPercentage(userId, flagId);
      if (userPercentage >= flag.rolloutPercentage) {
        return { enabled: false, reason: 'rollout' };
      }
    }

    return { enabled: true, reason: 'rollout' };
  },

  /**
   * Simple condition evaluation
   */
  evaluateConditions(conditions: Record<string, unknown>, context: Record<string, unknown>): boolean {
    for (const [key, expected] of Object.entries(conditions)) {
      const actual = context[key];

      if (Array.isArray(expected)) {
        // Array means "one of"
        if (!expected.includes(actual)) {
          return false;
        }
      } else if (typeof expected === 'object' && expected !== null) {
        // Object means range or comparison
        const exp = expected as { min?: number; max?: number; eq?: unknown; neq?: unknown };
        if (typeof actual === 'number') {
          if (exp.min !== undefined && actual < exp.min) return false;
          if (exp.max !== undefined && actual > exp.max) return false;
        }
        if (exp.eq !== undefined && actual !== exp.eq) return false;
        if (exp.neq !== undefined && actual === exp.neq) return false;
      } else {
        // Direct comparison
        if (actual !== expected) {
          return false;
        }
      }
    }

    return true;
  },

  /**
   * Update a feature flag
   */
  async update(
    flagId: string,
    update: Partial<{
      enabled: boolean;
      rolloutPercentage: number;
      userAllowlist: string[];
      userBlocklist: string[];
      conditions: Record<string, unknown>;
    }>
  ): Promise<void> {
    const sets: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (update.enabled !== undefined) {
      sets.push(`enabled = $${paramIndex++}`);
      params.push(update.enabled);
    }

    if (update.rolloutPercentage !== undefined) {
      sets.push(`rollout_percentage = $${paramIndex++}`);
      params.push(update.rolloutPercentage);
    }

    if (update.userAllowlist !== undefined) {
      sets.push(`user_allowlist = $${paramIndex++}`);
      params.push(update.userAllowlist);
    }

    if (update.userBlocklist !== undefined) {
      sets.push(`user_blocklist = $${paramIndex++}`);
      params.push(update.userBlocklist);
    }

    if (update.conditions !== undefined) {
      sets.push(`conditions = $${paramIndex++}`);
      params.push(JSON.stringify(update.conditions));
    }

    params.push(flagId);

    await query(`UPDATE feature_flags SET ${sets.join(', ')} WHERE id = $${paramIndex}`, params);

    // Invalidate cache
    if (isRedisAvailable()) {
      const redis = getRedis();
      if (redis) {
        await redis.del(`${FLAG_CACHE_PREFIX}${flagId}`);
      }
    }

    log.info({ flagId, update }, 'Feature flag updated');
  },

  /**
   * Check if XR mode is enabled for a user
   */
  async isXRModeEnabled(userId?: string): Promise<boolean> {
    const result = await this.isEnabled('xr_mode', userId);
    return result.enabled;
  },

  /**
   * Get all enabled features for a user
   */
  async getEnabledFeatures(
    userId?: string,
    context?: Record<string, unknown>
  ): Promise<Record<string, boolean>> {
    const flags = await this.getAll();
    const result: Record<string, boolean> = {};

    for (const flag of flags) {
      const evaluation = await this.isEnabled(flag.id, userId, context);
      result[flag.id] = evaluation.enabled;
    }

    return result;
  },
};
