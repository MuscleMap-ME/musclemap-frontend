/**
 * Migration 134: Long-Term Analytics System
 *
 * Creates comprehensive infrastructure for tracking yearly TU (Training Units),
 * trends, and progress over time:
 *
 * - user_yearly_stats: Yearly aggregates (total_tu, total_workouts, total_exercises, etc.)
 * - user_monthly_stats: Monthly aggregates for trend analysis
 * - user_progress_trends: Computed trends (acceleration, velocity, projected milestones)
 * - Materialized views for efficient querying of historical data
 * - Indexes for time-series queries and keyset pagination
 *
 * TU (Training Units) = A normalized measure of workout volume:
 * TU = (sets * reps * weight_factor * difficulty_factor) / 100
 *
 * This system enables:
 * - Year-in-review summaries
 * - Multi-year progress tracking
 * - Projected milestone calculations
 * - Progress velocity and acceleration analysis
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

async function _indexExists(indexName: string): Promise<boolean> {
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

async function _functionExists(funcName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_proc WHERE proname = $1`,
    [funcName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 134_long_term_analytics');

  // ========================================
  // USER YEARLY STATS - Yearly aggregates
  // ========================================

  if (!(await tableExists('user_yearly_stats'))) {
    log.info('Creating user_yearly_stats table...');
    await db.query(`
      CREATE TABLE user_yearly_stats (
        id TEXT PRIMARY KEY DEFAULT 'uys_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),

        -- Training Units (primary metric)
        total_tu NUMERIC(12,2) NOT NULL DEFAULT 0,
        avg_tu_per_workout NUMERIC(10,2) NOT NULL DEFAULT 0,
        max_tu_single_workout NUMERIC(10,2) NOT NULL DEFAULT 0,
        tu_trend_percent NUMERIC(6,2),

        -- Workout metrics
        total_workouts INTEGER NOT NULL DEFAULT 0,
        total_exercises INTEGER NOT NULL DEFAULT 0,
        total_sets INTEGER NOT NULL DEFAULT 0,
        total_reps INTEGER NOT NULL DEFAULT 0,
        total_duration_minutes INTEGER NOT NULL DEFAULT 0,

        -- Volume metrics
        total_volume_lbs NUMERIC(14,2) NOT NULL DEFAULT 0,
        avg_workout_duration_minutes NUMERIC(8,2) NOT NULL DEFAULT 0,
        avg_sets_per_workout NUMERIC(6,2) NOT NULL DEFAULT 0,
        avg_reps_per_set NUMERIC(6,2) NOT NULL DEFAULT 0,

        -- Consistency metrics
        active_days INTEGER NOT NULL DEFAULT 0,
        workout_days INTEGER NOT NULL DEFAULT 0,
        longest_streak INTEGER NOT NULL DEFAULT 0,
        avg_workouts_per_week NUMERIC(5,2) NOT NULL DEFAULT 0,
        consistency_score INTEGER NOT NULL DEFAULT 0 CHECK (consistency_score >= 0 AND consistency_score <= 100),

        -- Character stats growth (end of year values)
        strength_gained NUMERIC(8,2) NOT NULL DEFAULT 0,
        constitution_gained NUMERIC(8,2) NOT NULL DEFAULT 0,
        dexterity_gained NUMERIC(8,2) NOT NULL DEFAULT 0,
        power_gained NUMERIC(8,2) NOT NULL DEFAULT 0,
        endurance_gained NUMERIC(8,2) NOT NULL DEFAULT 0,
        vitality_gained NUMERIC(8,2) NOT NULL DEFAULT 0,

        -- Economy metrics
        credits_earned INTEGER NOT NULL DEFAULT 0,
        credits_spent INTEGER NOT NULL DEFAULT 0,
        xp_earned INTEGER NOT NULL DEFAULT 0,
        levels_gained INTEGER NOT NULL DEFAULT 0,

        -- Social metrics
        high_fives_sent INTEGER NOT NULL DEFAULT 0,
        high_fives_received INTEGER NOT NULL DEFAULT 0,
        competitions_entered INTEGER NOT NULL DEFAULT 0,
        competitions_won INTEGER NOT NULL DEFAULT 0,

        -- Personal records
        prs_set INTEGER NOT NULL DEFAULT 0,

        -- Top data (cached JSONB for fast display)
        top_exercises JSONB NOT NULL DEFAULT '[]',
        top_muscle_groups JSONB NOT NULL DEFAULT '[]',
        monthly_breakdown JSONB NOT NULL DEFAULT '[]',

        -- Achievement highlights
        achievements_unlocked INTEGER NOT NULL DEFAULT 0,
        milestones_completed INTEGER NOT NULL DEFAULT 0,

        -- Metadata
        calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_complete BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT uq_user_yearly_stats UNIQUE (user_id, year)
      )
    `);

    // Indexes for efficient queries
    await db.query('CREATE INDEX idx_user_yearly_stats_user_year ON user_yearly_stats(user_id, year DESC)');
    await db.query('CREATE INDEX idx_user_yearly_stats_year ON user_yearly_stats(year DESC)');
    await db.query('CREATE INDEX idx_user_yearly_stats_tu ON user_yearly_stats(total_tu DESC)');
    await db.query('CREATE INDEX idx_user_yearly_stats_calculated ON user_yearly_stats(calculated_at)');

    log.info('user_yearly_stats table created');
  }

  // ========================================
  // USER MONTHLY STATS - Monthly aggregates for trend analysis
  // ========================================

  if (!(await tableExists('user_monthly_stats'))) {
    log.info('Creating user_monthly_stats table...');
    await db.query(`
      CREATE TABLE user_monthly_stats (
        id TEXT PRIMARY KEY DEFAULT 'ums_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
        month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),

        -- Training Units
        total_tu NUMERIC(10,2) NOT NULL DEFAULT 0,
        avg_tu_per_workout NUMERIC(8,2) NOT NULL DEFAULT 0,
        tu_change_from_prev_month NUMERIC(6,2),

        -- Workout metrics
        total_workouts INTEGER NOT NULL DEFAULT 0,
        total_exercises INTEGER NOT NULL DEFAULT 0,
        total_sets INTEGER NOT NULL DEFAULT 0,
        total_reps INTEGER NOT NULL DEFAULT 0,
        total_duration_minutes INTEGER NOT NULL DEFAULT 0,

        -- Volume metrics
        total_volume_lbs NUMERIC(12,2) NOT NULL DEFAULT 0,
        avg_workout_duration_minutes NUMERIC(6,2) NOT NULL DEFAULT 0,

        -- Consistency
        active_days INTEGER NOT NULL DEFAULT 0,
        workout_days INTEGER NOT NULL DEFAULT 0,
        current_streak INTEGER NOT NULL DEFAULT 0,
        consistency_score INTEGER NOT NULL DEFAULT 0 CHECK (consistency_score >= 0 AND consistency_score <= 100),

        -- Character stats change
        strength_delta NUMERIC(6,2) NOT NULL DEFAULT 0,
        constitution_delta NUMERIC(6,2) NOT NULL DEFAULT 0,
        dexterity_delta NUMERIC(6,2) NOT NULL DEFAULT 0,
        power_delta NUMERIC(6,2) NOT NULL DEFAULT 0,
        endurance_delta NUMERIC(6,2) NOT NULL DEFAULT 0,
        vitality_delta NUMERIC(6,2) NOT NULL DEFAULT 0,

        -- Economy
        credits_earned INTEGER NOT NULL DEFAULT 0,
        credits_spent INTEGER NOT NULL DEFAULT 0,
        xp_earned INTEGER NOT NULL DEFAULT 0,

        -- Social
        high_fives_sent INTEGER NOT NULL DEFAULT 0,
        high_fives_received INTEGER NOT NULL DEFAULT 0,

        -- PRs
        prs_set INTEGER NOT NULL DEFAULT 0,

        -- Top exercises for the month
        top_exercises JSONB NOT NULL DEFAULT '[]',

        -- Week-by-week breakdown
        weekly_breakdown JSONB NOT NULL DEFAULT '[]',

        -- Metadata
        calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_complete BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT uq_user_monthly_stats UNIQUE (user_id, year, month)
      )
    `);

    // Indexes
    await db.query('CREATE INDEX idx_user_monthly_stats_user_date ON user_monthly_stats(user_id, year DESC, month DESC)');
    await db.query('CREATE INDEX idx_user_monthly_stats_year_month ON user_monthly_stats(year, month)');
    await db.query('CREATE INDEX idx_user_monthly_stats_keyset ON user_monthly_stats(user_id, year DESC, month DESC, id DESC)');
    await db.query('CREATE INDEX idx_user_monthly_stats_tu ON user_monthly_stats(total_tu DESC)');

    log.info('user_monthly_stats table created');
  }

  // ========================================
  // USER PROGRESS TRENDS - Computed trends and projections
  // ========================================

  if (!(await tableExists('user_progress_trends'))) {
    log.info('Creating user_progress_trends table...');
    await db.query(`
      CREATE TABLE user_progress_trends (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

        -- Current velocity (rate of progress per month)
        tu_velocity NUMERIC(8,2) NOT NULL DEFAULT 0,
        workout_velocity NUMERIC(6,2) NOT NULL DEFAULT 0,
        volume_velocity NUMERIC(10,2) NOT NULL DEFAULT 0,
        xp_velocity NUMERIC(8,2) NOT NULL DEFAULT 0,
        strength_velocity NUMERIC(6,2) NOT NULL DEFAULT 0,

        -- Acceleration (change in velocity)
        tu_acceleration NUMERIC(8,4) NOT NULL DEFAULT 0,
        workout_acceleration NUMERIC(6,4) NOT NULL DEFAULT 0,
        strength_acceleration NUMERIC(6,4) NOT NULL DEFAULT 0,

        -- Trend direction
        tu_trend TEXT CHECK (tu_trend IN ('accelerating', 'steady', 'decelerating', 'stagnant', 'new')),
        workout_trend TEXT CHECK (workout_trend IN ('accelerating', 'steady', 'decelerating', 'stagnant', 'new')),
        overall_trend TEXT CHECK (overall_trend IN ('excellent', 'good', 'stable', 'declining', 'at_risk', 'new')),

        -- Projected milestones (stored as JSONB for flexibility)
        projected_milestones JSONB NOT NULL DEFAULT '[]',

        -- Projected values (for next month/quarter/year)
        projected_tu_next_month NUMERIC(10,2),
        projected_tu_next_quarter NUMERIC(12,2),
        projected_tu_next_year NUMERIC(14,2),
        projected_workouts_next_month INTEGER,
        projected_level_up_date DATE,

        -- Historical comparison
        tu_vs_prev_month_pct NUMERIC(6,2),
        tu_vs_prev_quarter_pct NUMERIC(6,2),
        tu_vs_prev_year_pct NUMERIC(6,2),
        workouts_vs_prev_month_pct NUMERIC(6,2),

        -- Best periods
        best_month JSONB,
        best_quarter JSONB,
        best_year JSONB,

        -- Regression model coefficients (for projections)
        regression_coefficients JSONB NOT NULL DEFAULT '{}',

        -- Confidence scores (0-100)
        projection_confidence INTEGER NOT NULL DEFAULT 0 CHECK (projection_confidence >= 0 AND projection_confidence <= 100),

        -- Streak analysis
        current_streak INTEGER NOT NULL DEFAULT 0,
        longest_streak INTEGER NOT NULL DEFAULT 0,
        streak_health TEXT CHECK (streak_health IN ('strong', 'healthy', 'at_risk', 'broken', 'new')),
        days_until_streak_milestone INTEGER,

        -- Metadata
        data_points_count INTEGER NOT NULL DEFAULT 0,
        earliest_data_date DATE,
        latest_data_date DATE,
        calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Indexes
    await db.query('CREATE INDEX idx_user_progress_trends_overall ON user_progress_trends(overall_trend)');
    await db.query('CREATE INDEX idx_user_progress_trends_velocity ON user_progress_trends(tu_velocity DESC)');
    await db.query('CREATE INDEX idx_user_progress_trends_calculated ON user_progress_trends(calculated_at)');

    log.info('user_progress_trends table created');
  }

  // ========================================
  // MATERIALIZED VIEW: All-Time Leaderboard by TU
  // ========================================

  if (!(await viewExists('mv_all_time_tu_leaderboard'))) {
    log.info('Creating mv_all_time_tu_leaderboard materialized view...');
    await db.query(`
      CREATE MATERIALIZED VIEW mv_all_time_tu_leaderboard AS
      SELECT
        uys.user_id,
        u.username,
        u.avatar_url,
        SUM(uys.total_tu) as lifetime_tu,
        SUM(uys.total_workouts) as lifetime_workouts,
        SUM(uys.total_volume_lbs) as lifetime_volume_lbs,
        SUM(uys.prs_set) as lifetime_prs,
        COUNT(DISTINCT uys.year) as active_years,
        MIN(uys.year) as first_active_year,
        MAX(uys.year) as last_active_year,
        RANK() OVER (ORDER BY SUM(uys.total_tu) DESC) as rank,
        NOW() as calculated_at
      FROM user_yearly_stats uys
      JOIN users u ON u.id = uys.user_id
      LEFT JOIN user_privacy_mode pm ON pm.user_id = uys.user_id
      WHERE (pm.opt_out_leaderboards IS NULL OR pm.opt_out_leaderboards = FALSE)
        AND (pm.minimalist_mode IS NULL OR pm.minimalist_mode = FALSE)
      GROUP BY uys.user_id, u.username, u.avatar_url
      ORDER BY lifetime_tu DESC
    `);

    await db.query('CREATE UNIQUE INDEX idx_mv_all_time_tu_lb_user ON mv_all_time_tu_leaderboard(user_id)');
    await db.query('CREATE INDEX idx_mv_all_time_tu_lb_rank ON mv_all_time_tu_leaderboard(rank)');

    log.info('mv_all_time_tu_leaderboard materialized view created');
  }

  // ========================================
  // MATERIALIZED VIEW: Monthly TU Trends (global)
  // ========================================

  if (!(await viewExists('mv_monthly_tu_trends'))) {
    log.info('Creating mv_monthly_tu_trends materialized view...');
    await db.query(`
      CREATE MATERIALIZED VIEW mv_monthly_tu_trends AS
      SELECT
        year,
        month,
        COUNT(DISTINCT user_id) as active_users,
        SUM(total_tu) as total_tu,
        AVG(total_tu) as avg_tu_per_user,
        SUM(total_workouts) as total_workouts,
        AVG(total_workouts) as avg_workouts_per_user,
        SUM(total_volume_lbs) as total_volume_lbs,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_tu) as median_tu,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY total_tu) as p90_tu,
        NOW() as calculated_at
      FROM user_monthly_stats
      GROUP BY year, month
      ORDER BY year DESC, month DESC
    `);

    await db.query('CREATE UNIQUE INDEX idx_mv_monthly_tu_trends ON mv_monthly_tu_trends(year, month)');

    log.info('mv_monthly_tu_trends materialized view created');
  }

  // ========================================
  // FUNCTION: Calculate TU from workout data
  // ========================================

  log.info('Creating TU calculation function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION calculate_tu(
      p_sets INTEGER,
      p_reps INTEGER,
      p_weight NUMERIC,
      p_difficulty INTEGER DEFAULT 2,
      p_is_compound BOOLEAN DEFAULT FALSE
    )
    RETURNS NUMERIC AS $$
    DECLARE
      v_weight_factor NUMERIC;
      v_difficulty_factor NUMERIC;
      v_compound_bonus NUMERIC;
      v_tu NUMERIC;
    BEGIN
      -- Weight factor: log scale to normalize across different exercises
      -- A 100lb lift = 1.0, 200lb = ~1.15, 400lb = ~1.3
      v_weight_factor := CASE
        WHEN p_weight IS NULL OR p_weight <= 0 THEN 0.5  -- Bodyweight exercises
        ELSE GREATEST(0.5, LN(p_weight + 1) / LN(100))
      END;

      -- Difficulty factor (1-5 scale)
      v_difficulty_factor := 0.8 + (COALESCE(p_difficulty, 2) * 0.1);

      -- Compound movement bonus (20% more TU)
      v_compound_bonus := CASE WHEN p_is_compound THEN 1.2 ELSE 1.0 END;

      -- Calculate TU
      v_tu := (COALESCE(p_sets, 0) * COALESCE(p_reps, 0) * v_weight_factor * v_difficulty_factor * v_compound_bonus) / 100.0;

      RETURN ROUND(v_tu, 2);
    END;
    $$ LANGUAGE plpgsql IMMUTABLE
  `);

  // ========================================
  // FUNCTION: Calculate progress velocity
  // ========================================

  log.info('Creating progress velocity function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION calculate_progress_velocity(
      p_user_id TEXT,
      p_metric TEXT,
      p_months INTEGER DEFAULT 3
    )
    RETURNS NUMERIC AS $$
    DECLARE
      v_velocity NUMERIC;
      v_values NUMERIC[];
      v_n INTEGER;
    BEGIN
      -- Get recent monthly values for the specified metric
      SELECT ARRAY_AGG(
        CASE p_metric
          WHEN 'tu' THEN total_tu
          WHEN 'workouts' THEN total_workouts::NUMERIC
          WHEN 'volume' THEN total_volume_lbs
          WHEN 'xp' THEN xp_earned::NUMERIC
          WHEN 'strength' THEN strength_delta
          ELSE 0
        END ORDER BY year DESC, month DESC
      )
      INTO v_values
      FROM user_monthly_stats
      WHERE user_id = p_user_id
        AND (year * 12 + month) >= (EXTRACT(YEAR FROM NOW())::INTEGER * 12 + EXTRACT(MONTH FROM NOW())::INTEGER - p_months);

      v_n := COALESCE(array_length(v_values, 1), 0);

      IF v_n < 2 THEN
        RETURN 0;
      END IF;

      -- Simple velocity: average change per month
      v_velocity := (v_values[1] - v_values[v_n]) / (v_n - 1);

      RETURN ROUND(v_velocity, 2);
    END;
    $$ LANGUAGE plpgsql STABLE
  `);

  // ========================================
  // FUNCTION: Project milestone date
  // ========================================

  log.info('Creating milestone projection function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION project_milestone_date(
      p_current_value NUMERIC,
      p_target_value NUMERIC,
      p_velocity NUMERIC
    )
    RETURNS DATE AS $$
    DECLARE
      v_remaining NUMERIC;
      v_months_to_target NUMERIC;
    BEGIN
      IF p_velocity IS NULL OR p_velocity <= 0 THEN
        RETURN NULL;  -- Cannot project without positive velocity
      END IF;

      v_remaining := p_target_value - p_current_value;

      IF v_remaining <= 0 THEN
        RETURN CURRENT_DATE;  -- Already achieved
      END IF;

      v_months_to_target := v_remaining / p_velocity;

      -- Cap at 10 years to avoid unrealistic projections
      IF v_months_to_target > 120 THEN
        RETURN NULL;
      END IF;

      RETURN CURRENT_DATE + (v_months_to_target * 30)::INTEGER;
    END;
    $$ LANGUAGE plpgsql IMMUTABLE
  `);

  // ========================================
  // FUNCTION: Get year-in-review data
  // ========================================

  log.info('Creating year-in-review function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION get_year_in_review(
      p_user_id TEXT,
      p_year INTEGER
    )
    RETURNS JSONB AS $$
    DECLARE
      v_yearly_stats RECORD;
      v_prev_year_stats RECORD;
      v_monthly_data JSONB;
      v_result JSONB;
    BEGIN
      -- Get current year stats
      SELECT * INTO v_yearly_stats
      FROM user_yearly_stats
      WHERE user_id = p_user_id AND year = p_year;

      -- Get previous year for comparison
      SELECT * INTO v_prev_year_stats
      FROM user_yearly_stats
      WHERE user_id = p_user_id AND year = p_year - 1;

      -- Get monthly breakdown
      SELECT jsonb_agg(
        jsonb_build_object(
          'month', month,
          'tu', total_tu,
          'workouts', total_workouts,
          'volume', total_volume_lbs
        ) ORDER BY month
      )
      INTO v_monthly_data
      FROM user_monthly_stats
      WHERE user_id = p_user_id AND year = p_year;

      -- Build result
      v_result := jsonb_build_object(
        'year', p_year,
        'summary', CASE WHEN v_yearly_stats IS NOT NULL THEN
          jsonb_build_object(
            'totalTu', v_yearly_stats.total_tu,
            'totalWorkouts', v_yearly_stats.total_workouts,
            'totalVolumeLbs', v_yearly_stats.total_volume_lbs,
            'activeDays', v_yearly_stats.active_days,
            'longestStreak', v_yearly_stats.longest_streak,
            'prsSet', v_yearly_stats.prs_set,
            'creditsEarned', v_yearly_stats.credits_earned,
            'xpEarned', v_yearly_stats.xp_earned
          )
        ELSE NULL END,
        'comparison', CASE WHEN v_prev_year_stats IS NOT NULL THEN
          jsonb_build_object(
            'tuChange', ROUND(((v_yearly_stats.total_tu - v_prev_year_stats.total_tu) / NULLIF(v_prev_year_stats.total_tu, 0)) * 100, 1),
            'workoutsChange', ROUND(((v_yearly_stats.total_workouts::NUMERIC - v_prev_year_stats.total_workouts) / NULLIF(v_prev_year_stats.total_workouts, 0)) * 100, 1),
            'volumeChange', ROUND(((v_yearly_stats.total_volume_lbs - v_prev_year_stats.total_volume_lbs) / NULLIF(v_prev_year_stats.total_volume_lbs, 0)) * 100, 1)
          )
        ELSE NULL END,
        'monthlyBreakdown', COALESCE(v_monthly_data, '[]'::jsonb),
        'topExercises', COALESCE(v_yearly_stats.top_exercises, '[]'::jsonb),
        'topMuscleGroups', COALESCE(v_yearly_stats.top_muscle_groups, '[]'::jsonb)
      );

      RETURN v_result;
    END;
    $$ LANGUAGE plpgsql STABLE
  `);

  // ========================================
  // SCHEDULED JOBS
  // ========================================

  if (await tableExists('scheduled_jobs')) {
    log.info('Adding long-term analytics scheduled jobs...');

    await db.query(`
      INSERT INTO scheduled_jobs (id, name, cron_expression, command, enabled, description)
      VALUES
        ('job_monthly_stats_rollup', 'Monthly Stats Rollup', '0 2 1 * *', 'analytics.calculateMonthlyStats', TRUE, 'Calculate monthly stats on the 1st of each month'),
        ('job_yearly_stats_rollup', 'Yearly Stats Rollup', '0 3 1 1 *', 'analytics.calculateYearlyStats', TRUE, 'Calculate yearly stats on January 1st'),
        ('job_progress_trends_update', 'Update Progress Trends', '0 4 * * *', 'analytics.updateProgressTrends', TRUE, 'Update progress trends daily'),
        ('job_refresh_tu_leaderboard', 'Refresh TU Leaderboard', '0 * * * *', 'analytics.refreshTuLeaderboard', TRUE, 'Refresh all-time TU leaderboard hourly')
      ON CONFLICT (id) DO NOTHING
    `);

    log.info('Long-term analytics scheduled jobs added');
  }

  // ========================================
  // DATA RETENTION POLICIES
  // ========================================

  if (await tableExists('data_retention_policies')) {
    log.info('Adding data retention policies for long-term analytics...');

    await db.query(`
      INSERT INTO data_retention_policies (policy_name, target_table, retention_days, condition_sql, enabled)
      VALUES
        ('user_monthly_stats_old', 'user_monthly_stats', 2555, 'is_complete = TRUE', TRUE),
        ('user_progress_trends_stale', 'user_progress_trends', 0, NULL, FALSE)
      ON CONFLICT (policy_name) DO NOTHING
    `);

    log.info('Data retention policies added');
  }

  // ========================================
  // TRIGGER: Auto-update calculated_at
  // ========================================

  log.info('Creating trigger functions...');

  await db.query(`
    CREATE OR REPLACE FUNCTION update_long_term_analytics_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Apply trigger to all tables
  for (const table of ['user_yearly_stats', 'user_monthly_stats', 'user_progress_trends']) {
    const triggerName = `trg_${table}_updated_at`;
    await db.query(`
      DROP TRIGGER IF EXISTS ${triggerName} ON ${table};
      CREATE TRIGGER ${triggerName}
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION update_long_term_analytics_timestamp()
    `);
  }

  // ========================================
  // FUNCTION: Refresh all long-term MVs
  // ========================================

  log.info('Creating refresh function for long-term analytics MVs...');
  await db.query(`
    CREATE OR REPLACE FUNCTION refresh_long_term_analytics_mvs()
    RETURNS void AS $$
    BEGIN
      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_all_time_tu_leaderboard;
      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_tu_trends;
    END;
    $$ LANGUAGE plpgsql
  `);

  log.info('Migration 134_long_term_analytics completed successfully');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 134_long_term_analytics');

  // Drop functions
  await db.query('DROP FUNCTION IF EXISTS refresh_long_term_analytics_mvs()');
  await db.query('DROP FUNCTION IF EXISTS get_year_in_review(TEXT, INTEGER)');
  await db.query('DROP FUNCTION IF EXISTS project_milestone_date(NUMERIC, NUMERIC, NUMERIC)');
  await db.query('DROP FUNCTION IF EXISTS calculate_progress_velocity(TEXT, TEXT, INTEGER)');
  await db.query('DROP FUNCTION IF EXISTS calculate_tu(INTEGER, INTEGER, NUMERIC, INTEGER, BOOLEAN)');
  await db.query('DROP FUNCTION IF EXISTS update_long_term_analytics_timestamp()');

  // Drop materialized views
  await db.query('DROP MATERIALIZED VIEW IF EXISTS mv_monthly_tu_trends');
  await db.query('DROP MATERIALIZED VIEW IF EXISTS mv_all_time_tu_leaderboard');

  // Drop tables
  await db.query('DROP TABLE IF EXISTS user_progress_trends CASCADE');
  await db.query('DROP TABLE IF EXISTS user_monthly_stats CASCADE');
  await db.query('DROP TABLE IF EXISTS user_yearly_stats CASCADE');

  // Remove scheduled jobs
  if (await tableExists('scheduled_jobs')) {
    await db.query(`
      DELETE FROM scheduled_jobs
      WHERE id IN (
        'job_monthly_stats_rollup',
        'job_yearly_stats_rollup',
        'job_progress_trends_update',
        'job_refresh_tu_leaderboard'
      )
    `);
  }

  // Remove data retention policies
  if (await tableExists('data_retention_policies')) {
    await db.query(`
      DELETE FROM data_retention_policies
      WHERE policy_name IN ('user_monthly_stats_old', 'user_progress_trends_stale')
    `);
  }

  log.info('Migration 134_long_term_analytics rolled back');
}
