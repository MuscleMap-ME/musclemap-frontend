/**
 * Feature Tracker Service
 *
 * Tracks feature usage events for analytics in the Empire control panel.
 *
 * Architecture:
 * - Events are stored in feature_usage_events table
 * - Privacy settings are respected (users who opt out are NOT tracked)
 * - Supports batch tracking for efficiency
 * - Integrates with user activity summaries
 *
 * Usage:
 *   await featureTracker.track({
 *     userId: 'user_123',
 *     featureId: 'workout_log',
 *     action: 'complete',
 *     metadata: { exerciseCount: 5 }
 *   });
 */

import { query, queryOne, queryAll } from '../db/client';
import { loggers } from '../lib/logger';
import { getRedis } from '../lib/redis';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

export type FeatureAction = 'view' | 'interact' | 'complete' | 'abandon' | 'error';

export interface FeatureEvent {
  userId: string;
  featureId: string;
  action: FeatureAction;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  durationMs?: number;
}

export interface FeatureUsage {
  featureId: string;
  featureCategory: string;
  featureName: string;
  useCount: number;
  lastUsedAt: string;
}

export interface FeatureDefinition {
  id: string;
  name: string;
  category: string;
  description: string | null;
  isPremium: boolean;
  isActive: boolean;
  trackingEnabled: boolean;
}

// Privacy settings checked: minimalistMode (opt_out column in user_privacy_mode)

// Feature category mapping (derived from feature_id prefix or lookup)
const FEATURE_CATEGORIES: Record<string, string> = {
  workout: 'fitness',
  prescription: 'fitness',
  muscle: 'fitness',
  exercise: 'fitness',
  '1rm': 'fitness',
  rest: 'fitness',
  superset: 'fitness',
  leaderboard: 'social',
  community: 'social',
  profile: 'social',
  high_five: 'social',
  follow: 'social',
  crew: 'social',
  competition: 'competition',
  rivalry: 'competition',
  credits: 'economy',
  store: 'economy',
  stats: 'progression',
  achievement: 'progression',
  rank: 'progression',
  milestone: 'progression',
  skill: 'progression',
  journey: 'progression',
  settings: 'profile',
  archetype: 'profile',
  theme: 'profile',
  privacy: 'profile',
  messages: 'messaging',
  message: 'messaging',
  notifications: 'notifications',
  notification: 'notifications',
  onboarding: 'onboarding',
  tutorial: 'onboarding',
  progress: 'analytics',
  history: 'analytics',
  export: 'analytics',
};

// ============================================
// PRIVACY CHECK
// ============================================

async function shouldTrackUser(userId: string): Promise<boolean> {
  // Check cache first
  const redisClient = getRedis();
  if (redisClient) {
    const cached = await redisClient.get(`analytics:opt_out:${userId}`);
    if (cached !== null) {
      return cached !== '1';
    }
  }

  // Check privacy settings
  const settings = await queryOne<{ opt_out: boolean }>(
    `SELECT
       COALESCE(minimalist_mode, FALSE) as opt_out
     FROM user_privacy_mode
     WHERE user_id = $1`,
    [userId]
  );

  // Default is opted IN to analytics
  const optedOut = settings?.opt_out ?? false;

  // Cache for 5 minutes
  if (redisClient) {
    await redisClient.setex(`analytics:opt_out:${userId}`, 300, optedOut ? '1' : '0');
  }

  return !optedOut;
}

// ============================================
// CATEGORY RESOLUTION
// ============================================

function getCategoryFromFeatureId(featureId: string): string {
  // Try prefix matching
  for (const [prefix, category] of Object.entries(FEATURE_CATEGORIES)) {
    if (featureId.startsWith(prefix)) {
      return category;
    }
  }
  // Fallback to 'other'
  return 'other';
}

async function resolveFeatureCategory(featureId: string): Promise<string> {
  // First try to get from feature_definitions table
  const definition = await queryOne<{ category: string }>(
    'SELECT category FROM feature_definitions WHERE id = $1',
    [featureId]
  );

  if (definition) {
    return definition.category;
  }

  // Fallback to prefix matching
  return getCategoryFromFeatureId(featureId);
}

// ============================================
// MAIN SERVICE
// ============================================

