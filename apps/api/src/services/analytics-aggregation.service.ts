/**
 * Analytics Aggregation Service
 *
 * Handles scheduled aggregation tasks for the Empire analytics dashboard:
 * - Daily rollups (aggregate previous day's metrics)
 * - User activity summaries (denormalized per-user stats)
 * - Segment recalculation (dynamic behavioral segments)
 * - Cohort retention updates
 * - Materialized view refresh
 *
 * Designed for scale:
 * - Processes in batches to avoid memory issues
 * - Uses efficient SQL aggregations
 * - Supports incremental updates
 */

import { query, queryOne, queryAll, transaction } from '../db/client';
import { loggers } from '../lib/logger';
import { getRedis } from '../lib/redis';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

interface UserSummary {
  userId: string;
  totalSessions: number;
  sessions7d: number;
  sessions30d: number;
  totalWorkouts: number;
  workouts7d: number;
  workouts30d: number;
  totalFeatureInteractions: number;
  featureInteractions7d: number;
  featureInteractions30d: number;
  uniqueFeaturesUsed: number;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
  daysActiveTotal: number;
  daysActive7d: number;
  daysActive30d: number;
  engagementScore: number;
  engagementTrend: 'rising' | 'stable' | 'declining' | 'churned' | 'new';
  socialInteractions30d: number;
  creditTransactions30d: number;
}

