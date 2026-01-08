/**
 * Migration: Career Readiness System
 *
 * Extends the existing PT test system with:
 * 1. user_career_goals - User's target career standards
 * 2. career_readiness_cache - Cached readiness calculations
 * 3. team_readiness_config - Hangout-level team readiness settings
 * 4. team_readiness_permissions - Member opt-in for team visibility
 * 5. recertification_schedules - Recertification reminders
 * 6. Enhanced pt_tests with additional career-specific fields
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 039_career_readiness');

  // =============================================
  // ENHANCE PT_TESTS TABLE
  // =============================================

  if (await tableExists('pt_tests')) {
    // Add career-specific fields to pt_tests
    if (!(await columnExists('pt_tests', 'category'))) {
      log.info('Adding category column to pt_tests...');
      await db.query(`
        ALTER TABLE pt_tests
        ADD COLUMN category TEXT DEFAULT 'military'
        CHECK (category IN ('military', 'firefighter', 'law_enforcement', 'special_operations', 'civil_service', 'general'))
      `);
    }

    if (!(await columnExists('pt_tests', 'recertification_months'))) {
      log.info('Adding recertification_months to pt_tests...');
      await db.query(`ALTER TABLE pt_tests ADD COLUMN recertification_months INTEGER`);
    }

    if (!(await columnExists('pt_tests', 'exercise_mappings'))) {
      log.info('Adding exercise_mappings to pt_tests...');
      await db.query(`ALTER TABLE pt_tests ADD COLUMN exercise_mappings JSONB DEFAULT '{}'`);
    }

    if (!(await columnExists('pt_tests', 'tips'))) {
      log.info('Adding tips to pt_tests...');
      await db.query(`ALTER TABLE pt_tests ADD COLUMN tips JSONB DEFAULT '[]'`);
    }

    if (!(await columnExists('pt_tests', 'icon'))) {
      log.info('Adding icon to pt_tests...');
      await db.query(`ALTER TABLE pt_tests ADD COLUMN icon TEXT`);
    }

    if (!(await columnExists('pt_tests', 'active'))) {
      log.info('Adding active flag to pt_tests...');
      await db.query(`ALTER TABLE pt_tests ADD COLUMN active BOOLEAN DEFAULT true`);
    }
  }

  // =============================================
  // USER CAREER GOALS
  // =============================================

  if (!(await tableExists('user_career_goals'))) {
    log.info('Creating user_career_goals table...');
    await db.query(`
      CREATE TABLE user_career_goals (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pt_test_id TEXT NOT NULL REFERENCES pt_tests(id),

        -- Goal Configuration
        target_date DATE,
        priority TEXT DEFAULT 'primary' CHECK (priority IN ('primary', 'secondary')),
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'abandoned')),

        -- Agency Context
        agency_name TEXT,
        notes TEXT,

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        achieved_at TIMESTAMPTZ,

        UNIQUE(user_id, pt_test_id)
      )
    `);

    await db.query(`CREATE INDEX idx_career_goals_user ON user_career_goals(user_id)`);
    await db.query(`CREATE INDEX idx_career_goals_status ON user_career_goals(status)`);
    await db.query(`CREATE INDEX idx_career_goals_target ON user_career_goals(target_date)`);
  }

  // =============================================
  // CAREER READINESS CACHE
  // =============================================

  if (!(await tableExists('career_readiness_cache'))) {
    log.info('Creating career_readiness_cache table...');
    await db.query(`
      CREATE TABLE career_readiness_cache (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        goal_id TEXT NOT NULL REFERENCES user_career_goals(id) ON DELETE CASCADE,

        -- Cached Values
        readiness_score REAL,
        status TEXT CHECK (status IN ('ready', 'at_risk', 'not_ready', 'no_data')),
        events_passed INTEGER DEFAULT 0,
        events_total INTEGER DEFAULT 0,
        weak_events JSONB DEFAULT '[]',

        -- Source
        last_assessment_id TEXT REFERENCES user_pt_results(id),
        last_assessment_at TIMESTAMPTZ,

        -- Cache Control
        computed_at TIMESTAMPTZ DEFAULT NOW(),

        UNIQUE(user_id, goal_id)
      )
    `);

    await db.query(`CREATE INDEX idx_readiness_cache_user ON career_readiness_cache(user_id)`);
    await db.query(`CREATE INDEX idx_readiness_cache_goal ON career_readiness_cache(goal_id)`);
  }

  // =============================================
  // TEAM READINESS CONFIG
  // =============================================

  if (!(await tableExists('team_readiness_config'))) {
    log.info('Creating team_readiness_config table...');
    await db.query(`
      CREATE TABLE team_readiness_config (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        hangout_id TEXT NOT NULL REFERENCES hangouts(id) ON DELETE CASCADE,

        -- Configuration
        enabled BOOLEAN DEFAULT false,
        pt_test_id TEXT REFERENCES pt_tests(id),
        require_opt_in BOOLEAN DEFAULT true,
        visible_to TEXT[] DEFAULT '{admin}',
        show_individual_scores BOOLEAN DEFAULT true,
        show_aggregate_only BOOLEAN DEFAULT false,

        -- Alerts
        notification_threshold REAL,
        notify_on_below_threshold BOOLEAN DEFAULT false,

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        UNIQUE(hangout_id)
      )
    `);
  }

  // =============================================
  // TEAM READINESS PERMISSIONS (Member Opt-In)
  // =============================================

  if (!(await tableExists('team_readiness_permissions'))) {
    log.info('Creating team_readiness_permissions table...');
    await db.query(`
      CREATE TABLE team_readiness_permissions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        hangout_id TEXT NOT NULL REFERENCES hangouts(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Permission Type
        permission_type TEXT NOT NULL CHECK (permission_type IN ('viewer', 'member')),
        -- viewer: Can see team readiness dashboard
        -- member: Shares their readiness data with the team

        -- Scope
        pt_test_id TEXT REFERENCES pt_tests(id),

        -- Granular Controls (for members)
        share_score BOOLEAN DEFAULT true,
        share_assessment_dates BOOLEAN DEFAULT true,
        share_weak_events BOOLEAN DEFAULT false,

        -- Audit
        granted_by TEXT REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        revoked_at TIMESTAMPTZ,

        UNIQUE(hangout_id, user_id, permission_type)
      )
    `);

    await db.query(`CREATE INDEX idx_team_permissions_hangout ON team_readiness_permissions(hangout_id)`);
    await db.query(`CREATE INDEX idx_team_permissions_user ON team_readiness_permissions(user_id)`);
  }

  // =============================================
  // TEAM MEMBER READINESS (Computed View)
  // =============================================

  if (!(await tableExists('team_member_readiness'))) {
    log.info('Creating team_member_readiness table...');
    await db.query(`
      CREATE TABLE team_member_readiness (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        hangout_id TEXT NOT NULL REFERENCES hangouts(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pt_test_id TEXT REFERENCES pt_tests(id),

        -- Computed Values
        readiness_score REAL,
        status TEXT CHECK (status IN ('ready', 'at_risk', 'not_ready', 'no_data')),
        last_assessment_at TIMESTAMPTZ,
        weak_events TEXT[],

        -- Cache Control
        computed_at TIMESTAMPTZ DEFAULT NOW(),

        UNIQUE(hangout_id, user_id, pt_test_id)
      )
    `);

    await db.query(`CREATE INDEX idx_team_member_readiness_hangout ON team_member_readiness(hangout_id)`);
    await db.query(`CREATE INDEX idx_team_member_readiness_status ON team_member_readiness(status)`);
  }

  // =============================================
  // TEAM READINESS SNAPSHOTS (History)
  // =============================================

  if (!(await tableExists('team_readiness_snapshots'))) {
    log.info('Creating team_readiness_snapshots table...');
    await db.query(`
      CREATE TABLE team_readiness_snapshots (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        hangout_id TEXT NOT NULL REFERENCES hangouts(id) ON DELETE CASCADE,
        pt_test_id TEXT REFERENCES pt_tests(id),

        -- Snapshot Data
        snapshot_date DATE NOT NULL,
        members_total INTEGER NOT NULL,
        members_opted_in INTEGER NOT NULL,
        members_ready INTEGER NOT NULL,
        members_at_risk INTEGER NOT NULL,
        members_not_ready INTEGER NOT NULL,
        average_readiness REAL,
        weak_events JSONB,

        created_at TIMESTAMPTZ DEFAULT NOW(),

        UNIQUE(hangout_id, pt_test_id, snapshot_date)
      )
    `);

    await db.query(`CREATE INDEX idx_team_snapshots_hangout ON team_readiness_snapshots(hangout_id)`);
    await db.query(`CREATE INDEX idx_team_snapshots_date ON team_readiness_snapshots(snapshot_date)`);
  }

  // =============================================
  // RECERTIFICATION SCHEDULES
  // =============================================

  if (!(await tableExists('recertification_schedules'))) {
    log.info('Creating recertification_schedules table...');
    await db.query(`
      CREATE TABLE recertification_schedules (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        goal_id TEXT NOT NULL REFERENCES user_career_goals(id) ON DELETE CASCADE,

        -- Schedule
        last_certified_at TIMESTAMPTZ,
        next_due_at TIMESTAMPTZ NOT NULL,
        reminder_days INTEGER[] DEFAULT '{30, 14, 7}',

        -- State
        last_reminded_at TIMESTAMPTZ,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue')),

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX idx_recert_user ON recertification_schedules(user_id)`);
    await db.query(`CREATE INDEX idx_recert_due ON recertification_schedules(next_due_at)`);
    await db.query(`CREATE INDEX idx_recert_status ON recertification_schedules(status)`);
  }

  // =============================================
  // ENHANCED SEED DATA FOR PT TESTS
  // =============================================

  log.info('Updating PT tests with career readiness fields...');

  // Update existing tests with category and exercise mappings
  await db.query(`
    UPDATE pt_tests SET
      category = 'military',
      recertification_months = 6,
      icon = 'military'
    WHERE id IN ('army_apft', 'army_acft', 'usmc_pft', 'navy_prt', 'usaf_pt')
  `);

  await db.query(`
    UPDATE pt_tests SET
      category = 'firefighter',
      icon = 'fire'
    WHERE id = 'cpat'
  `);

  await db.query(`
    UPDATE pt_tests SET
      category = 'law_enforcement',
      icon = 'shield'
    WHERE id IN ('fbi_pft', 'popat')
  `);

  // Add exercise mappings for ACFT
  await db.query(`
    UPDATE pt_tests SET exercise_mappings = $1::JSONB
    WHERE id = 'army_acft'
  `, [JSON.stringify({
    deadlift: ['deadlift', 'romanian_deadlift', 'trap_bar_deadlift', 'hip_thrusts'],
    power_throw: ['medicine_ball_slams', 'wall_balls', 'back_extensions', 'box_jumps'],
    pushups: ['push_ups', 'bench_press', 'dips', 'incline_push_ups'],
    sprint_drag_carry: ['sled_drag', 'kettlebell_carry', 'lateral_shuffles', 'sprints'],
    plank: ['plank', 'dead_bug', 'bird_dog', 'hollow_body_hold'],
    run_2_mile: ['running', 'tempo_runs', 'interval_training']
  })]);

  // Add exercise mappings for CPAT
  await db.query(`
    UPDATE pt_tests SET exercise_mappings = $1::JSONB
    WHERE id = 'cpat'
  `, [JSON.stringify({
    stair_climb: ['stair_climber', 'lunges', 'step_ups', 'box_jumps'],
    hose_drag: ['sled_drag', 'cable_rows', 'deadlifts', 'farmers_carry'],
    equipment_carry: ['farmers_carry', 'kettlebell_carry', 'trap_bar_deadlift'],
    ladder_raise: ['lat_pulldown', 'pull_ups', 'overhead_press', 'cable_rows'],
    forcible_entry: ['sledgehammer_swings', 'medicine_ball_slams', 'woodchoppers'],
    search: ['bear_crawl', 'plank', 'mountain_climbers'],
    rescue: ['sled_drag', 'goblet_squats', 'lunges', 'hip_thrusts'],
    ceiling_breach: ['overhead_press', 'lat_pulldown', 'push_ups', 'pull_ups']
  })]);

  // Add tips for CPAT
  await db.query(`
    UPDATE pt_tests SET tips = $1::JSONB
    WHERE id = 'cpat'
  `, [JSON.stringify([
    { event: 'stair_climb', tip: 'Build aerobic base with 20+ minutes of stairs at moderate pace' },
    { event: 'stair_climb', tip: 'Practice with weighted vest, gradually increasing weight' },
    { event: 'hose_drag', tip: 'Train grip endurance with heavy farmers carries' },
    { event: 'ladder_raise', tip: 'Build pulling strength with rows and pulldowns' },
    { event: 'forcible_entry', tip: 'Train explosive hip rotation with medicine ball slams' },
    { event: 'rescue', tip: 'Build hip and glute strength with sled drags' }
  ])]);

  // Add more PT tests if they don't exist

  // DEA PFT
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, category, components, scoring_method, icon, recertification_months)
    VALUES (
      'dea_pft',
      'DEA Physical Task Test',
      'Physical fitness test for Drug Enforcement Administration Special Agents',
      'DEA',
      'law_enforcement',
      '[
        {"id": "situps", "name": "Sit-ups (1 minute)", "type": "reps", "duration_seconds": 60},
        {"id": "pushups", "name": "Push-ups (1 minute)", "type": "reps", "duration_seconds": 60},
        {"id": "pullups", "name": "Pull-ups", "type": "reps"},
        {"id": "run_1_5_mile", "name": "1.5-Mile Run", "type": "time", "distance_miles": 1.5}
      ]'::JSONB,
      'pass_fail',
      'shield',
      12
    )
    ON CONFLICT (id) DO NOTHING
  `);

  // Secret Service PT
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, category, components, scoring_method, icon)
    VALUES (
      'usss_pft',
      'Secret Service Physical Fitness Test',
      'Physical fitness test for U.S. Secret Service Agents',
      'U.S. Secret Service',
      'law_enforcement',
      '[
        {"id": "pushups", "name": "Push-ups", "type": "reps", "duration_seconds": 60},
        {"id": "situps", "name": "Sit-ups", "type": "reps", "duration_seconds": 60},
        {"id": "chin_ups", "name": "Chin-ups", "type": "reps"},
        {"id": "run_1_5_mile", "name": "1.5-Mile Run", "type": "time", "distance_miles": 1.5}
      ]'::JSONB,
      'pass_fail',
      'shield'
    )
    ON CONFLICT (id) DO NOTHING
  `);

  // BUD/S PST (Navy SEAL)
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, category, components, scoring_method, max_score, passing_score, icon)
    VALUES (
      'buds_pst',
      'BUD/S Physical Screening Test',
      'Minimum standards for Navy SEAL (BUD/S) candidates. Competitive scores are significantly higher.',
      'U.S. Navy',
      'special_operations',
      '[
        {"id": "swim_500yd", "name": "500-Yard Swim", "type": "time", "description": "Breaststroke or combat sidestroke"},
        {"id": "pushups", "name": "Push-ups (2 minutes)", "type": "reps", "duration_seconds": 120},
        {"id": "situps", "name": "Sit-ups (2 minutes)", "type": "reps", "duration_seconds": 120},
        {"id": "pullups", "name": "Pull-ups", "type": "reps"},
        {"id": "run_1_5_mile", "name": "1.5-Mile Run", "type": "time", "distance_miles": 1.5}
      ]'::JSONB,
      'pass_fail',
      NULL,
      NULL,
      'anchor'
    )
    ON CONFLICT (id) DO NOTHING
  `);

  // Ranger RPAT
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, category, components, scoring_method, icon)
    VALUES (
      'ranger_rpat',
      'Ranger Physical Assessment Test',
      'Physical assessment for 75th Ranger Regiment candidates',
      'U.S. Army',
      'special_operations',
      '[
        {"id": "pushups", "name": "Push-ups (2 minutes)", "type": "reps", "duration_seconds": 120},
        {"id": "situps", "name": "Sit-ups (2 minutes)", "type": "reps", "duration_seconds": 120},
        {"id": "pullups", "name": "Pull-ups", "type": "reps"},
        {"id": "run_5_mile", "name": "5-Mile Run", "type": "time", "distance_miles": 5},
        {"id": "ruck_12_mile", "name": "12-Mile Ruck March", "type": "time", "distance_miles": 12, "load_lbs": 35}
      ]'::JSONB,
      'pass_fail',
      'ranger'
    )
    ON CONFLICT (id) DO NOTHING
  `);

  log.info('Migration 039_career_readiness complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 039_career_readiness');

  // Drop tables in reverse order of dependencies
  await db.query(`DROP TABLE IF EXISTS recertification_schedules`);
  await db.query(`DROP TABLE IF EXISTS team_readiness_snapshots`);
  await db.query(`DROP TABLE IF EXISTS team_member_readiness`);
  await db.query(`DROP TABLE IF EXISTS team_readiness_permissions`);
  await db.query(`DROP TABLE IF EXISTS team_readiness_config`);
  await db.query(`DROP TABLE IF EXISTS career_readiness_cache`);
  await db.query(`DROP TABLE IF EXISTS user_career_goals`);

  // Remove columns from pt_tests
  const columnsToRemove = ['category', 'recertification_months', 'exercise_mappings', 'tips', 'icon', 'active'];
  for (const col of columnsToRemove) {
    if (await columnExists('pt_tests', col)) {
      await db.query(`ALTER TABLE pt_tests DROP COLUMN ${col}`);
    }
  }

  // Remove new PT tests
  await db.query(`DELETE FROM pt_tests WHERE id IN ('dea_pft', 'usss_pft', 'buds_pst', 'ranger_rpat')`);

  log.info('Rollback 039_career_readiness complete');
}

export const migrate = up;
