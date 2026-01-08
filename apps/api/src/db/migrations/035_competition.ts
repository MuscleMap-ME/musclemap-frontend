/**
 * Migration: Competition/Bodybuilding System
 *
 * Phase 4 of Journey Overhaul - adds:
 * - Competition categories (federations/divisions)
 * - User competition profiles
 * - Show tracking with countdown
 * - Weak point assessment storage
 * - Competition prep phases
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 035_competition');

  // ============================================
  // COMPETITION CATEGORIES TABLE
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS competition_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      federation TEXT, -- IFBB, NPC, INBA, WNBF, IPF, USAPL, etc.
      sport TEXT NOT NULL, -- bodybuilding, physique, bikini, powerlifting, strongman, crossfit
      gender TEXT, -- male, female, open
      division TEXT, -- open, masters, teen, novice
      weight_class TEXT, -- lightweight, middleweight, heavyweight, etc.
      height_class TEXT, -- for classic physique
      is_tested BOOLEAN DEFAULT FALSE, -- natural/drug-tested federation
      icon TEXT,
      display_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ============================================
  // USER COMPETITION PROFILES TABLE
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_competition_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id TEXT REFERENCES competition_categories(id),

      -- Show details
      show_name TEXT,
      show_date DATE,
      show_location TEXT,

      -- Current phase
      current_phase TEXT DEFAULT 'offseason', -- offseason, prep, peak_week, post_show, maintenance
      phase_started_at TIMESTAMPTZ DEFAULT NOW(),

      -- Prep details
      prep_start_date DATE,
      prep_weeks INTEGER, -- total planned prep weeks
      coach_name TEXT,
      coach_contact TEXT,

      -- Competition history
      previous_shows JSONB DEFAULT '[]', -- [{name, date, placement, notes}]
      best_placement TEXT, -- "1st Place Men's Physique Open"

      -- Physical stats at start of prep
      starting_weight_kg DECIMAL(5,2),
      starting_body_fat_percent DECIMAL(4,1),
      goal_stage_weight_kg DECIMAL(5,2),

      -- Current tracking
      current_weight_kg DECIMAL(5,2),
      current_body_fat_percent DECIMAL(4,1),
      last_weigh_in_date DATE,

      -- Weak points assessment (body parts needing extra volume)
      weak_points JSONB DEFAULT '[]', -- ['rear_delts', 'hamstrings', 'upper_chest']
      weak_point_notes TEXT,

      -- Posing
      mandatory_poses JSONB DEFAULT '[]', -- poses for the division
      posing_practice_log JSONB DEFAULT '[]', -- [{date, duration_minutes, notes}]

      -- Notes and goals
      competition_goals TEXT,
      notes TEXT,

      -- Status
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),

      CONSTRAINT unique_active_competition_profile UNIQUE (user_id, is_active)
        DEFERRABLE INITIALLY DEFERRED
    )
  `);

  // ============================================
  // COMPETITION WEIGH-INS TABLE
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS competition_weigh_ins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      profile_id UUID REFERENCES user_competition_profiles(id) ON DELETE CASCADE,

      weigh_in_date DATE NOT NULL,
      weight_kg DECIMAL(5,2) NOT NULL,
      body_fat_percent DECIMAL(4,1),

      -- Measurements (optional)
      waist_cm DECIMAL(5,1),
      chest_cm DECIMAL(5,1),
      arm_cm DECIMAL(5,1),
      thigh_cm DECIMAL(5,1),

      -- Condition notes
      condition_rating INTEGER CHECK (condition_rating BETWEEN 1 AND 10),
      notes TEXT,
      photo_url TEXT,

      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ============================================
  // COMPETITION PREP PHASES TABLE
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS competition_prep_phases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID NOT NULL REFERENCES user_competition_profiles(id) ON DELETE CASCADE,

      phase_name TEXT NOT NULL, -- 'offseason', 'early_prep', 'mid_prep', 'peak', 'show_week'
      phase_number INTEGER NOT NULL,

      start_date DATE NOT NULL,
      end_date DATE,
      weeks_out_start INTEGER, -- weeks from show at start of phase
      weeks_out_end INTEGER,

      -- Training adjustments
      training_split TEXT, -- PPL, Bro Split, Upper/Lower, etc.
      cardio_minutes_daily INTEGER,
      cardio_type TEXT, -- LISS, HIIT, mix
      training_intensity TEXT, -- high, moderate, low
      volume_adjustment DECIMAL(3,2), -- 1.0 = normal, 0.8 = reduced

      -- Nutrition targets (can be connected to nutrition module later)
      target_calories INTEGER,
      target_protein_g INTEGER,
      target_carbs_g INTEGER,
      target_fat_g INTEGER,
      refeed_days_per_week INTEGER,

      -- Notes
      focus_areas TEXT[], -- body parts to emphasize
      notes TEXT,

      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ============================================
  // INDEXES
  // ============================================

  await db.query(`CREATE INDEX IF NOT EXISTS idx_competition_categories_sport ON competition_categories(sport)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_competition_categories_federation ON competition_categories(federation)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_competition_profiles_user ON user_competition_profiles(user_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_competition_profiles_show_date ON user_competition_profiles(show_date) WHERE show_date IS NOT NULL`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_competition_weigh_ins_user ON competition_weigh_ins(user_id, weigh_in_date DESC)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_competition_prep_phases_profile ON competition_prep_phases(profile_id)`);

  // ============================================
  // SEED COMPETITION CATEGORIES
  // ============================================

  log.info('Seeding competition categories...');

  const categories = [
    // IFBB Pro League - Men's
    { id: 'ifbb_mens_open_bb', name: "Men's Open Bodybuilding", federation: 'IFBB Pro League', sport: 'bodybuilding', gender: 'male', division: 'open', is_tested: false },
    { id: 'ifbb_classic_physique', name: 'Classic Physique', federation: 'IFBB Pro League', sport: 'bodybuilding', gender: 'male', division: 'open', is_tested: false },
    { id: 'ifbb_mens_physique', name: "Men's Physique", federation: 'IFBB Pro League', sport: 'physique', gender: 'male', division: 'open', is_tested: false },
    { id: 'ifbb_212', name: '212 Bodybuilding', federation: 'IFBB Pro League', sport: 'bodybuilding', gender: 'male', division: '212', weight_class: '212lbs', is_tested: false },

    // IFBB Pro League - Women's
    { id: 'ifbb_womens_bb', name: "Women's Bodybuilding", federation: 'IFBB Pro League', sport: 'bodybuilding', gender: 'female', division: 'open', is_tested: false },
    { id: 'ifbb_figure', name: 'Figure', federation: 'IFBB Pro League', sport: 'figure', gender: 'female', division: 'open', is_tested: false },
    { id: 'ifbb_bikini', name: 'Bikini', federation: 'IFBB Pro League', sport: 'bikini', gender: 'female', division: 'open', is_tested: false },
    { id: 'ifbb_wellness', name: 'Wellness', federation: 'IFBB Pro League', sport: 'wellness', gender: 'female', division: 'open', is_tested: false },
    { id: 'ifbb_womens_physique', name: "Women's Physique", federation: 'IFBB Pro League', sport: 'physique', gender: 'female', division: 'open', is_tested: false },

    // NPC (Amateur)
    { id: 'npc_mens_bb', name: "NPC Men's Bodybuilding", federation: 'NPC', sport: 'bodybuilding', gender: 'male', division: 'amateur', is_tested: false },
    { id: 'npc_classic', name: 'NPC Classic Physique', federation: 'NPC', sport: 'bodybuilding', gender: 'male', division: 'amateur', is_tested: false },
    { id: 'npc_mens_physique', name: "NPC Men's Physique", federation: 'NPC', sport: 'physique', gender: 'male', division: 'amateur', is_tested: false },
    { id: 'npc_bikini', name: 'NPC Bikini', federation: 'NPC', sport: 'bikini', gender: 'female', division: 'amateur', is_tested: false },
    { id: 'npc_figure', name: 'NPC Figure', federation: 'NPC', sport: 'figure', gender: 'female', division: 'amateur', is_tested: false },
    { id: 'npc_wellness', name: 'NPC Wellness', federation: 'NPC', sport: 'wellness', gender: 'female', division: 'amateur', is_tested: false },

    // Natural Federations
    { id: 'inba_natural_bb', name: 'INBA Natural Bodybuilding', federation: 'INBA/PNBA', sport: 'bodybuilding', gender: 'open', division: 'natural', is_tested: true },
    { id: 'wnbf_natural_bb', name: 'WNBF Natural Bodybuilding', federation: 'WNBF', sport: 'bodybuilding', gender: 'open', division: 'natural', is_tested: true },
    { id: 'ocb_natural', name: 'OCB Natural', federation: 'OCB', sport: 'bodybuilding', gender: 'open', division: 'natural', is_tested: true },

    // Powerlifting
    { id: 'ipf_powerlifting', name: 'IPF Powerlifting', federation: 'IPF', sport: 'powerlifting', gender: 'open', division: 'open', is_tested: true },
    { id: 'usapl_powerlifting', name: 'USAPL Powerlifting', federation: 'USAPL', sport: 'powerlifting', gender: 'open', division: 'open', is_tested: true },
    { id: 'uspa_powerlifting', name: 'USPA Powerlifting', federation: 'USPA', sport: 'powerlifting', gender: 'open', division: 'open', is_tested: false },

    // Strongman
    { id: 'wsm_strongman', name: 'Strongman', federation: 'WSM/Giants Live', sport: 'strongman', gender: 'male', division: 'open', is_tested: false },
    { id: 'strongwoman', name: 'Strongwoman', federation: 'WSM/Giants Live', sport: 'strongman', gender: 'female', division: 'open', is_tested: false },

    // CrossFit
    { id: 'crossfit_games', name: 'CrossFit Games', federation: 'CrossFit', sport: 'crossfit', gender: 'open', division: 'open', is_tested: true },

    // Olympic Weightlifting
    { id: 'iwf_weightlifting', name: 'Olympic Weightlifting', federation: 'IWF/USAW', sport: 'weightlifting', gender: 'open', division: 'open', is_tested: true },
  ];

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    await db.query(
      `INSERT INTO competition_categories (id, name, federation, sport, gender, division, weight_class, is_tested, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [cat.id, cat.name, cat.federation, cat.sport, cat.gender, cat.division, cat.weight_class || null, cat.is_tested, i + 1]
    );
  }

  log.info(`Seeded ${categories.length} competition categories`);

  // ============================================
  // SEED MANDATORY POSES BY DIVISION
  // ============================================

  // Store standard poses as a reference (can be queried when setting up profile)
  await db.query(`
    CREATE TABLE IF NOT EXISTS competition_mandatory_poses (
      id TEXT PRIMARY KEY,
      sport TEXT NOT NULL,
      pose_name TEXT NOT NULL,
      pose_order INTEGER NOT NULL,
      description TEXT,
      video_url TEXT
    )
  `);

  const poses = [
    // Bodybuilding mandatory poses
    { id: 'bb_front_double_bicep', sport: 'bodybuilding', pose_name: 'Front Double Bicep', pose_order: 1 },
    { id: 'bb_front_lat_spread', sport: 'bodybuilding', pose_name: 'Front Lat Spread', pose_order: 2 },
    { id: 'bb_side_chest', sport: 'bodybuilding', pose_name: 'Side Chest', pose_order: 3 },
    { id: 'bb_back_double_bicep', sport: 'bodybuilding', pose_name: 'Back Double Bicep', pose_order: 4 },
    { id: 'bb_back_lat_spread', sport: 'bodybuilding', pose_name: 'Back Lat Spread', pose_order: 5 },
    { id: 'bb_side_tricep', sport: 'bodybuilding', pose_name: 'Side Tricep', pose_order: 6 },
    { id: 'bb_abs_thigh', sport: 'bodybuilding', pose_name: 'Abs and Thigh', pose_order: 7 },
    { id: 'bb_most_muscular', sport: 'bodybuilding', pose_name: 'Most Muscular', pose_order: 8 },

    // Classic Physique poses
    { id: 'cp_front_double_bicep', sport: 'classic_physique', pose_name: 'Front Double Bicep', pose_order: 1 },
    { id: 'cp_side_chest', sport: 'classic_physique', pose_name: 'Side Chest', pose_order: 2 },
    { id: 'cp_back_double_bicep', sport: 'classic_physique', pose_name: 'Back Double Bicep', pose_order: 3 },
    { id: 'cp_abs_thigh', sport: 'classic_physique', pose_name: 'Abs and Thigh', pose_order: 4 },
    { id: 'cp_vacuum', sport: 'classic_physique', pose_name: 'Vacuum Pose', pose_order: 5 },

    // Men's Physique
    { id: 'mp_front', sport: 'physique', pose_name: 'Front Pose', pose_order: 1 },
    { id: 'mp_back', sport: 'physique', pose_name: 'Back Pose', pose_order: 2 },
    { id: 'mp_side', sport: 'physique', pose_name: 'Side Pose', pose_order: 3 },

    // Bikini
    { id: 'bk_front', sport: 'bikini', pose_name: 'Front Pose', pose_order: 1 },
    { id: 'bk_back', sport: 'bikini', pose_name: 'Back Pose', pose_order: 2 },
    { id: 'bk_model_walk', sport: 'bikini', pose_name: 'Model Walk', pose_order: 3 },

    // Figure
    { id: 'fg_front', sport: 'figure', pose_name: 'Front Pose', pose_order: 1 },
    { id: 'fg_back', sport: 'figure', pose_name: 'Back Pose', pose_order: 2 },
    { id: 'fg_side', sport: 'figure', pose_name: 'Side Pose', pose_order: 3 },
    { id: 'fg_quarter_turns', sport: 'figure', pose_name: 'Quarter Turns', pose_order: 4 },
  ];

  for (const pose of poses) {
    await db.query(
      `INSERT INTO competition_mandatory_poses (id, sport, pose_name, pose_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [pose.id, pose.sport, pose.pose_name, pose.pose_order]
    );
  }

  log.info(`Seeded ${poses.length} mandatory poses`);

  // ============================================
  // WEAK POINTS REFERENCE TABLE
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS weak_point_options (
      id TEXT PRIMARY KEY,
      body_part TEXT NOT NULL,
      display_name TEXT NOT NULL,
      muscle_group TEXT NOT NULL, -- chest, back, shoulders, arms, legs, core
      display_order INTEGER DEFAULT 0
    )
  `);

  const weakPoints = [
    // Chest
    { id: 'upper_chest', body_part: 'Upper Chest', muscle_group: 'chest', display_order: 1 },
    { id: 'inner_chest', body_part: 'Inner Chest', muscle_group: 'chest', display_order: 2 },
    { id: 'lower_chest', body_part: 'Lower Chest', muscle_group: 'chest', display_order: 3 },

    // Back
    { id: 'upper_back', body_part: 'Upper Back/Traps', muscle_group: 'back', display_order: 4 },
    { id: 'lats', body_part: 'Lats (Width)', muscle_group: 'back', display_order: 5 },
    { id: 'mid_back', body_part: 'Mid Back (Thickness)', muscle_group: 'back', display_order: 6 },
    { id: 'lower_back', body_part: 'Lower Back/Erectors', muscle_group: 'back', display_order: 7 },

    // Shoulders
    { id: 'front_delts', body_part: 'Front Delts', muscle_group: 'shoulders', display_order: 8 },
    { id: 'side_delts', body_part: 'Side Delts', muscle_group: 'shoulders', display_order: 9 },
    { id: 'rear_delts', body_part: 'Rear Delts', muscle_group: 'shoulders', display_order: 10 },

    // Arms
    { id: 'biceps_peak', body_part: 'Biceps Peak', muscle_group: 'arms', display_order: 11 },
    { id: 'biceps_length', body_part: 'Biceps Length', muscle_group: 'arms', display_order: 12 },
    { id: 'triceps_long_head', body_part: 'Triceps Long Head', muscle_group: 'arms', display_order: 13 },
    { id: 'triceps_lateral', body_part: 'Triceps Lateral Head', muscle_group: 'arms', display_order: 14 },
    { id: 'forearms', body_part: 'Forearms', muscle_group: 'arms', display_order: 15 },

    // Legs
    { id: 'quads_sweep', body_part: 'Quad Sweep', muscle_group: 'legs', display_order: 16 },
    { id: 'quads_teardrop', body_part: 'VMO (Teardrop)', muscle_group: 'legs', display_order: 17 },
    { id: 'hamstrings', body_part: 'Hamstrings', muscle_group: 'legs', display_order: 18 },
    { id: 'glutes', body_part: 'Glutes', muscle_group: 'legs', display_order: 19 },
    { id: 'calves', body_part: 'Calves', muscle_group: 'legs', display_order: 20 },

    // Core
    { id: 'abs', body_part: 'Abs', muscle_group: 'core', display_order: 21 },
    { id: 'obliques', body_part: 'Obliques', muscle_group: 'core', display_order: 22 },
    { id: 'serratus', body_part: 'Serratus', muscle_group: 'core', display_order: 23 },
  ];

  for (const wp of weakPoints) {
    await db.query(
      `INSERT INTO weak_point_options (id, body_part, display_name, muscle_group, display_order)
       VALUES ($1, $2, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [wp.id, wp.body_part, wp.muscle_group, wp.display_order]
    );
  }

  log.info(`Seeded ${weakPoints.length} weak point options`);

  log.info('Migration 035_competition complete');
}