export const featureTracker = {
  /**
   * Track a single feature usage event
   */
  async track(event: FeatureEvent): Promise<boolean> {
    try {
      // Privacy check - don't track users who opted out
      if (!(await shouldTrackUser(event.userId))) {
        return false;
      }

      const category = await resolveFeatureCategory(event.featureId);

      await query(
        `INSERT INTO feature_usage_events
         (user_id, session_id, feature_id, feature_category, action, metadata, duration_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          event.userId,
          event.sessionId || null,
          event.featureId,
          category,
          event.action,
          JSON.stringify(event.metadata || {}),
          event.durationMs || null,
        ]
      );

      // Mark user as needing summary update (batch processed by scheduled job)
      const redisClient = getRedis();
      if (redisClient) {
        await redisClient.sadd('analytics:users_to_update', event.userId);
        // Expire the set after 1 hour to prevent unbounded growth
        await redisClient.expire('analytics:users_to_update', 3600);
      }

      return true;
    } catch (error) {
      log.error('Error tracking feature usage', { error, event });
      return false;
    }
  },

  /**
   * Track multiple feature usage events efficiently
   */
  async trackBatch(events: FeatureEvent[]): Promise<number> {
    if (events.length === 0) return 0;

    let tracked = 0;

    try {
      // Group events by user to check privacy settings once per user
      const userIds = [...new Set(events.map((e) => e.userId))];
      const trackableUsers = new Set<string>();

      for (const userId of userIds) {
        if (await shouldTrackUser(userId)) {
          trackableUsers.add(userId);
        }
      }

      // Filter to only trackable events
      const trackableEvents = events.filter((e) => trackableUsers.has(e.userId));

      if (trackableEvents.length === 0) return 0;

      // Resolve categories
      const categorizedEvents = await Promise.all(
        trackableEvents.map(async (event) => ({
          ...event,
          category: await resolveFeatureCategory(event.featureId),
        }))
      );

      // Batch insert
      const values = categorizedEvents
        .map(
          (e, i) =>
            `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6}, $${i * 7 + 7})`
        )
        .join(', ');

      const params = categorizedEvents.flatMap((e) => [
        e.userId,
        e.sessionId || null,
        e.featureId,
        e.category,
        e.action,
        JSON.stringify(e.metadata || {}),
        e.durationMs || null,
      ]);

      await query(
        `INSERT INTO feature_usage_events
         (user_id, session_id, feature_id, feature_category, action, metadata, duration_ms)
         VALUES ${values}`,
        params
      );

      tracked = categorizedEvents.length;

      // Mark users for summary update
      const redisClient = getRedis();
      if (redisClient) {
        await redisClient.sadd('analytics:users_to_update', ...trackableUsers);
        await redisClient.expire('analytics:users_to_update', 3600);
      }
    } catch (error) {
      log.error('Error batch tracking feature usage', { error, eventCount: events.length });
    }

    return tracked;
  },

  /**
   * Get feature usage summary for a specific user
   */
  async getUserFeatureUsage(userId: string, days: number = 30): Promise<FeatureUsage[]> {
    const results = await queryAll<{
      feature_id: string;
      feature_category: string;
      feature_name: string;
      use_count: string;
      last_used_at: string;
    }>(
      `SELECT
         fue.feature_id,
         fue.feature_category,
         COALESCE(fd.name, fue.feature_id) as feature_name,
         COUNT(*) as use_count,
         MAX(fue.created_at) as last_used_at
       FROM feature_usage_events fue
       LEFT JOIN feature_definitions fd ON fd.id = fue.feature_id
       WHERE fue.user_id = $1
         AND fue.created_at > NOW() - INTERVAL '1 day' * $2
       GROUP BY fue.feature_id, fue.feature_category, fd.name
       ORDER BY use_count DESC`,
      [userId, days]
    );

    return results.map((r) => ({
      featureId: r.feature_id,
      featureCategory: r.feature_category,
      featureName: r.feature_name,
      useCount: parseInt(r.use_count),
      lastUsedAt: r.last_used_at,
    }));
  },

  /**
   * Get top features by usage across all users
   */
  async getTopFeatures(
    days: number = 30,
    limit: number = 20
  ): Promise<
    Array<{
      featureId: string;
      featureCategory: string;
      featureName: string;
      totalUses: number;
      uniqueUsers: number;
    }>
  > {
    const results = await queryAll<{
      feature_id: string;
      feature_category: string;
      feature_name: string;
      total_uses: string;
      unique_users: string;
    }>(
      `SELECT
         fue.feature_id,
         fue.feature_category,
         COALESCE(fd.name, fue.feature_id) as feature_name,
         COUNT(*) as total_uses,
         COUNT(DISTINCT fue.user_id) as unique_users
       FROM feature_usage_events fue
       LEFT JOIN feature_definitions fd ON fd.id = fue.feature_id
       WHERE fue.created_at > NOW() - INTERVAL '1 day' * $1
       GROUP BY fue.feature_id, fue.feature_category, fd.name
       ORDER BY total_uses DESC
       LIMIT $2`,
      [days, limit]
    );

    return results.map((r) => ({
      featureId: r.feature_id,
      featureCategory: r.feature_category,
      featureName: r.feature_name,
      totalUses: parseInt(r.total_uses),
      uniqueUsers: parseInt(r.unique_users),
    }));
  },

  /**
   * Get all feature definitions
   */
  async getFeatureDefinitions(activeOnly: boolean = true): Promise<FeatureDefinition[]> {
    const results = await queryAll<{
      id: string;
      name: string;
      category: string;
      description: string | null;
      is_premium: boolean;
      is_active: boolean;
      tracking_enabled: boolean;
    }>(
      `SELECT id, name, category, description, is_premium, is_active, tracking_enabled
       FROM feature_definitions
       ${activeOnly ? 'WHERE is_active = TRUE' : ''}
       ORDER BY category, sort_order, name`,
      []
    );

    return results.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      description: r.description,
      isPremium: r.is_premium,
      isActive: r.is_active,
      trackingEnabled: r.tracking_enabled,
    }));
  },

  /**
   * Get feature popularity from materialized view (fast)
   */
  async getFeaturePopularity(): Promise<
    Array<{
      featureId: string;
      featureCategory: string;
      featureName: string;
      totalUses: number;
      uniqueUsers: number;
      uses24h: number;
      uses7d: number;
      uses30d: number;
    }>
  > {
    const results = await queryAll<{
      feature_id: string;
      feature_category: string;
      feature_name: string;
      total_uses: string;
      unique_users: string;
      uses_24h: string;
      uses_7d: string;
      uses_30d: string;
    }>(
      `SELECT
         feature_id,
         feature_category,
         feature_name,
         total_uses,
         unique_users,
         uses_24h,
         uses_7d,
         uses_30d
       FROM mv_feature_popularity
       ORDER BY uses_30d DESC`,
      []
    );

    return results.map((r) => ({
      featureId: r.feature_id,
      featureCategory: r.feature_category,
      featureName: r.feature_name,
      totalUses: parseInt(r.total_uses),
      uniqueUsers: parseInt(r.unique_users),
      uses24h: parseInt(r.uses_24h),
      uses7d: parseInt(r.uses_7d),
      uses30d: parseInt(r.uses_30d),
    }));
  },
};

// ============================================
// CONVENIENCE TRACKING FUNCTIONS
// ============================================

/**
 * Quick track helper - fire and forget (doesn't await)
 */
export function trackFeature(
  userId: string,
  featureId: string,
  action: FeatureAction = 'view',
  metadata?: Record<string, unknown>
): void {
  // Fire and forget - don't block the response
  featureTracker.track({ userId, featureId, action, metadata }).catch((err) => {
    log.warn('Failed to track feature', { err, userId, featureId });
  });
}

/**
 * Track feature view (most common action)
 */
export function trackView(userId: string, featureId: string, metadata?: Record<string, unknown>): void {
  trackFeature(userId, featureId, 'view', metadata);
}

/**
 * Track feature interaction
 */
export function trackInteract(userId: string, featureId: string, metadata?: Record<string, unknown>): void {
  trackFeature(userId, featureId, 'interact', metadata);
}

/**
 * Track feature completion
 */
export function trackComplete(userId: string, featureId: string, metadata?: Record<string, unknown>): void {
  trackFeature(userId, featureId, 'complete', metadata);
}

export default featureTracker;