interface SegmentCriteria {
  minWorkouts30d?: number;
  maxWorkouts30d?: number;
  minSessions30d?: number;
  inactiveDays?: number;
  signupDays?: number;
  minWorkouts?: number;
  maxWorkouts?: number;
  minSocial30d?: number;
  hasCreditActivity30d?: boolean;
  highEngagement?: boolean;
  noPurchases?: boolean;
  decliningEngagement?: boolean;
  minHistoricalSessions?: number;
  wasDormant?: boolean;
  recentActivity?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const BATCH_SIZE = 500;

// ============================================
// HELPER FUNCTIONS
// ============================================

function determineEngagementTrend(
  currentScore: number,
  previousScore: number | null,
  daysActive30d: number,
  daysSinceSignup: number
): 'rising' | 'stable' | 'declining' | 'churned' | 'new' {
  // New user (< 7 days old)
  if (daysSinceSignup < 7) {
    return 'new';
  }

  // Churned (no activity in 30+ days)
  if (daysActive30d === 0) {
    return 'churned';
  }

  // If no previous score, can't determine trend
  if (previousScore === null) {
    return 'stable';
  }

  const change = currentScore - previousScore;

  if (change >= 10) return 'rising';
  if (change <= -10) return 'declining';
  return 'stable';
}

// ============================================
// DAILY ROLLUPS
// ============================================

/**
 * Calculate daily rollups for a specific date.
 * Called by scheduled job at midnight.
 */
async function calculateDailyRollups(date: Date = new Date()): Promise<void> {
  // Use previous day for rollups
  const rollupDate = new Date(date);
  rollupDate.setDate(rollupDate.getDate() - 1);
  const dateStr = rollupDate.toISOString().split('T')[0];

  log.info('Starting daily rollups calculation', { date: dateStr });

  try {
    await transaction(async (client) => {
      // 1. Signup rollups
      await client.query(
        `INSERT INTO analytics_daily_rollups
         (rollup_date, rollup_type, dimension_key, dimension_value, count_total, count_unique_users)
         SELECT
           $1::DATE as rollup_date,
           'signups' as rollup_type,
           'total' as dimension_key,
           NULL as dimension_value,
           COUNT(*) as count_total,
           COUNT(*) as count_unique_users
         FROM users
         WHERE DATE(created_at) = $1::DATE
         ON CONFLICT (rollup_date, rollup_type, dimension_key, COALESCE(dimension_value, ''))
         DO UPDATE SET
           count_total = EXCLUDED.count_total,
           count_unique_users = EXCLUDED.count_unique_users,
           calculated_at = NOW()`,
        [dateStr]
      );

      // 2. Feature usage rollups
      await client.query(
        `INSERT INTO analytics_daily_rollups
         (rollup_date, rollup_type, dimension_key, dimension_value, count_total, count_unique_users, sum_interactions)
         SELECT
           $1::DATE as rollup_date,
           'features' as rollup_type,
           feature_id as dimension_key,
           feature_category as dimension_value,
           COUNT(*) as count_total,
           COUNT(DISTINCT user_id) as count_unique_users,
           COUNT(*) as sum_interactions
         FROM feature_usage_events
         WHERE DATE(created_at) = $1::DATE
         GROUP BY feature_id, feature_category
         ON CONFLICT (rollup_date, rollup_type, dimension_key, COALESCE(dimension_value, ''))
         DO UPDATE SET
           count_total = EXCLUDED.count_total,
           count_unique_users = EXCLUDED.count_unique_users,
           sum_interactions = EXCLUDED.sum_interactions,
           calculated_at = NOW()`,
        [dateStr]
      );

      // 3. Engagement rollups
      await client.query(
        `INSERT INTO analytics_daily_rollups
         (rollup_date, rollup_type, dimension_key, dimension_value, count_total, count_unique_users, avg_duration_seconds)
         SELECT
           $1::DATE as rollup_date,
           'engagement' as rollup_type,
           'workouts' as dimension_key,
           NULL as dimension_value,
           COUNT(DISTINCT w.id) as count_total,
           COUNT(DISTINCT w.user_id) as count_unique_users,
           AVG(EXTRACT(EPOCH FROM (w.completed_at - w.started_at))) as avg_duration_seconds
         FROM workouts w
         WHERE DATE(w.completed_at) = $1::DATE
         ON CONFLICT (rollup_date, rollup_type, dimension_key, COALESCE(dimension_value, ''))
         DO UPDATE SET
           count_total = EXCLUDED.count_total,
           count_unique_users = EXCLUDED.count_unique_users,
           avg_duration_seconds = EXCLUDED.avg_duration_seconds,
           calculated_at = NOW()`,
        [dateStr]
      );

      // 4. Economy rollups
      await client.query(
        `INSERT INTO analytics_daily_rollups
         (rollup_date, rollup_type, dimension_key, dimension_value, count_total, count_unique_users, sum_interactions)
         SELECT
           $1::DATE as rollup_date,
           'economy' as rollup_type,
           action as dimension_key,
           NULL as dimension_value,
           COUNT(*) as count_total,
           COUNT(DISTINCT user_id) as count_unique_users,
           SUM(amount) as sum_interactions
         FROM credit_ledger
         WHERE DATE(created_at) = $1::DATE
         GROUP BY action
         ON CONFLICT (rollup_date, rollup_type, dimension_key, COALESCE(dimension_value, ''))
         DO UPDATE SET
           count_total = EXCLUDED.count_total,
           count_unique_users = EXCLUDED.count_unique_users,
           sum_interactions = EXCLUDED.sum_interactions,
           calculated_at = NOW()`,
        [dateStr]
      );

      // 5. Social rollups (if table exists)
      await client.query(
        `INSERT INTO analytics_daily_rollups
         (rollup_date, rollup_type, dimension_key, dimension_value, count_total, count_unique_users)
         SELECT
           $1::DATE as rollup_date,
           'social' as rollup_type,
           ae.event_type as dimension_key,
           NULL as dimension_value,
           COUNT(*) as count_total,
           COUNT(DISTINCT ae.user_id) as count_unique_users
         FROM activity_events ae
         WHERE DATE(ae.created_at) = $1::DATE
           AND ae.event_type IN ('post_created', 'comment_created', 'high_five_sent', 'follow')
         GROUP BY ae.event_type
         ON CONFLICT (rollup_date, rollup_type, dimension_key, COALESCE(dimension_value, ''))
         DO UPDATE SET
           count_total = EXCLUDED.count_total,
           count_unique_users = EXCLUDED.count_unique_users,
           calculated_at = NOW()`,
        [dateStr]
      );
    });

    log.info('Daily rollups completed', { date: dateStr });
  } catch (error) {
    log.error('Error calculating daily rollups', { error, date: dateStr });
    throw error;
  }
}

// ============================================
// USER ACTIVITY SUMMARIES
// ============================================

/**
 * Update user activity summaries.
 * Called every 15 minutes for recently active users.
 */
async function updateUserSummaries(userIds?: string[]): Promise<number> {
  log.info('Starting user summary updates', { specificUsers: userIds?.length });

  let usersToUpdate: string[] = [];

  if (userIds && userIds.length > 0) {
    usersToUpdate = userIds;
  } else {
    // Get users flagged for update from Redis
    const redisClient = getRedis();
    if (redisClient) {
      usersToUpdate = await redisClient.smembers('analytics:users_to_update');
      if (usersToUpdate.length > 0) {
        // Clear the set after reading
        await redisClient.del('analytics:users_to_update');
      }
    }

    // If no users in Redis, update recently active users
    if (usersToUpdate.length === 0) {
      const recentlyActive = await queryAll<{ user_id: string }>(
        `SELECT DISTINCT user_id
         FROM feature_usage_events
         WHERE created_at > NOW() - INTERVAL '30 minutes'
         LIMIT 1000`,
        []
      );
      usersToUpdate = recentlyActive.map((r) => r.user_id);
    }
  }

  if (usersToUpdate.length === 0) {
    log.info('No users to update');
    return 0;
  }

  let updatedCount = 0;

  // Process in batches
  for (let i = 0; i < usersToUpdate.length; i += BATCH_SIZE) {
    const batch = usersToUpdate.slice(i, i + BATCH_SIZE);

    try {
      // Use a single efficient query to calculate and upsert summaries
      await query(
        `INSERT INTO user_activity_summaries (
           user_id,
           total_feature_interactions,
           feature_interactions_7d,
           feature_interactions_30d,
           unique_features_used,
           first_activity_at,
           last_activity_at,
           days_active_30d,
           engagement_score,
           updated_at
         )
         SELECT
           u.id as user_id,
           COALESCE(fue_total.cnt, 0) as total_feature_interactions,
           COALESCE(fue_7d.cnt, 0) as feature_interactions_7d,
           COALESCE(fue_30d.cnt, 0) as feature_interactions_30d,
           COALESCE(fue_unique.cnt, 0) as unique_features_used,
           fue_first.first_at as first_activity_at,
           fue_last.last_at as last_activity_at,
           COALESCE(days_active.cnt, 0) as days_active_30d,
           COALESCE(calculate_engagement_score(
             COALESCE(w_30d.cnt, 0)::INTEGER,
             0, -- sessions placeholder
             COALESCE(days_active.cnt, 0)::INTEGER,
             COALESCE(fue_30d.cnt, 0)::INTEGER,
             0 -- social placeholder
           ), 0) as engagement_score,
           NOW() as updated_at
         FROM users u
         LEFT JOIN (
           SELECT user_id, COUNT(*) as cnt
           FROM feature_usage_events
           GROUP BY user_id
         ) fue_total ON fue_total.user_id = u.id
         LEFT JOIN (
           SELECT user_id, COUNT(*) as cnt
           FROM feature_usage_events
           WHERE created_at > NOW() - INTERVAL '7 days'
           GROUP BY user_id
         ) fue_7d ON fue_7d.user_id = u.id
         LEFT JOIN (
           SELECT user_id, COUNT(*) as cnt
           FROM feature_usage_events
           WHERE created_at > NOW() - INTERVAL '30 days'
           GROUP BY user_id
         ) fue_30d ON fue_30d.user_id = u.id
         LEFT JOIN (
           SELECT user_id, COUNT(DISTINCT feature_id) as cnt
           FROM feature_usage_events
           GROUP BY user_id
         ) fue_unique ON fue_unique.user_id = u.id
         LEFT JOIN (
           SELECT user_id, MIN(created_at) as first_at
           FROM feature_usage_events
           GROUP BY user_id
         ) fue_first ON fue_first.user_id = u.id
         LEFT JOIN (
           SELECT user_id, MAX(created_at) as last_at
           FROM feature_usage_events
           GROUP BY user_id
         ) fue_last ON fue_last.user_id = u.id
         LEFT JOIN (
           SELECT user_id, COUNT(DISTINCT DATE(created_at)) as cnt
           FROM feature_usage_events
           WHERE created_at > NOW() - INTERVAL '30 days'
           GROUP BY user_id
         ) days_active ON days_active.user_id = u.id
         LEFT JOIN (
           SELECT user_id, COUNT(*) as cnt
           FROM workouts
           WHERE completed_at > NOW() - INTERVAL '30 days'
           GROUP BY user_id
         ) w_30d ON w_30d.user_id = u.id
         WHERE u.id = ANY($1)
         ON CONFLICT (user_id) DO UPDATE SET
           total_feature_interactions = EXCLUDED.total_feature_interactions,
           feature_interactions_7d = EXCLUDED.feature_interactions_7d,
           feature_interactions_30d = EXCLUDED.feature_interactions_30d,
           unique_features_used = EXCLUDED.unique_features_used,
           first_activity_at = COALESCE(EXCLUDED.first_activity_at, user_activity_summaries.first_activity_at),
           last_activity_at = EXCLUDED.last_activity_at,
           days_active_30d = EXCLUDED.days_active_30d,
           engagement_score = EXCLUDED.engagement_score,
           updated_at = NOW()`,
        [batch]
      );

      updatedCount += batch.length;
    } catch (error) {
      log.error('Error updating user summaries batch', { error, batchStart: i });
    }
  }

  log.info('User summary updates completed', { updated: updatedCount });
  return updatedCount;
}

// ============================================
// SEGMENT RECALCULATION
// ============================================

/**
 * Recalculate dynamic segment memberships.
 * Called every hour.
 */
async function recalculateSegments(): Promise<void> {
  log.info('Starting segment recalculation');

  try {
    // Get all active dynamic segments
    const segments = await queryAll<{
      id: string;
      name: string;
      criteria: string;
    }>(
      `SELECT id, name, criteria::TEXT
       FROM user_segments
       WHERE is_active = TRUE AND is_dynamic = TRUE`,
      []
    );

    for (const segment of segments) {
      const criteria: SegmentCriteria = JSON.parse(segment.criteria);

      try {
        await recalculateSegment(segment.id, segment.name, criteria);
      } catch (error) {
        log.error('Error recalculating segment', { error, segmentId: segment.id });
      }
    }

    // Update segment counts
    await query(
      `UPDATE user_segments s
       SET
         member_count = COALESCE(m.cnt, 0),
         last_calculated_at = NOW()
       FROM (
         SELECT segment_id, COUNT(*) as cnt
         FROM user_segment_memberships
         WHERE expires_at IS NULL OR expires_at > NOW()
         GROUP BY segment_id
       ) m
       WHERE m.segment_id = s.id`,
      []
    );

    // Refresh the segment counts materialized view
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_segment_counts', []);

    log.info('Segment recalculation completed', { segmentCount: segments.length });
  } catch (error) {
    log.error('Error in segment recalculation', { error });
    throw error;
  }
}

async function recalculateSegment(segmentId: string, segmentName: string, criteria: SegmentCriteria): Promise<void> {
  log.debug('Recalculating segment', { segmentId, segmentName });

  // Build WHERE clause based on criteria
  const conditions: string[] = [];
  const params: unknown[] = [segmentId];
  let paramIndex = 2;

  // Using user_activity_summaries for efficient queries
  if (criteria.minWorkouts30d !== undefined) {
    conditions.push(`uas.workouts_30d >= $${paramIndex++}`);
    params.push(criteria.minWorkouts30d);
  }

  if (criteria.maxWorkouts30d !== undefined) {
    conditions.push(`uas.workouts_30d <= $${paramIndex++}`);
    params.push(criteria.maxWorkouts30d);
  }

  if (criteria.inactiveDays !== undefined) {
    conditions.push(`uas.last_activity_at < NOW() - INTERVAL '1 day' * $${paramIndex++}`);
    params.push(criteria.inactiveDays);
  }

  if (criteria.signupDays !== undefined) {
    conditions.push(`u.created_at > NOW() - INTERVAL '1 day' * $${paramIndex++}`);
    params.push(criteria.signupDays);
  }

  if (criteria.minWorkouts !== undefined) {
    conditions.push(`uas.total_workouts >= $${paramIndex++}`);
    params.push(criteria.minWorkouts);
  }

  if (criteria.maxWorkouts !== undefined) {
    conditions.push(`uas.total_workouts <= $${paramIndex++}`);
    params.push(criteria.maxWorkouts);
  }

  if (criteria.minSocial30d !== undefined) {
    conditions.push(`uas.social_interactions_30d >= $${paramIndex++}`);
    params.push(criteria.minSocial30d);
  }

  if (criteria.hasCreditActivity30d === true) {
    conditions.push(`uas.credit_transactions_30d > 0`);
  }

  if (criteria.highEngagement === true) {
    conditions.push(`uas.engagement_score >= 70`);
  }

  if (criteria.decliningEngagement === true) {
    conditions.push(`uas.engagement_trend = 'declining'`);
  }

  // Default condition if none specified
  if (conditions.length === 0) {
    conditions.push('TRUE');
  }

  const whereClause = conditions.join(' AND ');

  // Clear existing memberships for this segment
  await query('DELETE FROM user_segment_memberships WHERE segment_id = $1', [segmentId]);

  // Insert new memberships
  await query(
    `INSERT INTO user_segment_memberships (user_id, segment_id, score, joined_at)
     SELECT
       u.id as user_id,
       $1 as segment_id,
       uas.engagement_score / 100.0 as score,
       NOW() as joined_at
     FROM users u
     LEFT JOIN user_activity_summaries uas ON uas.user_id = u.id
     WHERE ${whereClause}`,
    params
  );

  // Update cached segments array on user_activity_summaries
  await query(
    `UPDATE user_activity_summaries uas
     SET current_segments = (
       SELECT ARRAY_AGG(usm.segment_id)
       FROM user_segment_memberships usm
       WHERE usm.user_id = uas.user_id
     )
     WHERE user_id IN (
       SELECT user_id FROM user_segment_memberships WHERE segment_id = $1
     )`,
    [segmentId]
  );
}

// ============================================
// COHORT RETENTION
// ============================================

/**
 * Update cohort retention metrics.
 * Called daily at 1:30 AM.
 */
async function updateCohortRetention(): Promise<void> {
  log.info('Starting cohort retention update');

  try {
    // Get all cohort dates that need updating (last 90 days)
    const cohortDates = await queryAll<{ cohort_date: string }>(
      `SELECT DISTINCT DATE(created_at) as cohort_date
       FROM users
       WHERE created_at > NOW() - INTERVAL '90 days'
         AND created_at < NOW() - INTERVAL '1 day'
       ORDER BY cohort_date DESC`,
      []
    );

    for (const { cohort_date } of cohortDates) {
      try {
        await updateCohort(cohort_date);
      } catch (error) {
        log.error('Error updating cohort', { error, cohortDate: cohort_date });
      }
    }

    log.info('Cohort retention update completed', { cohortCount: cohortDates.length });
  } catch (error) {
    log.error('Error in cohort retention update', { error });
    throw error;
  }
}

async function updateCohort(cohortDate: string): Promise<void> {
  await query(
    `INSERT INTO signup_cohorts (
       cohort_date, cohort_size,
       retained_d1, retained_d3, retained_d7, retained_d14, retained_d30, retained_d60, retained_d90,
       adopted_workout, adopted_social, adopted_economy, adopted_competition,
       avg_workouts_d7, avg_workouts_d30,
       calculated_at
     )
     SELECT
       $1::DATE as cohort_date,
       COUNT(DISTINCT u.id) as cohort_size,

       -- Retention (users with any feature usage on day N)
       COUNT(DISTINCT CASE
         WHEN EXISTS (
           SELECT 1 FROM feature_usage_events fue
           WHERE fue.user_id = u.id
             AND DATE(fue.created_at) = $1::DATE + INTERVAL '1 day'
         ) THEN u.id
       END) as retained_d1,

       COUNT(DISTINCT CASE
         WHEN EXISTS (
           SELECT 1 FROM feature_usage_events fue
           WHERE fue.user_id = u.id
             AND DATE(fue.created_at) = $1::DATE + INTERVAL '3 days'
         ) THEN u.id
       END) as retained_d3,

       COUNT(DISTINCT CASE
         WHEN EXISTS (
           SELECT 1 FROM feature_usage_events fue
           WHERE fue.user_id = u.id
             AND fue.created_at BETWEEN $1::DATE + INTERVAL '6 days' AND $1::DATE + INTERVAL '8 days'
         ) THEN u.id
       END) as retained_d7,

       COUNT(DISTINCT CASE
         WHEN EXISTS (
           SELECT 1 FROM feature_usage_events fue
           WHERE fue.user_id = u.id
             AND fue.created_at BETWEEN $1::DATE + INTERVAL '13 days' AND $1::DATE + INTERVAL '15 days'
         ) THEN u.id
       END) as retained_d14,

       COUNT(DISTINCT CASE
         WHEN EXISTS (
           SELECT 1 FROM feature_usage_events fue
           WHERE fue.user_id = u.id
             AND fue.created_at BETWEEN $1::DATE + INTERVAL '28 days' AND $1::DATE + INTERVAL '32 days'
         ) THEN u.id
       END) as retained_d30,

       COUNT(DISTINCT CASE
         WHEN EXISTS (
           SELECT 1 FROM feature_usage_events fue
           WHERE fue.user_id = u.id
             AND fue.created_at BETWEEN $1::DATE + INTERVAL '58 days' AND $1::DATE + INTERVAL '62 days'
         ) THEN u.id
       END) as retained_d60,

       COUNT(DISTINCT CASE
         WHEN EXISTS (
           SELECT 1 FROM feature_usage_events fue
           WHERE fue.user_id = u.id
             AND fue.created_at BETWEEN $1::DATE + INTERVAL '88 days' AND $1::DATE + INTERVAL '92 days'
         ) THEN u.id
       END) as retained_d90,

       -- Feature adoption
       COUNT(DISTINCT CASE
         WHEN EXISTS (
           SELECT 1 FROM feature_usage_events fue
           WHERE fue.user_id = u.id AND fue.feature_category = 'fitness'
         ) THEN u.id
       END) as adopted_workout,

       COUNT(DISTINCT CASE
         WHEN EXISTS (
           SELECT 1 FROM feature_usage_events fue
           WHERE fue.user_id = u.id AND fue.feature_category = 'social'
         ) THEN u.id
       END) as adopted_social,

       COUNT(DISTINCT CASE
         WHEN EXISTS (
           SELECT 1 FROM feature_usage_events fue
           WHERE fue.user_id = u.id AND fue.feature_category = 'economy'
         ) THEN u.id
       END) as adopted_economy,

       COUNT(DISTINCT CASE
         WHEN EXISTS (
           SELECT 1 FROM feature_usage_events fue
           WHERE fue.user_id = u.id AND fue.feature_category = 'competition'
         ) THEN u.id
       END) as adopted_competition,

       -- Average workouts
       COALESCE(AVG(w7.workout_count), 0) as avg_workouts_d7,
       COALESCE(AVG(w30.workout_count), 0) as avg_workouts_d30,

       NOW() as calculated_at

     FROM users u
     LEFT JOIN (
       SELECT user_id, COUNT(*) as workout_count
       FROM workouts
       WHERE completed_at BETWEEN $1::DATE AND $1::DATE + INTERVAL '7 days'
       GROUP BY user_id
     ) w7 ON w7.user_id = u.id
     LEFT JOIN (
       SELECT user_id, COUNT(*) as workout_count
       FROM workouts
       WHERE completed_at BETWEEN $1::DATE AND $1::DATE + INTERVAL '30 days'
       GROUP BY user_id
     ) w30 ON w30.user_id = u.id
     WHERE DATE(u.created_at) = $1::DATE

     ON CONFLICT (cohort_date) DO UPDATE SET
       cohort_size = EXCLUDED.cohort_size,
       retained_d1 = EXCLUDED.retained_d1,
       retained_d3 = EXCLUDED.retained_d3,
       retained_d7 = EXCLUDED.retained_d7,
       retained_d14 = EXCLUDED.retained_d14,
       retained_d30 = EXCLUDED.retained_d30,
       retained_d60 = EXCLUDED.retained_d60,
       retained_d90 = EXCLUDED.retained_d90,
       adopted_workout = EXCLUDED.adopted_workout,
       adopted_social = EXCLUDED.adopted_social,
       adopted_economy = EXCLUDED.adopted_economy,
       adopted_competition = EXCLUDED.adopted_competition,
       avg_workouts_d7 = EXCLUDED.avg_workouts_d7,
       avg_workouts_d30 = EXCLUDED.avg_workouts_d30,
       calculated_at = NOW()`,
    [cohortDate]
  );
}

// ============================================
// MATERIALIZED VIEW REFRESH
// ============================================

/**
 * Refresh all analytics materialized views.
 * Called every 15 minutes.
 */
async function refreshMaterializedViews(): Promise<void> {
  log.info('Refreshing analytics materialized views');

  try {
    // Refresh feature popularity
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_feature_popularity', []);

    // Refresh new users daily summary
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_new_users_daily', []);

    // Refresh segment counts
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_segment_counts', []);

    log.info('Analytics materialized views refreshed');
  } catch (error) {
    log.error('Error refreshing materialized views', { error });
    throw error;
  }
}

// ============================================
// EXPORT
// ============================================

export const analyticsAggregation = {
  calculateDailyRollups,
  updateUserSummaries,
  recalculateSegments,
  updateCohortRetention,
  refreshMaterializedViews,

  // Handler for scheduled job system
  async runJob(jobName: string): Promise<void> {
    switch (jobName) {
      case 'analytics.calculateDailyRollups':
        await calculateDailyRollups();
        break;
      case 'analytics.updateUserSummaries':
        await updateUserSummaries();
        break;
      case 'analytics.recalculateSegments':
        await recalculateSegments();
        break;
      case 'analytics.updateCohortRetention':
        await updateCohortRetention();
        break;
      case 'analytics.refreshMaterializedViews':
        await refreshMaterializedViews();
        break;
      default:
        log.warn('Unknown analytics job', { jobName });
    }
  },
};

export default analyticsAggregation;
