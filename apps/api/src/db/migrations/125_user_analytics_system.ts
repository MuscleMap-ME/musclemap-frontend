/**
 * Migration 125: User Analytics System
 *
 * Creates comprehensive user analytics infrastructure for the Empire control panel:
 * - Feature usage tracking (every feature interaction)
 * - Feature definitions (trackable features catalog)
 * - User segments (behavioral groupings)
 * - User segment memberships (user-to-segment mapping)
 * - User activity summaries (denormalized per-user stats)
 * - Analytics daily rollups (pre-aggregated metrics)
 * - Signup cohorts (cohort retention analysis)
 * - Materialized views for performance
 *
 * Designed to scale from 1 user to millions with:
 * - Keyset pagination indexes
 * - Pre-computed aggregations
 * - Efficient time-windowed queries
 * - Automatic data retention
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function indexExists(indexName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_indexes WHERE indexname = $1`,
    [indexName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function viewExists(viewName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_matviews WHERE matviewname = $1`,
    [viewName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 125_user_analytics_system');

  // ========================================
  // FEATURE DEFINITIONS - Catalog of trackable features
  // ========================================

  if (!(await tableExists('feature_definitions'))) {
    log.info('Creating feature_definitions table...');
    await db.query(`
      CREATE TABLE feature_definitions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        is_premium BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        tracking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        metadata JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.query('CREATE INDEX idx_feature_definitions_category ON feature_definitions(category)');
    await db.query('CREATE INDEX idx_feature_definitions_active ON feature_definitions(is_active) WHERE is_active = TRUE');
    log.info('feature_definitions table created');

    // Seed initial feature definitions
    log.info('Seeding feature definitions...');
    await db.query(`
      INSERT INTO feature_definitions (id, name, category, description, sort_order) VALUES
        -- Fitness features
        ('workout_log', 'Log Workout', 'fitness', 'Record a workout session with sets and reps', 1),
        ('workout_complete', 'Complete Workout', 'fitness', 'Finish a full workout session', 2),
        ('prescription_view', 'View Prescription', 'fitness', 'View daily workout prescription', 3),
        ('prescription_start', 'Start Prescription', 'fitness', 'Begin a prescribed workout', 4),
        ('muscle_viz', 'Muscle Visualization', 'fitness', '3D muscle activation viewer', 5),
        ('exercise_search', 'Search Exercises', 'fitness', 'Search the exercise library', 6),
        ('exercise_view', 'View Exercise', 'fitness', 'View exercise details and demo', 7),
        ('1rm_calculator', '1RM Calculator', 'fitness', 'Calculate one-rep max', 8),
        ('rest_timer', 'Rest Timer', 'fitness', 'Use rest timer between sets', 9),
        ('superset', 'Create Superset', 'fitness', 'Create exercise supersets', 10),

        -- Social features
        ('leaderboard_view', 'View Leaderboard', 'social', 'View rankings and leaderboards', 20),
        ('community_view', 'View Community', 'social', 'Browse community feed', 21),
        ('community_post', 'Create Post', 'social', 'Post to community', 22),
        ('community_react', 'React to Post', 'social', 'Like or react to a post', 23),
        ('community_comment', 'Comment on Post', 'social', 'Comment on community post', 24),
        ('profile_view', 'View Profile', 'social', 'View user profile', 25),
        ('profile_view_other', 'View Other Profile', 'social', 'View another user''s profile', 26),
        ('high_five_send', 'Send High Five', 'social', 'Send high five to another user', 27),
        ('follow_user', 'Follow User', 'social', 'Follow another user', 28),
        ('crew_view', 'View Crew', 'social', 'View crew details', 29),
        ('crew_join', 'Join Crew', 'social', 'Join a crew', 30),

        -- Competition features
        ('competition_view', 'View Competition', 'competition', 'Browse available competitions', 40),
        ('competition_join', 'Join Competition', 'competition', 'Enter a competition', 41),
        ('competition_create', 'Create Competition', 'competition', 'Create new competition', 42),
        ('rivalry_view', 'View Rivalry', 'competition', 'View rivalry details', 43),
        ('rivalry_create', 'Create Rivalry', 'competition', 'Challenge someone to rivalry', 44),

        -- Economy features
        ('credits_view', 'View Credits', 'economy', 'Check credit balance', 50),
        ('credits_purchase', 'Purchase Credits', 'economy', 'Buy credits', 51),
        ('credits_transfer', 'Transfer Credits', 'economy', 'Send credits to another user', 52),
        ('credits_spend', 'Spend Credits', 'economy', 'Use credits on features', 53),
        ('store_view', 'View Store', 'economy', 'Browse the store', 54),
        ('store_purchase', 'Store Purchase', 'economy', 'Buy item from store', 55),

        -- Progression features
        ('stats_view', 'View Stats', 'progression', 'View character stats', 60),
        ('achievement_view', 'View Achievements', 'progression', 'Browse achievements', 61),
        ('achievement_unlock', 'Unlock Achievement', 'progression', 'Earn an achievement', 62),
        ('rank_view', 'View Rank', 'progression', 'Check rank and XP', 63),
        ('milestone_view', 'View Milestones', 'progression', 'Check milestone progress', 64),
        ('skill_tree_view', 'View Skill Tree', 'progression', 'Explore skill progressions', 65),
        ('journey_view', 'View Journey', 'progression', 'Track journey progress', 66),

        -- Profile & Settings features
        ('profile_edit', 'Edit Profile', 'profile', 'Update profile information', 70),
        ('settings_view', 'View Settings', 'profile', 'Access settings page', 71),
        ('settings_update', 'Update Settings', 'profile', 'Change settings', 72),
        ('archetype_view', 'View Archetype', 'profile', 'View archetype details', 73),
        ('archetype_switch', 'Switch Archetype', 'profile', 'Change archetype', 74),
        ('theme_change', 'Change Theme', 'profile', 'Switch UI theme', 75),
        ('privacy_update', 'Update Privacy', 'profile', 'Change privacy settings', 76),

        -- Messaging features
        ('messages_view', 'View Messages', 'messaging', 'Open messages inbox', 80),
        ('message_send', 'Send Message', 'messaging', 'Send a direct message', 81),
        ('message_read', 'Read Message', 'messaging', 'Open and read a message', 82),

        -- Notifications
        ('notifications_view', 'View Notifications', 'notifications', 'Check notifications', 90),
        ('notification_click', 'Click Notification', 'notifications', 'Interact with notification', 91),

        -- Onboarding
        ('onboarding_start', 'Start Onboarding', 'onboarding', 'Begin onboarding flow', 100),
        ('onboarding_complete', 'Complete Onboarding', 'onboarding', 'Finish onboarding', 101),
        ('tutorial_view', 'View Tutorial', 'onboarding', 'Watch tutorial content', 102),

        -- Analytics & Data
        ('progress_view', 'View Progress', 'analytics', 'Check progress charts', 110),
        ('history_view', 'View History', 'analytics', 'Browse workout history', 111),
        ('export_data', 'Export Data', 'analytics', 'Download personal data', 112)
      ON CONFLICT (id) DO NOTHING
    `);
    log.info('Feature definitions seeded');
  }

  // ========================================
  // FEATURE USAGE EVENTS - Track every feature interaction
  // ========================================

  if (!(await tableExists('feature_usage_events'))) {
    log.info('Creating feature_usage_events table...');
    await db.query(`
      CREATE TABLE feature_usage_events (
        id TEXT PRIMARY KEY DEFAULT 'fue_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_id TEXT,
        feature_id TEXT NOT NULL,
        feature_category TEXT NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('view', 'interact', 'complete', 'abandon', 'error')),
        metadata JSONB NOT NULL DEFAULT '{}',
        duration_ms INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Keyset pagination index (primary for chronological queries)
    await db.query('CREATE INDEX idx_feature_usage_keyset ON feature_usage_events(created_at DESC, id DESC)');

    // User activity lookups
    await db.query('CREATE INDEX idx_feature_usage_user_keyset ON feature_usage_events(user_id, created_at DESC, id DESC)');

    // Feature popularity queries
    await db.query('CREATE INDEX idx_feature_usage_feature_time ON feature_usage_events(feature_id, created_at DESC)');

    // Category analysis
    await db.query('CREATE INDEX idx_feature_usage_category_time ON feature_usage_events(feature_category, created_at DESC)');

    // Session grouping
    await db.query('CREATE INDEX idx_feature_usage_session ON feature_usage_events(session_id) WHERE session_id IS NOT NULL');

    // GIN index for metadata queries (JSON contains)
    await db.query('CREATE INDEX idx_feature_usage_metadata ON feature_usage_events USING GIN(metadata jsonb_path_ops)');

    log.info('feature_usage_events table created');
  }

  // ========================================
  // USER SEGMENTS - Behavioral segment definitions
  // ========================================

  if (!(await tableExists('user_segments'))) {
    log.info('Creating user_segments table...');
    await db.query(`
      CREATE TABLE user_segments (
        id TEXT PRIMARY KEY DEFAULT 'seg_' || replace(gen_random_uuid()::text, '-', ''),
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        criteria JSONB NOT NULL DEFAULT '{}',
        is_dynamic BOOLEAN NOT NULL DEFAULT TRUE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        member_count INTEGER NOT NULL DEFAULT 0,
        color TEXT,
        icon TEXT,
        priority INTEGER NOT NULL DEFAULT 0,
        last_calculated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.query('CREATE INDEX idx_user_segments_active ON user_segments(is_active) WHERE is_active = TRUE');
    log.info('user_segments table created');

    // Seed initial segments
    log.info('Seeding user segments...');
    await db.query(`
      INSERT INTO user_segments (id, name, description, criteria, color, icon, priority) VALUES
        ('seg_power_users', 'Power Users',
         'Highly engaged users with 10+ workouts in 30 days',
         '{"min_workouts_30d": 10, "min_sessions_30d": 15}',
         '#10b981', 'zap', 100),

        ('seg_active_regular', 'Active Regular',
         'Consistently active users with 4-9 workouts in 30 days',
         '{"min_workouts_30d": 4, "max_workouts_30d": 9}',
         '#3b82f6', 'activity', 90),

        ('seg_casual', 'Casual Users',
         'Light users with 1-3 workouts in 30 days',
         '{"min_workouts_30d": 1, "max_workouts_30d": 3}',
         '#8b5cf6', 'coffee', 80),

        ('seg_dormant', 'Dormant',
         'No activity in 30+ days',
         '{"inactive_days": 30}',
         '#6b7280', 'moon', 70),

        ('seg_churned', 'Churned',
         'No activity in 90+ days',
         '{"inactive_days": 90}',
         '#ef4444', 'user-x', 60),

        ('seg_new_active', 'Active New Users',
         'Signed up in last 7 days AND completed at least 1 workout',
         '{"signup_days": 7, "min_workouts": 1}',
         '#f59e0b', 'sparkles', 95),

        ('seg_new_inactive', 'Inactive New Users',
         'Signed up in last 7 days but no workouts yet',
         '{"signup_days": 7, "max_workouts": 0}',
         '#fbbf24', 'alert-circle', 85),

        ('seg_social_engaged', 'Socially Engaged',
         '5+ community interactions in 30 days',
         '{"min_social_30d": 5}',
         '#ec4899', 'users', 75),

        ('seg_economy_active', 'Economy Active',
         'Made credit transactions in last 30 days',
         '{"has_credit_activity_30d": true}',
         '#f97316', 'coins', 65),

        ('seg_premium_potential', 'Premium Potential',
         'High engagement but no purchases yet',
         '{"high_engagement": true, "no_purchases": true}',
         '#14b8a6', 'star', 55),

        ('seg_at_risk', 'At Risk',
         'Previously active (10+ sessions), now declining engagement',
         '{"declining_engagement": true, "min_historical_sessions": 10}',
         '#dc2626', 'alert-triangle', 50),

        ('seg_returning', 'Returning Users',
         'Inactive 30+ days, now active again',
         '{"was_dormant": true, "recent_activity": true}',
         '#22c55e', 'refresh-cw', 45)
      ON CONFLICT (id) DO NOTHING
    `);
    log.info('User segments seeded');
  }

  // ========================================
  // USER SEGMENT MEMBERSHIPS - User-to-segment mapping
  // ========================================

  if (!(await tableExists('user_segment_memberships'))) {
    log.info('Creating user_segment_memberships table...');
    await db.query(`
      CREATE TABLE user_segment_memberships (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        segment_id TEXT NOT NULL REFERENCES user_segments(id) ON DELETE CASCADE,
        score REAL NOT NULL DEFAULT 1.0,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        metadata JSONB NOT NULL DEFAULT '{}',
        PRIMARY KEY (user_id, segment_id)
      )
    `);
    await db.query('CREATE INDEX idx_segment_memberships_segment ON user_segment_memberships(segment_id)');
    await db.query('CREATE INDEX idx_segment_memberships_user ON user_segment_memberships(user_id)');
    await db.query('CREATE INDEX idx_segment_memberships_expires ON user_segment_memberships(expires_at) WHERE expires_at IS NOT NULL');
    log.info('user_segment_memberships table created');
  }

  // ========================================
  // USER ACTIVITY SUMMARIES - Denormalized per-user stats
  // ========================================

  if (!(await tableExists('user_activity_summaries'))) {
    log.info('Creating user_activity_summaries table...');
    await db.query(`
      CREATE TABLE user_activity_summaries (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

        -- Session counts
        total_sessions INTEGER NOT NULL DEFAULT 0,
        sessions_7d INTEGER NOT NULL DEFAULT 0,
        sessions_30d INTEGER NOT NULL DEFAULT 0,
        avg_session_duration_seconds REAL NOT NULL DEFAULT 0,

        -- Workout counts
        total_workouts INTEGER NOT NULL DEFAULT 0,
        workouts_7d INTEGER NOT NULL DEFAULT 0,
        workouts_30d INTEGER NOT NULL DEFAULT 0,

        -- Feature interactions
        total_feature_interactions INTEGER NOT NULL DEFAULT 0,
        feature_interactions_7d INTEGER NOT NULL DEFAULT 0,
        feature_interactions_30d INTEGER NOT NULL DEFAULT 0,
        unique_features_used INTEGER NOT NULL DEFAULT 0,

        -- Time-based
        first_activity_at TIMESTAMPTZ,
        last_activity_at TIMESTAMPTZ,
        days_active_total INTEGER NOT NULL DEFAULT 0,
        days_active_7d INTEGER NOT NULL DEFAULT 0,
        days_active_30d INTEGER NOT NULL DEFAULT 0,

        -- Top features (cached JSONB array for fast display)
        top_features JSONB NOT NULL DEFAULT '[]',

        -- Engagement metrics
        engagement_score INTEGER NOT NULL DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
        engagement_trend TEXT CHECK (engagement_trend IN ('rising', 'stable', 'declining', 'churned', 'new')),
        engagement_velocity REAL NOT NULL DEFAULT 0,

        -- Social metrics
        social_interactions_30d INTEGER NOT NULL DEFAULT 0,

        -- Economy metrics
        credit_transactions_30d INTEGER NOT NULL DEFAULT 0,

        -- Cached segments for fast filtering
        current_segments TEXT[] NOT NULL DEFAULT '{}',

        -- Metadata
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Engagement score filtering (for dashboards)
    await db.query('CREATE INDEX idx_user_summaries_engagement ON user_activity_summaries(engagement_score DESC)');

    // Last activity for dormant user queries
    await db.query('CREATE INDEX idx_user_summaries_last_activity ON user_activity_summaries(last_activity_at DESC)');

    // Segment filtering via GIN
    await db.query('CREATE INDEX idx_user_summaries_segments ON user_activity_summaries USING GIN(current_segments)');

    // Workout count filtering
    await db.query('CREATE INDEX idx_user_summaries_workouts_30d ON user_activity_summaries(workouts_30d DESC)');

    log.info('user_activity_summaries table created');
  }

  // ========================================
  // ANALYTICS DAILY ROLLUPS - Pre-aggregated metrics
  // ========================================

  if (!(await tableExists('analytics_daily_rollups'))) {
    log.info('Creating analytics_daily_rollups table...');
    await db.query(`
      CREATE TABLE analytics_daily_rollups (
        id SERIAL PRIMARY KEY,
        rollup_date DATE NOT NULL,
        rollup_type TEXT NOT NULL CHECK (rollup_type IN ('signups', 'features', 'segments', 'engagement', 'economy', 'social')),
        dimension_key TEXT NOT NULL,
        dimension_value TEXT,

        -- Counts
        count_total INTEGER NOT NULL DEFAULT 0,
        count_unique_users INTEGER NOT NULL DEFAULT 0,
        count_new_users INTEGER NOT NULL DEFAULT 0,
        count_returning_users INTEGER NOT NULL DEFAULT 0,

        -- Aggregates
        sum_duration_seconds BIGINT NOT NULL DEFAULT 0,
        avg_duration_seconds REAL,
        sum_interactions INTEGER NOT NULL DEFAULT 0,

        -- Percentiles (p50, p90, p99 stored as JSONB)
        percentiles JSONB NOT NULL DEFAULT '{}',

        -- Comparisons (day-over-day, week-over-week)
        dod_change_pct REAL,
        wow_change_pct REAL,

        -- Metadata
        metadata JSONB NOT NULL DEFAULT '{}',
        calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Unique constraint using index (allows COALESCE)
    await db.query('CREATE UNIQUE INDEX idx_analytics_rollups_unique ON analytics_daily_rollups(rollup_date, rollup_type, dimension_key, COALESCE(dimension_value, \'\'))');

    // Date range queries
    await db.query('CREATE INDEX idx_analytics_rollups_date ON analytics_daily_rollups(rollup_date DESC)');

    // Type + key queries for specific metric lookups
    await db.query('CREATE INDEX idx_analytics_rollups_type_key ON analytics_daily_rollups(rollup_type, dimension_key, rollup_date DESC)');

    // Full keyset pagination
    await db.query('CREATE INDEX idx_analytics_rollups_keyset ON analytics_daily_rollups(rollup_date DESC, id DESC)');

    log.info('analytics_daily_rollups table created');
  }

  // ========================================
  // SIGNUP COHORTS - Cohort retention analysis
  // ========================================

  if (!(await tableExists('signup_cohorts'))) {
    log.info('Creating signup_cohorts table...');
    await db.query(`
      CREATE TABLE signup_cohorts (
        cohort_date DATE PRIMARY KEY,
        cohort_size INTEGER NOT NULL DEFAULT 0,

        -- Retention by period (absolute numbers)
        retained_d1 INTEGER NOT NULL DEFAULT 0,
        retained_d3 INTEGER NOT NULL DEFAULT 0,
        retained_d7 INTEGER NOT NULL DEFAULT 0,
        retained_d14 INTEGER NOT NULL DEFAULT 0,
        retained_d30 INTEGER NOT NULL DEFAULT 0,
        retained_d60 INTEGER NOT NULL DEFAULT 0,
        retained_d90 INTEGER NOT NULL DEFAULT 0,

        -- Feature adoption (users who used each category)
        adopted_workout INTEGER NOT NULL DEFAULT 0,
        adopted_social INTEGER NOT NULL DEFAULT 0,
        adopted_economy INTEGER NOT NULL DEFAULT 0,
        adopted_competition INTEGER NOT NULL DEFAULT 0,

        -- Engagement quality
        avg_workouts_d7 REAL NOT NULL DEFAULT 0,
        avg_workouts_d30 REAL NOT NULL DEFAULT 0,
        avg_sessions_d7 REAL NOT NULL DEFAULT 0,
        avg_sessions_d30 REAL NOT NULL DEFAULT 0,

        -- Revenue
        revenue_total_cents BIGINT NOT NULL DEFAULT 0,
        revenue_per_user_cents REAL NOT NULL DEFAULT 0,
        purchasers_count INTEGER NOT NULL DEFAULT 0,

        -- Metadata
        calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB NOT NULL DEFAULT '{}'
      )
    `);
    await db.query('CREATE INDEX idx_signup_cohorts_date ON signup_cohorts(cohort_date DESC)');
    log.info('signup_cohorts table created');
  }

  // ========================================
  // ADD INDEX FOR NEW USERS QUERIES ON USERS TABLE
  // ========================================

  if (!(await indexExists('idx_users_created_keyset'))) {
    log.info('Creating idx_users_created_keyset index on users table...');
    await db.query('CREATE INDEX idx_users_created_keyset ON users(created_at DESC, id DESC)');
    log.info('idx_users_created_keyset index created');
  }

  // Note: Partial indexes with NOW() are not supported (non-immutable)
  // The idx_users_created_keyset index above handles recent signups efficiently

  // ========================================
  // MATERIALIZED VIEW: Feature Popularity
  // ========================================

  if (!(await viewExists('mv_feature_popularity'))) {
    log.info('Creating mv_feature_popularity materialized view...');
    await db.query(`
      CREATE MATERIALIZED VIEW mv_feature_popularity AS
      SELECT
        fue.feature_id,
        fue.feature_category,
        fd.name as feature_name,
        fd.description as feature_description,
        COUNT(*) as total_uses,
        COUNT(DISTINCT fue.user_id) as unique_users,
        COUNT(*) FILTER (WHERE fue.created_at > NOW() - INTERVAL '24 hours') as uses_24h,
        COUNT(*) FILTER (WHERE fue.created_at > NOW() - INTERVAL '7 days') as uses_7d,
        COUNT(*) FILTER (WHERE fue.created_at > NOW() - INTERVAL '30 days') as uses_30d,
        COUNT(DISTINCT fue.user_id) FILTER (WHERE fue.created_at > NOW() - INTERVAL '24 hours') as users_24h,
        COUNT(DISTINCT fue.user_id) FILTER (WHERE fue.created_at > NOW() - INTERVAL '7 days') as users_7d,
        COUNT(DISTINCT fue.user_id) FILTER (WHERE fue.created_at > NOW() - INTERVAL '30 days') as users_30d,
        AVG(fue.duration_ms) FILTER (WHERE fue.duration_ms IS NOT NULL) as avg_duration_ms,
        NOW() as calculated_at
      FROM feature_usage_events fue
      LEFT JOIN feature_definitions fd ON fd.id = fue.feature_id
      GROUP BY fue.feature_id, fue.feature_category, fd.name, fd.description
    `);

    // Required for CONCURRENTLY refresh
    await db.query('CREATE UNIQUE INDEX idx_mv_feature_popularity ON mv_feature_popularity(feature_id)');
    log.info('mv_feature_popularity materialized view created');
  }

  // ========================================
  // MATERIALIZED VIEW: New Users Summary (daily)
  // ========================================

  if (!(await viewExists('mv_new_users_daily'))) {
    log.info('Creating mv_new_users_daily materialized view...');
    await db.query(`
      CREATE MATERIALIZED VIEW mv_new_users_daily AS
      SELECT
        DATE(created_at) as signup_date,
        COUNT(*) as signup_count,
        COUNT(*) FILTER (WHERE current_archetype_id IS NOT NULL) as with_archetype,
        COUNT(*) FILTER (WHERE total_xp > 0) as with_activity,
        NOW() as calculated_at
      FROM users
      WHERE created_at > NOW() - INTERVAL '90 days'
      GROUP BY DATE(created_at)
      ORDER BY signup_date DESC
    `);
    await db.query('CREATE UNIQUE INDEX idx_mv_new_users_daily ON mv_new_users_daily(signup_date)');
    log.info('mv_new_users_daily materialized view created');
  }

  // ========================================
  // MATERIALIZED VIEW: Segment Counts
  // ========================================

  if (!(await viewExists('mv_segment_counts'))) {
    log.info('Creating mv_segment_counts materialized view...');
    await db.query(`
      CREATE MATERIALIZED VIEW mv_segment_counts AS
      SELECT
        s.id as segment_id,
        s.name as segment_name,
        s.description,
        s.color,
        s.icon,
        s.priority,
        COALESCE(m.member_count, 0) as member_count,
        NOW() as calculated_at
      FROM user_segments s
      LEFT JOIN (
        SELECT segment_id, COUNT(*) as member_count
        FROM user_segment_memberships
        WHERE expires_at IS NULL OR expires_at > NOW()
        GROUP BY segment_id
      ) m ON m.segment_id = s.id
      WHERE s.is_active = TRUE
      ORDER BY s.priority DESC
    `);
    await db.query('CREATE UNIQUE INDEX idx_mv_segment_counts ON mv_segment_counts(segment_id)');
    log.info('mv_segment_counts materialized view created');
  }

  // ========================================
  // ADD ANALYTICS SCHEDULED JOBS
  // ========================================

  // Check if scheduled_jobs table exists
  if (await tableExists('scheduled_jobs')) {
    log.info('Adding analytics scheduled jobs...');

    await db.query(`
      INSERT INTO scheduled_jobs (id, name, cron_expression, handler, is_enabled, description, timeout_seconds)
      VALUES
        ('job_analytics_daily_rollups', 'Analytics Daily Rollups', '15 0 * * *', 'analytics.calculateDailyRollups', TRUE, 'Calculate daily analytics rollups', 300),
        ('job_analytics_user_summaries', 'Update User Summaries', '*/15 * * * *', 'analytics.updateUserSummaries', TRUE, 'Update user activity summaries for active users', 180),
        ('job_analytics_segments', 'Recalculate Segments', '0 * * * *', 'analytics.recalculateSegments', TRUE, 'Recalculate dynamic segment memberships', 300),
        ('job_analytics_cohorts', 'Update Cohort Retention', '30 1 * * *', 'analytics.updateCohortRetention', TRUE, 'Update cohort retention metrics', 600),
        ('job_analytics_refresh_mvs', 'Refresh Analytics MVs', '*/15 * * * *', 'analytics.refreshMaterializedViews', TRUE, 'Refresh analytics materialized views', 120)
      ON CONFLICT (id) DO NOTHING
    `);
    log.info('Analytics scheduled jobs added');
  }

  // ========================================
  // ADD DATA RETENTION POLICIES
  // ========================================

  if (await tableExists('data_retention_policies')) {
    log.info('Adding data retention policies for analytics...');

    await db.query(`
      INSERT INTO data_retention_policies (policy_name, target_table, retention_days, condition_sql, enabled)
      VALUES
        ('feature_usage_events_old', 'feature_usage_events', 365, NULL, TRUE),
        ('analytics_daily_rollups_old', 'analytics_daily_rollups', 730, NULL, TRUE)
      ON CONFLICT (policy_name) DO NOTHING
    `);
    log.info('Data retention policies added');
  }

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  log.info('Creating helper functions...');

  // Function to refresh all analytics materialized views
  await db.query(`
    CREATE OR REPLACE FUNCTION refresh_analytics_mvs()
    RETURNS void AS $$
    BEGIN
      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_feature_popularity;
      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_new_users_daily;
      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_segment_counts;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Function to calculate engagement score
  await db.query(`
    CREATE OR REPLACE FUNCTION calculate_engagement_score(
      p_workouts_30d INTEGER,
      p_sessions_30d INTEGER,
      p_days_active_30d INTEGER,
      p_feature_interactions_30d INTEGER,
      p_social_interactions_30d INTEGER
    )
    RETURNS INTEGER AS $$
    DECLARE
      v_workout_score INTEGER;
      v_session_score INTEGER;
      v_consistency_score INTEGER;
      v_feature_score INTEGER;
      v_social_score INTEGER;
      v_total_score INTEGER;
    BEGIN
      -- Workout score (max 30 points) - 3 points per workout, capped
      v_workout_score := LEAST(p_workouts_30d * 3, 30);

      -- Session score (max 20 points) - 1 point per session, capped
      v_session_score := LEAST(p_sessions_30d, 20);

      -- Consistency score (max 25 points) - based on days active
      v_consistency_score := LEAST(ROUND(p_days_active_30d * 0.83)::INTEGER, 25);

      -- Feature diversity score (max 15 points)
      v_feature_score := LEAST(ROUND(p_feature_interactions_30d * 0.15)::INTEGER, 15);

      -- Social score (max 10 points)
      v_social_score := LEAST(p_social_interactions_30d, 10);

      v_total_score := v_workout_score + v_session_score + v_consistency_score + v_feature_score + v_social_score;

      RETURN LEAST(v_total_score, 100);
    END;
    $$ LANGUAGE plpgsql IMMUTABLE
  `);

  log.info('Helper functions created');
  log.info('Migration 125_user_analytics_system completed successfully');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 125_user_analytics_system');

  // Drop materialized views
  await db.query('DROP MATERIALIZED VIEW IF EXISTS mv_segment_counts');
  await db.query('DROP MATERIALIZED VIEW IF EXISTS mv_new_users_daily');
  await db.query('DROP MATERIALIZED VIEW IF EXISTS mv_feature_popularity');

  // Drop functions
  await db.query('DROP FUNCTION IF EXISTS calculate_engagement_score');
  await db.query('DROP FUNCTION IF EXISTS refresh_analytics_mvs');

  // Drop tables in reverse dependency order
  await db.query('DROP TABLE IF EXISTS signup_cohorts');
  await db.query('DROP TABLE IF EXISTS analytics_daily_rollups');
  await db.query('DROP TABLE IF EXISTS user_activity_summaries');
  await db.query('DROP TABLE IF EXISTS user_segment_memberships');
  await db.query('DROP TABLE IF EXISTS user_segments');
  await db.query('DROP TABLE IF EXISTS feature_usage_events');
  await db.query('DROP TABLE IF EXISTS feature_definitions');

  // Drop indexes on users table
  await db.query('DROP INDEX IF EXISTS idx_users_created_keyset');

  // Remove scheduled jobs
  await db.query(`
    DELETE FROM scheduled_jobs
    WHERE id IN (
      'job_analytics_daily_rollups',
      'job_analytics_user_summaries',
      'job_analytics_segments',
      'job_analytics_cohorts',
      'job_analytics_refresh_mvs'
    )
  `);

  // Remove data retention policies
  await db.query(`
    DELETE FROM data_retention_policies
    WHERE policy_name IN ('feature_usage_events_old', 'analytics_daily_rollups_old')
  `);

  log.info('Migration 125_user_analytics_system rolled back');
}
