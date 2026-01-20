/**
 * Migration 135: Journey Health Scoring System
 *
 * Creates infrastructure for proactive journey health monitoring:
 * - journey_health_scores: Health metrics per journey (engagement_score, progress_rate, risk_level)
 * - journey_health_alerts: Alerts for at-risk journeys
 * - journey_recommendations: AI-generated recommendations
 * - Triggers to update health scores when progress is logged
 *
 * Health score factors:
 * - Days since last progress (higher = lower score)
 * - Progress rate vs expected rate
 * - Milestone completion rate
 * - Consistency of check-ins
 * - Deviation from target trajectory
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

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 135_journey_health_system');

  // ============================================
  // 1. CREATE journey_health_scores TABLE
  // ============================================
  if (!(await tableExists('journey_health_scores'))) {
    log.info('Creating journey_health_scores table...');
    await db.query(`
      CREATE TABLE journey_health_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_journey_id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Core health metrics (0-100 scale)
        health_score INTEGER NOT NULL DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
        engagement_score INTEGER NOT NULL DEFAULT 100 CHECK (engagement_score >= 0 AND engagement_score <= 100),
        consistency_score INTEGER NOT NULL DEFAULT 100 CHECK (consistency_score >= 0 AND consistency_score <= 100),
        momentum_score INTEGER NOT NULL DEFAULT 100 CHECK (momentum_score >= 0 AND momentum_score <= 100),

        -- Progress tracking
        progress_rate NUMERIC(5,2) DEFAULT 0, -- % progress per day vs expected
        expected_daily_progress NUMERIC(5,2) DEFAULT 0, -- Expected % per day
        actual_daily_progress NUMERIC(5,2) DEFAULT 0, -- Actual % per day
        deviation_percentage NUMERIC(5,2) DEFAULT 0, -- How far off track

        -- Risk assessment
        risk_level TEXT NOT NULL DEFAULT 'healthy' CHECK (risk_level IN ('healthy', 'at_risk', 'critical', 'stalled')),
        risk_factors JSONB NOT NULL DEFAULT '[]',
        -- Format: [{ factor: 'no_activity', weight: 30, days: 7 }, { factor: 'missed_milestones', weight: 20, count: 2 }]

        -- Activity tracking
        days_since_last_progress INTEGER DEFAULT 0,
        total_active_days INTEGER DEFAULT 0,
        streak_current INTEGER DEFAULT 0,
        streak_longest INTEGER DEFAULT 0,
        last_activity_at TIMESTAMPTZ,

        -- Milestone tracking
        milestones_total INTEGER DEFAULT 0,
        milestones_completed INTEGER DEFAULT 0,
        milestones_on_track INTEGER DEFAULT 0,
        milestones_behind INTEGER DEFAULT 0,

        -- Check-in tracking
        expected_checkins INTEGER DEFAULT 0,
        actual_checkins INTEGER DEFAULT 0,
        checkin_consistency NUMERIC(5,2) DEFAULT 100, -- % of expected checkins

        -- Trend analysis
        score_trend TEXT DEFAULT 'stable' CHECK (score_trend IN ('improving', 'stable', 'declining', 'critical_decline')),
        score_7d_change INTEGER DEFAULT 0,
        score_30d_change INTEGER DEFAULT 0,

        -- Timestamps
        calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Unique constraint: one health score per user journey
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_journey_health_scores_user_journey
      ON journey_health_scores(user_journey_id)
    `);

    // Index for finding at-risk journeys by user
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_journey_health_scores_user_risk
      ON journey_health_scores(user_id, risk_level, health_score)
    `);

    // Index for filtering by risk level
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_journey_health_scores_risk_level
      ON journey_health_scores(risk_level)
      WHERE risk_level != 'healthy'
    `);

    // Keyset pagination index
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_journey_health_scores_keyset
      ON journey_health_scores(user_id, calculated_at DESC, id DESC)
    `);

    // Index for scheduled recalculation (find stale scores)
    // Note: Cannot use NOW() in partial index - use regular index and filter in queries
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_journey_health_scores_stale
      ON journey_health_scores(calculated_at)
    `);

    log.info('Created journey_health_scores table with indexes');
  }

  // ============================================
  // 2. CREATE journey_health_alerts TABLE
  // ============================================
  if (!(await tableExists('journey_health_alerts'))) {
    log.info('Creating journey_health_alerts table...');
    await db.query(`
      CREATE TABLE journey_health_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_journey_id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        health_score_id UUID REFERENCES journey_health_scores(id) ON DELETE SET NULL,

        -- Alert details
        alert_type TEXT NOT NULL CHECK (alert_type IN (
          'stalled', 'declining', 'missed_milestone', 'off_track',
          'no_activity', 'consistency_drop', 'risk_upgrade', 'approaching_deadline'
        )),
        severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,

        -- Alert context
        trigger_data JSONB NOT NULL DEFAULT '{}',
        -- Format: { days_inactive: 7, missed_milestones: ['m1', 'm2'], progress_gap: 15 }

        -- Alert state
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'dismissed', 'resolved')),
        acknowledged_at TIMESTAMPTZ,
        dismissed_at TIMESTAMPTZ,
        resolved_at TIMESTAMPTZ,

        -- Notification tracking
        notification_sent BOOLEAN DEFAULT FALSE,
        notification_sent_at TIMESTAMPTZ,
        email_sent BOOLEAN DEFAULT FALSE,
        push_sent BOOLEAN DEFAULT FALSE,

        -- Expiry
        expires_at TIMESTAMPTZ,

        -- Timestamps
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Index for active alerts by user
    await db.query(`
      CREATE INDEX idx_journey_health_alerts_user_active
      ON journey_health_alerts(user_id, status, severity DESC)
      WHERE status = 'active'
    `);

    // Index for alerts by journey
    await db.query(`
      CREATE INDEX idx_journey_health_alerts_journey
      ON journey_health_alerts(user_journey_id, status, created_at DESC)
    `);

    // Keyset pagination index
    await db.query(`
      CREATE INDEX idx_journey_health_alerts_keyset
      ON journey_health_alerts(user_id, created_at DESC, id DESC)
    `);

    // Index for finding unnotified alerts
    await db.query(`
      CREATE INDEX idx_journey_health_alerts_unnotified
      ON journey_health_alerts(notification_sent, created_at)
      WHERE notification_sent = FALSE AND status = 'active'
    `);

    // Index for expired alerts cleanup
    await db.query(`
      CREATE INDEX idx_journey_health_alerts_expires
      ON journey_health_alerts(expires_at)
      WHERE expires_at IS NOT NULL AND status = 'active'
    `);

    log.info('Created journey_health_alerts table with indexes');
  }

  // ============================================
  // 3. CREATE journey_recommendations TABLE
  // ============================================
  if (!(await tableExists('journey_recommendations'))) {
    log.info('Creating journey_recommendations table...');
    await db.query(`
      CREATE TABLE journey_recommendations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_journey_id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        health_score_id UUID REFERENCES journey_health_scores(id) ON DELETE SET NULL,

        -- Recommendation details
        recommendation_type TEXT NOT NULL CHECK (recommendation_type IN (
          'increase_frequency', 'set_reminder', 'adjust_goal', 'take_break',
          'celebrate_progress', 'connect_buddy', 'join_challenge', 'simplify_goal',
          'change_approach', 'seek_support', 'restart_journey', 'archive_journey'
        )),
        priority INTEGER NOT NULL DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        action_text TEXT, -- CTA button text
        action_url TEXT, -- Deep link or route

        -- Recommendation context
        reasoning JSONB NOT NULL DEFAULT '{}',
        -- Format: { factors: ['low_engagement', 'missed_deadline'], confidence: 0.85 }

        -- Recommendation state
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'viewed', 'actioned', 'dismissed', 'expired')),
        viewed_at TIMESTAMPTZ,
        actioned_at TIMESTAMPTZ,
        dismissed_at TIMESTAMPTZ,

        -- Feedback
        was_helpful BOOLEAN,
        feedback_text TEXT,
        feedback_at TIMESTAMPTZ,

        -- Expiry
        expires_at TIMESTAMPTZ,

        -- Timestamps
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Index for active recommendations by user
    await db.query(`
      CREATE INDEX idx_journey_recommendations_user_active
      ON journey_recommendations(user_id, priority DESC, created_at DESC)
      WHERE status = 'active'
    `);

    // Index for recommendations by journey
    await db.query(`
      CREATE INDEX idx_journey_recommendations_journey
      ON journey_recommendations(user_journey_id, status, priority DESC)
    `);

    // Keyset pagination index
    await db.query(`
      CREATE INDEX idx_journey_recommendations_keyset
      ON journey_recommendations(user_id, created_at DESC, id DESC)
    `);

    // Index for expired recommendations cleanup
    await db.query(`
      CREATE INDEX idx_journey_recommendations_expires
      ON journey_recommendations(expires_at)
      WHERE expires_at IS NOT NULL AND status = 'active'
    `);

    log.info('Created journey_recommendations table with indexes');
  }

  // ============================================
  // 4. CREATE journey_health_history TABLE (for trend analysis)
  // ============================================
  if (!(await tableExists('journey_health_history'))) {
    log.info('Creating journey_health_history table...');
    await db.query(`
      CREATE TABLE journey_health_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_journey_id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Snapshot of health at this point
        health_score INTEGER NOT NULL,
        engagement_score INTEGER NOT NULL,
        consistency_score INTEGER NOT NULL,
        momentum_score INTEGER NOT NULL,
        risk_level TEXT NOT NULL,

        -- Activity metrics at this point
        days_since_last_progress INTEGER,
        streak_current INTEGER,
        milestones_completed INTEGER,

        -- Recorded date (one entry per day max)
        recorded_date DATE NOT NULL,

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Unique constraint: one history entry per journey per day
    await db.query(`
      CREATE UNIQUE INDEX idx_journey_health_history_unique
      ON journey_health_history(user_journey_id, recorded_date)
    `);

    // Index for trend queries
    await db.query(`
      CREATE INDEX idx_journey_health_history_journey_date
      ON journey_health_history(user_journey_id, recorded_date DESC)
    `);

    // Index for user history
    await db.query(`
      CREATE INDEX idx_journey_health_history_user
      ON journey_health_history(user_id, recorded_date DESC)
    `);

    // BRIN index for time-series queries
    await db.query(`
      CREATE INDEX idx_journey_health_history_brin
      ON journey_health_history USING BRIN(recorded_date)
      WITH (pages_per_range = 128)
    `);

    log.info('Created journey_health_history table with indexes');
  }

  // ============================================
  // 5. ADD COLUMNS TO user_journeys IF NEEDED
  // ============================================
  if (await tableExists('user_journeys')) {
    log.info('Adding health tracking columns to user_journeys...');

    if (!(await columnExists('user_journeys', 'last_progress_at'))) {
      await db.query(`
        ALTER TABLE user_journeys
        ADD COLUMN last_progress_at TIMESTAMPTZ,
        ADD COLUMN total_progress_entries INTEGER DEFAULT 0,
        ADD COLUMN health_score_last_calculated TIMESTAMPTZ
      `);
    }

    // Index for finding journeys needing health recalculation
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_journeys_health_recalc
      ON user_journeys(health_score_last_calculated)
      WHERE status = 'active'
    `);
  }

  // ============================================
  // 6. CREATE HEALTH SCORE CALCULATION FUNCTION
  // ============================================
  log.info('Creating health score calculation function...');

  await db.query(`
    CREATE OR REPLACE FUNCTION calculate_journey_health_score(
      p_user_journey_id TEXT,
      p_user_id TEXT,
      p_journey_start DATE,
      p_journey_target_days INTEGER,
      p_current_progress NUMERIC,
      p_last_activity TIMESTAMPTZ,
      p_total_milestones INTEGER,
      p_completed_milestones INTEGER,
      p_total_checkins INTEGER,
      p_expected_checkins INTEGER
    ) RETURNS TABLE (
      health_score INTEGER,
      engagement_score INTEGER,
      consistency_score INTEGER,
      momentum_score INTEGER,
      risk_level TEXT,
      risk_factors JSONB,
      days_since_last INTEGER
    ) AS $$
    DECLARE
      v_days_since_last INTEGER;
      v_engagement INTEGER;
      v_consistency INTEGER;
      v_momentum INTEGER;
      v_health INTEGER;
      v_risk_level TEXT;
      v_risk_factors JSONB;
      v_expected_progress NUMERIC;
      v_days_elapsed INTEGER;
      v_progress_ratio NUMERIC;
      v_milestone_ratio NUMERIC;
      v_checkin_ratio NUMERIC;
    BEGIN
      -- Calculate days since last activity
      v_days_since_last := COALESCE(
        EXTRACT(DAY FROM NOW() - p_last_activity)::INTEGER,
        CASE WHEN p_journey_start IS NOT NULL
          THEN EXTRACT(DAY FROM NOW() - p_journey_start)::INTEGER
          ELSE 0
        END
      );

      -- Calculate expected progress based on time elapsed
      v_days_elapsed := GREATEST(1, EXTRACT(DAY FROM NOW() - p_journey_start)::INTEGER);
      v_expected_progress := LEAST(100, (v_days_elapsed::NUMERIC / NULLIF(p_journey_target_days, 0)) * 100);

      -- Calculate progress ratio (actual vs expected)
      v_progress_ratio := CASE
        WHEN v_expected_progress > 0 THEN p_current_progress / v_expected_progress
        ELSE 1.0
      END;

      -- Calculate milestone completion ratio
      v_milestone_ratio := CASE
        WHEN p_total_milestones > 0 THEN p_completed_milestones::NUMERIC / p_total_milestones
        ELSE 1.0
      END;

      -- Calculate checkin consistency ratio
      v_checkin_ratio := CASE
        WHEN p_expected_checkins > 0 THEN p_total_checkins::NUMERIC / p_expected_checkins
        ELSE 1.0
      END;

      -- Initialize risk factors array
      v_risk_factors := '[]'::JSONB;

      -- Calculate ENGAGEMENT score (based on activity recency)
      v_engagement := CASE
        WHEN v_days_since_last <= 1 THEN 100
        WHEN v_days_since_last <= 3 THEN 85
        WHEN v_days_since_last <= 7 THEN 70
        WHEN v_days_since_last <= 14 THEN 50
        WHEN v_days_since_last <= 21 THEN 30
        WHEN v_days_since_last <= 30 THEN 15
        ELSE 5
      END;

      -- Add risk factor for inactivity
      IF v_days_since_last > 7 THEN
        v_risk_factors := v_risk_factors || jsonb_build_object(
          'factor', 'inactivity',
          'weight', LEAST(40, v_days_since_last * 3),
          'days', v_days_since_last
        );
      END IF;

      -- Calculate CONSISTENCY score (based on checkin ratio)
      v_consistency := GREATEST(0, LEAST(100, (v_checkin_ratio * 100)::INTEGER));

      -- Add risk factor for low consistency
      IF v_checkin_ratio < 0.5 THEN
        v_risk_factors := v_risk_factors || jsonb_build_object(
          'factor', 'low_consistency',
          'weight', 25,
          'ratio', ROUND(v_checkin_ratio * 100)
        );
      END IF;

      -- Calculate MOMENTUM score (based on progress vs expected)
      v_momentum := CASE
        WHEN v_progress_ratio >= 1.0 THEN 100
        WHEN v_progress_ratio >= 0.8 THEN 85
        WHEN v_progress_ratio >= 0.6 THEN 65
        WHEN v_progress_ratio >= 0.4 THEN 45
        WHEN v_progress_ratio >= 0.2 THEN 25
        ELSE 10
      END;

      -- Boost momentum if milestones are being completed
      IF v_milestone_ratio > 0.5 THEN
        v_momentum := LEAST(100, v_momentum + 10);
      END IF;

      -- Add risk factor for being behind schedule
      IF v_progress_ratio < 0.6 THEN
        v_risk_factors := v_risk_factors || jsonb_build_object(
          'factor', 'behind_schedule',
          'weight', 30,
          'progress_gap', ROUND((1 - v_progress_ratio) * 100)
        );
      END IF;

      -- Add risk factor for missed milestones
      IF p_total_milestones > 0 AND v_milestone_ratio < 0.5 THEN
        v_risk_factors := v_risk_factors || jsonb_build_object(
          'factor', 'missed_milestones',
          'weight', 20,
          'completed', p_completed_milestones,
          'total', p_total_milestones
        );
      END IF;

      -- Calculate overall HEALTH score (weighted average)
      v_health := (
        v_engagement * 0.35 +  -- 35% weight on engagement
        v_consistency * 0.25 + -- 25% weight on consistency
        v_momentum * 0.40      -- 40% weight on momentum/progress
      )::INTEGER;

      -- Determine risk level
      v_risk_level := CASE
        WHEN v_days_since_last > 30 OR v_health < 20 THEN 'stalled'
        WHEN v_days_since_last > 14 OR v_health < 40 THEN 'critical'
        WHEN v_days_since_last > 7 OR v_health < 60 THEN 'at_risk'
        ELSE 'healthy'
      END;

      RETURN QUERY SELECT
        v_health,
        v_engagement,
        v_consistency,
        v_momentum,
        v_risk_level,
        v_risk_factors,
        v_days_since_last;
    END;
    $$ LANGUAGE plpgsql STABLE;
  `);

  // ============================================
  // 7. CREATE TRIGGER TO UPDATE HEALTH ON PROGRESS
  // ============================================
  log.info('Creating progress tracking trigger...');

  await db.query(`
    CREATE OR REPLACE FUNCTION update_journey_progress_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Update the user_journeys table with last progress timestamp
      UPDATE user_journeys
      SET
        last_progress_at = NOW(),
        total_progress_entries = COALESCE(total_progress_entries, 0) + 1,
        updated_at = NOW()
      WHERE id = NEW.journey_id;

      -- Mark health score as needing recalculation
      UPDATE journey_health_scores
      SET
        days_since_last_progress = 0,
        last_activity_at = NOW(),
        updated_at = NOW()
      WHERE user_journey_id = NEW.journey_id;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Only create trigger if journey_progress table exists
  if (await tableExists('journey_progress')) {
    await db.query(`
      DROP TRIGGER IF EXISTS trigger_journey_progress_health ON journey_progress;
      CREATE TRIGGER trigger_journey_progress_health
      AFTER INSERT ON journey_progress
      FOR EACH ROW
      EXECUTE FUNCTION update_journey_progress_timestamp();
    `);
    log.info('Created journey_progress trigger');
  }

  // ============================================
  // 8. CREATE updated_at TRIGGERS
  // ============================================
  log.info('Creating updated_at triggers...');

  await db.query(`
    CREATE OR REPLACE FUNCTION update_journey_health_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await db.query(`
    DROP TRIGGER IF EXISTS trigger_journey_health_scores_updated ON journey_health_scores;
    CREATE TRIGGER trigger_journey_health_scores_updated
    BEFORE UPDATE ON journey_health_scores
    FOR EACH ROW EXECUTE FUNCTION update_journey_health_updated_at();
  `);

  await db.query(`
    DROP TRIGGER IF EXISTS trigger_journey_health_alerts_updated ON journey_health_alerts;
    CREATE TRIGGER trigger_journey_health_alerts_updated
    BEFORE UPDATE ON journey_health_alerts
    FOR EACH ROW EXECUTE FUNCTION update_journey_health_updated_at();
  `);

  await db.query(`
    DROP TRIGGER IF EXISTS trigger_journey_recommendations_updated ON journey_recommendations;
    CREATE TRIGGER trigger_journey_recommendations_updated
    BEFORE UPDATE ON journey_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_journey_health_updated_at();
  `);

  // ============================================
  // 9. ADD ACHIEVEMENTS FOR HEALTH SYSTEM
  // ============================================
  log.info('Adding journey health achievements...');

  const healthAchievements = [
    {
      key: 'journey_healthy_streak_7',
      name: 'Week of Wellness',
      description: 'Maintain a healthy journey score for 7 consecutive days',
      icon: '💚',
      category: 'milestone',
      points: 100,
      rarity: 'common',
    },
    {
      key: 'journey_healthy_streak_30',
      name: 'Month of Momentum',
      description: 'Maintain a healthy journey score for 30 consecutive days',
      icon: '💪',
      category: 'milestone',
      points: 300,
      rarity: 'uncommon',
    },
    {
      key: 'journey_recovery',
      name: 'Back on Track',
      description: 'Recover a stalled journey to healthy status',
      icon: '🔄',
      category: 'milestone',
      points: 150,
      rarity: 'uncommon',
    },
    {
      key: 'journey_all_milestones',
      name: 'Milestone Master',
      description: 'Complete all milestones in a journey',
      icon: '🏁',
      category: 'milestone',
      points: 250,
      rarity: 'rare',
    },
    {
      key: 'journey_ahead_of_schedule',
      name: 'Speed Demon',
      description: 'Complete a journey 20% faster than expected',
      icon: '⚡',
      category: 'milestone',
      points: 200,
      rarity: 'uncommon',
    },
  ];

  for (const achievement of healthAchievements) {
    await db.query(
      `INSERT INTO achievement_definitions (key, name, description, icon, category, points, rarity, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       ON CONFLICT (key) DO NOTHING`,
      [
        achievement.key,
        achievement.name,
        achievement.description,
        achievement.icon,
        achievement.category,
        achievement.points,
        achievement.rarity,
      ]
    );
  }

  log.info(`Added ${healthAchievements.length} journey health achievements`);

  // ============================================
  // 10. ADD SCHEDULED JOB FOR HEALTH RECALCULATION
  // ============================================
  log.info('Adding scheduled job for health score recalculation...');

  if (await tableExists('scheduled_jobs')) {
    await db.query(`
      INSERT INTO scheduled_jobs (id, name, description, cron_expression, command, enabled, metadata)
      VALUES (
        'job_journey_health_recalc',
        'recalculate-journey-health',
        'Recalculate health scores for all active journeys daily',
        '0 4 * * *',
        'SELECT recalculate_all_journey_health_scores()',
        TRUE,
        '{"category": "engagement", "priority": "high"}'::jsonb
      )
      ON CONFLICT (name) DO UPDATE SET
        description = EXCLUDED.description,
        cron_expression = EXCLUDED.cron_expression,
        command = EXCLUDED.command,
        enabled = EXCLUDED.enabled,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    `);
  }

  // ============================================
  // 11. CREATE BATCH RECALCULATION FUNCTION
  // ============================================
  log.info('Creating batch recalculation function...');

  await db.query(`
    CREATE OR REPLACE FUNCTION recalculate_all_journey_health_scores()
    RETURNS TABLE (
      journeys_processed INTEGER,
      alerts_created INTEGER,
      duration_ms INTEGER
    ) AS $$
    DECLARE
      v_start TIMESTAMPTZ;
      v_journeys_processed INTEGER := 0;
      v_alerts_created INTEGER := 0;
      v_journey RECORD;
      v_health RECORD;
      v_old_risk TEXT;
    BEGIN
      v_start := clock_timestamp();

      -- Process all active user journeys
      FOR v_journey IN
        SELECT
          uj.id AS user_journey_id,
          uj.user_id,
          uj.started_at::DATE AS start_date,
          COALESCE(jt.suggested_duration_days, 90) AS target_days,
          COALESCE(uj.current_progress, 0) AS current_progress,
          uj.last_progress_at,
          COALESCE(jsonb_array_length(jt.default_milestones), 0) AS total_milestones,
          COALESCE((
            SELECT COUNT(*) FROM user_milestone_progress ump
            WHERE ump.user_id = uj.user_id
            AND ump.milestone_id IN (
              SELECT (m->>'title')::TEXT FROM jsonb_array_elements(jt.default_milestones) m
            )
            AND ump.completed_at IS NOT NULL
          ), 0) AS completed_milestones,
          COALESCE(uj.total_progress_entries, 0) AS total_checkins,
          GREATEST(1, EXTRACT(DAY FROM NOW() - uj.started_at)::INTEGER) AS expected_checkins
        FROM user_journeys uj
        LEFT JOIN journey_templates jt ON uj.template_id = jt.id
        WHERE uj.status = 'active'
        AND (
          uj.health_score_last_calculated IS NULL
          OR uj.health_score_last_calculated < NOW() - INTERVAL '12 hours'
        )
        LIMIT 1000 -- Process in batches
      LOOP
        -- Get old risk level for comparison
        SELECT risk_level INTO v_old_risk
        FROM journey_health_scores
        WHERE user_journey_id = v_journey.user_journey_id;

        -- Calculate new health score
        SELECT * INTO v_health FROM calculate_journey_health_score(
          v_journey.user_journey_id,
          v_journey.user_id,
          v_journey.start_date,
          v_journey.target_days,
          v_journey.current_progress,
          v_journey.last_progress_at,
          v_journey.total_milestones,
          v_journey.completed_milestones,
          v_journey.total_checkins,
          v_journey.expected_checkins
        );

        -- Upsert health score
        INSERT INTO journey_health_scores (
          user_journey_id, user_id,
          health_score, engagement_score, consistency_score, momentum_score,
          risk_level, risk_factors,
          days_since_last_progress, last_activity_at,
          milestones_total, milestones_completed,
          actual_checkins, expected_checkins,
          calculated_at
        )
        VALUES (
          v_journey.user_journey_id, v_journey.user_id,
          v_health.health_score, v_health.engagement_score, v_health.consistency_score, v_health.momentum_score,
          v_health.risk_level, v_health.risk_factors,
          v_health.days_since_last, v_journey.last_progress_at,
          v_journey.total_milestones, v_journey.completed_milestones,
          v_journey.total_checkins, v_journey.expected_checkins,
          NOW()
        )
        ON CONFLICT (user_journey_id) DO UPDATE SET
          health_score = EXCLUDED.health_score,
          engagement_score = EXCLUDED.engagement_score,
          consistency_score = EXCLUDED.consistency_score,
          momentum_score = EXCLUDED.momentum_score,
          risk_level = EXCLUDED.risk_level,
          risk_factors = EXCLUDED.risk_factors,
          days_since_last_progress = EXCLUDED.days_since_last_progress,
          last_activity_at = EXCLUDED.last_activity_at,
          milestones_total = EXCLUDED.milestones_total,
          milestones_completed = EXCLUDED.milestones_completed,
          actual_checkins = EXCLUDED.actual_checkins,
          expected_checkins = EXCLUDED.expected_checkins,
          calculated_at = NOW(),
          updated_at = NOW();

        -- Update user_journeys timestamp
        UPDATE user_journeys
        SET health_score_last_calculated = NOW()
        WHERE id = v_journey.user_journey_id;

        -- Record history for trend analysis (one per day)
        INSERT INTO journey_health_history (
          user_journey_id, user_id,
          health_score, engagement_score, consistency_score, momentum_score,
          risk_level, days_since_last_progress, streak_current, milestones_completed,
          recorded_date
        )
        VALUES (
          v_journey.user_journey_id, v_journey.user_id,
          v_health.health_score, v_health.engagement_score, v_health.consistency_score, v_health.momentum_score,
          v_health.risk_level, v_health.days_since_last, 0, v_journey.completed_milestones,
          CURRENT_DATE
        )
        ON CONFLICT (user_journey_id, recorded_date) DO UPDATE SET
          health_score = EXCLUDED.health_score,
          engagement_score = EXCLUDED.engagement_score,
          consistency_score = EXCLUDED.consistency_score,
          momentum_score = EXCLUDED.momentum_score,
          risk_level = EXCLUDED.risk_level,
          days_since_last_progress = EXCLUDED.days_since_last_progress,
          milestones_completed = EXCLUDED.milestones_completed;

        -- Create alert if risk level worsened
        IF v_old_risk IS NOT NULL AND v_health.risk_level != v_old_risk THEN
          IF v_health.risk_level IN ('at_risk', 'critical', 'stalled')
             AND v_old_risk NOT IN ('at_risk', 'critical', 'stalled')
          THEN
            INSERT INTO journey_health_alerts (
              user_journey_id, user_id,
              alert_type, severity, title, message,
              trigger_data,
              expires_at
            )
            VALUES (
              v_journey.user_journey_id, v_journey.user_id,
              CASE v_health.risk_level
                WHEN 'stalled' THEN 'stalled'
                WHEN 'critical' THEN 'declining'
                ELSE 'no_activity'
              END,
              CASE v_health.risk_level
                WHEN 'stalled' THEN 'critical'
                WHEN 'critical' THEN 'warning'
                ELSE 'info'
              END,
              CASE v_health.risk_level
                WHEN 'stalled' THEN 'Journey needs attention'
                WHEN 'critical' THEN 'Journey falling behind'
                ELSE 'Journey slowing down'
              END,
              CASE v_health.risk_level
                WHEN 'stalled' THEN 'Your journey has stalled. Consider restarting or adjusting your goals.'
                WHEN 'critical' THEN 'Your progress is falling behind. Let''s get back on track!'
                ELSE 'Your journey could use some attention. A small step today makes a big difference.'
              END,
              v_health.risk_factors,
              NOW() + INTERVAL '7 days'
            );

            v_alerts_created := v_alerts_created + 1;
          END IF;
        END IF;

        v_journeys_processed := v_journeys_processed + 1;
      END LOOP;

      RETURN QUERY SELECT
        v_journeys_processed,
        v_alerts_created,
        EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // ============================================
  // 12. ADD TABLE COMMENTS
  // ============================================
  await db.query(`
    COMMENT ON TABLE journey_health_scores IS 'Health metrics and risk assessment for user journeys';
    COMMENT ON TABLE journey_health_alerts IS 'Alerts generated when journey health degrades';
    COMMENT ON TABLE journey_recommendations IS 'AI-generated recommendations to improve journey health';
    COMMENT ON TABLE journey_health_history IS 'Historical health scores for trend analysis';
    COMMENT ON FUNCTION calculate_journey_health_score IS 'Calculates health score based on engagement, consistency, and momentum';
    COMMENT ON FUNCTION recalculate_all_journey_health_scores IS 'Batch recalculates health scores for all active journeys';
  `);

  log.info('Migration 135_journey_health_system completed successfully');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 135_journey_health_system');

  // Remove scheduled job
  await db.query(`DELETE FROM scheduled_jobs WHERE name = 'recalculate-journey-health'`);

  // Remove achievements
  await db.query(`
    DELETE FROM achievement_definitions WHERE key IN (
      'journey_healthy_streak_7', 'journey_healthy_streak_30',
      'journey_recovery', 'journey_all_milestones', 'journey_ahead_of_schedule'
    )
  `);

  // Drop triggers
  await db.query(`DROP TRIGGER IF EXISTS trigger_journey_progress_health ON journey_progress`);
  await db.query(`DROP TRIGGER IF EXISTS trigger_journey_health_scores_updated ON journey_health_scores`);
  await db.query(`DROP TRIGGER IF EXISTS trigger_journey_health_alerts_updated ON journey_health_alerts`);
  await db.query(`DROP TRIGGER IF EXISTS trigger_journey_recommendations_updated ON journey_recommendations`);

  // Drop functions
  await db.query(`DROP FUNCTION IF EXISTS recalculate_all_journey_health_scores()`);
  await db.query(`DROP FUNCTION IF EXISTS calculate_journey_health_score(TEXT, TEXT, DATE, INTEGER, NUMERIC, TIMESTAMPTZ, INTEGER, INTEGER, INTEGER, INTEGER)`);
  await db.query(`DROP FUNCTION IF EXISTS update_journey_progress_timestamp()`);
  await db.query(`DROP FUNCTION IF EXISTS update_journey_health_updated_at()`);

  // Drop columns from user_journeys
  if (await tableExists('user_journeys')) {
    await db.query(`DROP INDEX IF EXISTS idx_user_journeys_health_recalc`);
    if (await columnExists('user_journeys', 'last_progress_at')) {
      await db.query(`
        ALTER TABLE user_journeys
        DROP COLUMN IF EXISTS last_progress_at,
        DROP COLUMN IF EXISTS total_progress_entries,
        DROP COLUMN IF EXISTS health_score_last_calculated
      `);
    }
  }

  // Drop tables
  await db.query(`DROP TABLE IF EXISTS journey_health_history`);
  await db.query(`DROP TABLE IF EXISTS journey_recommendations`);
  await db.query(`DROP TABLE IF EXISTS journey_health_alerts`);
  await db.query(`DROP TABLE IF EXISTS journey_health_scores`);

  log.info('Migration 135_journey_health_system rolled back successfully');
}
