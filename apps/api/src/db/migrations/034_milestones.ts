/**
 * Migration: Elite Milestones System
 *
 * Phase 3 of Journey System Overhaul:
 * - skill_milestones table (elite bodyweight feats)
 * - milestone_progressions table (progression steps)
 * - user_skill_milestones table (user's active milestones)
 * - user_milestone_attempts table (logged attempts)
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 034_milestones');

  // ============================================
  // SKILL MILESTONES TABLE
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS skill_milestones (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      description TEXT,
      category VARCHAR(64) NOT NULL,
      subcategory VARCHAR(64),

      -- Apparatus & Requirements
      apparatus VARCHAR(64)[], -- floor, rings, bar, parallettes, pole
      equipment_required VARCHAR(64)[],

      -- Difficulty & Prerequisites
      difficulty_level INT NOT NULL DEFAULT 3, -- 1-5 stars
      prerequisite_milestone_ids VARCHAR(64)[],
      prerequisite_skills TEXT[],

      -- Media
      video_url TEXT,
      thumbnail_url TEXT,
      demo_gif_url TEXT,

      -- Achievement criteria
      hold_time_seconds INT, -- for static holds
      rep_count INT, -- for dynamic moves
      achievement_criteria TEXT,

      -- Rewards
      xp_reward INT DEFAULT 500,
      badge_id VARCHAR(64),

      -- Display
      icon VARCHAR(64),
      color VARCHAR(32),
      display_order INT DEFAULT 100,
      is_featured BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,

      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ============================================
  // MILESTONE PROGRESSIONS TABLE
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS milestone_progressions (
      id VARCHAR(64) PRIMARY KEY,
      milestone_id VARCHAR(64) NOT NULL REFERENCES skill_milestones(id) ON DELETE CASCADE,
      step_number INT NOT NULL,
      name VARCHAR(128) NOT NULL,
      description TEXT,

      -- What defines completion of this step
      criteria_type VARCHAR(32) NOT NULL, -- hold_time, reps, form_check
      criteria_value INT, -- seconds or reps
      criteria_description TEXT,

      -- Exercise to practice
      exercise_id VARCHAR(64),
      exercise_name VARCHAR(128),

      -- Estimated time at this step
      estimated_days_min INT,
      estimated_days_max INT,

      -- Media
      video_url TEXT,
      tips TEXT[],

      display_order INT DEFAULT 100,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ============================================
  // USER SKILL MILESTONES TABLE
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_skill_milestones (
      id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      milestone_id VARCHAR(64) NOT NULL REFERENCES skill_milestones(id) ON DELETE CASCADE,

      status VARCHAR(32) NOT NULL DEFAULT 'active', -- active, paused, achieved, abandoned
      current_progression_step INT DEFAULT 1,

      started_at TIMESTAMPTZ DEFAULT NOW(),
      achieved_at TIMESTAMPTZ,
      paused_at TIMESTAMPTZ,

      -- Best attempts
      best_hold_seconds INT,
      best_reps INT,
      best_attempt_date DATE,

      notes TEXT,

      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),

      UNIQUE(user_id, milestone_id)
    )
  `);

  // ============================================
  // USER MILESTONE ATTEMPTS TABLE
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_milestone_attempts (
      id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_milestone_id VARCHAR(64) NOT NULL REFERENCES user_skill_milestones(id) ON DELETE CASCADE,
      milestone_id VARCHAR(64) NOT NULL REFERENCES skill_milestones(id),
      progression_step INT,

      attempt_date DATE NOT NULL DEFAULT CURRENT_DATE,

      -- Results
      hold_seconds INT,
      reps_completed INT,
      form_rating INT, -- 1-5
      success BOOLEAN DEFAULT FALSE,

      -- Context
      video_url TEXT,
      notes TEXT,
      workout_id VARCHAR(64),

      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ============================================
  // INDEXES
  // ============================================

  await db.query(`CREATE INDEX IF NOT EXISTS idx_skill_milestones_category ON skill_milestones(category)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_skill_milestones_difficulty ON skill_milestones(difficulty_level)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_skill_milestones_active ON skill_milestones(is_active) WHERE is_active = TRUE`);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_milestone_progressions_milestone ON milestone_progressions(milestone_id)`);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_user_skill_milestones_user ON user_skill_milestones(user_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_user_skill_milestones_active ON user_skill_milestones(user_id, status) WHERE status = 'active'`);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_user_milestone_attempts_user ON user_milestone_attempts(user_id, attempt_date DESC)`);

  // ============================================
  // SEED MILESTONE CATEGORIES & MILESTONES
  // ============================================

  const milestones = [
    // ========== HANDSTANDS & INVERSIONS ==========
    {
      id: 'wall_handstand',
      name: 'Wall Handstand',
      description: 'Hold a handstand against the wall with proper form',
      category: 'handstands_inversions',
      subcategory: 'handstand_basics',
      apparatus: ['floor'],
      difficulty_level: 1,
      hold_time_seconds: 60,
      xp_reward: 200,
      achievement_criteria: 'Hold for 60 seconds with straight body alignment',
    },
    {
      id: 'freestanding_handstand',
      name: 'Freestanding Handstand',
      description: 'Hold a freestanding handstand away from the wall',
      category: 'handstands_inversions',
      subcategory: 'handstand_basics',
      apparatus: ['floor'],
      difficulty_level: 2,
      hold_time_seconds: 10,
      prerequisite_milestone_ids: ['wall_handstand'],
      xp_reward: 400,
      achievement_criteria: 'Hold for 10 seconds without wall support',
    },
    {
      id: 'handstand_30s',
      name: '30 Second Handstand',
      description: 'Hold a freestanding handstand for 30 seconds',
      category: 'handstands_inversions',
      subcategory: 'handstand_endurance',
      apparatus: ['floor'],
      difficulty_level: 3,
      hold_time_seconds: 30,
      prerequisite_milestone_ids: ['freestanding_handstand'],
      xp_reward: 600,
    },
    {
      id: 'handstand_60s',
      name: '60 Second Handstand',
      description: 'Hold a freestanding handstand for one full minute',
      category: 'handstands_inversions',
      subcategory: 'handstand_endurance',
      apparatus: ['floor'],
      difficulty_level: 4,
      hold_time_seconds: 60,
      prerequisite_milestone_ids: ['handstand_30s'],
      xp_reward: 800,
    },
    {
      id: 'handstand_pushup',
      name: 'Handstand Push-Up',
      description: 'Perform a full range handstand push-up against the wall',
      category: 'handstands_inversions',
      subcategory: 'handstand_strength',
      apparatus: ['floor'],
      difficulty_level: 3,
      rep_count: 1,
      prerequisite_milestone_ids: ['wall_handstand'],
      xp_reward: 500,
    },
    {
      id: 'freestanding_hspu',
      name: 'Freestanding HSPU',
      description: 'Perform a handstand push-up without wall support',
      category: 'handstands_inversions',
      subcategory: 'handstand_strength',
      apparatus: ['floor'],
      difficulty_level: 5,
      rep_count: 1,
      prerequisite_milestone_ids: ['handstand_pushup', 'handstand_30s'],
      xp_reward: 1000,
    },
    {
      id: 'one_arm_handstand',
      name: 'One Arm Handstand',
      description: 'Hold a one arm handstand for 5 seconds',
      category: 'handstands_inversions',
      subcategory: 'handstand_advanced',
      apparatus: ['floor'],
      difficulty_level: 5,
      hold_time_seconds: 5,
      prerequisite_milestone_ids: ['handstand_60s'],
      xp_reward: 1500,
    },
    {
      id: 'press_to_handstand',
      name: 'Press to Handstand',
      description: 'Press up to handstand from standing with straight legs',
      category: 'handstands_inversions',
      subcategory: 'handstand_transitions',
      apparatus: ['floor'],
      difficulty_level: 4,
      rep_count: 1,
      prerequisite_milestone_ids: ['handstand_30s'],
      xp_reward: 700,
    },
    {
      id: 'straddle_press',
      name: 'Straddle Press to Handstand',
      description: 'Press to handstand through straddle position',
      category: 'handstands_inversions',
      subcategory: 'handstand_transitions',
      apparatus: ['floor'],
      difficulty_level: 3,
      rep_count: 1,
      xp_reward: 500,
    },
    {
      id: 'headstand',
      name: 'Headstand',
      description: 'Hold a stable headstand for 60 seconds',
      category: 'handstands_inversions',
      subcategory: 'inversions',
      apparatus: ['floor'],
      difficulty_level: 1,
      hold_time_seconds: 60,
      xp_reward: 150,
    },
    {
      id: 'forearm_stand',
      name: 'Forearm Stand',
      description: 'Hold a forearm stand for 30 seconds',
      category: 'handstands_inversions',
      subcategory: 'inversions',
      apparatus: ['floor'],
      difficulty_level: 2,
      hold_time_seconds: 30,
      xp_reward: 300,
    },

    // ========== STRAIGHT-ARM STRENGTH ==========
    {
      id: 'l_sit',
      name: 'L-Sit',
      description: 'Hold an L-sit on the floor or parallettes',
      category: 'straight_arm_strength',
      subcategory: 'l_sit_progression',
      apparatus: ['floor', 'parallettes'],
      difficulty_level: 2,
      hold_time_seconds: 10,
      xp_reward: 300,
    },
    {
      id: 'l_sit_30s',
      name: '30 Second L-Sit',
      description: 'Hold an L-sit for 30 seconds',
      category: 'straight_arm_strength',
      subcategory: 'l_sit_progression',
      apparatus: ['floor', 'parallettes'],
      difficulty_level: 3,
      hold_time_seconds: 30,
      prerequisite_milestone_ids: ['l_sit'],
      xp_reward: 500,
    },
    {
      id: 'v_sit',
      name: 'V-Sit',
      description: 'Hold a V-sit with legs above horizontal',
      category: 'straight_arm_strength',
      subcategory: 'l_sit_progression',
      apparatus: ['floor', 'parallettes'],
      difficulty_level: 4,
      hold_time_seconds: 5,
      prerequisite_milestone_ids: ['l_sit_30s'],
      xp_reward: 700,
    },
    {
      id: 'manna',
      name: 'Manna',
      description: 'The ultimate L-sit progression - legs past vertical behind you',
      category: 'straight_arm_strength',
      subcategory: 'l_sit_progression',
      apparatus: ['floor', 'parallettes'],
      difficulty_level: 5,
      hold_time_seconds: 3,
      prerequisite_milestone_ids: ['v_sit'],
      xp_reward: 2000,
    },
    {
      id: 'tuck_planche',
      name: 'Tuck Planche',
      description: 'Hold a tucked planche position',
      category: 'straight_arm_strength',
      subcategory: 'planche_progression',
      apparatus: ['floor', 'parallettes'],
      difficulty_level: 3,
      hold_time_seconds: 10,
      xp_reward: 500,
    },
    {
      id: 'advanced_tuck_planche',
      name: 'Advanced Tuck Planche',
      description: 'Hold an advanced tuck planche with flat back',
      category: 'straight_arm_strength',
      subcategory: 'planche_progression',
      apparatus: ['floor', 'parallettes'],
      difficulty_level: 4,
      hold_time_seconds: 10,
      prerequisite_milestone_ids: ['tuck_planche'],
      xp_reward: 700,
    },
    {
      id: 'straddle_planche',
      name: 'Straddle Planche',
      description: 'Hold a straddle planche position',
      category: 'straight_arm_strength',
      subcategory: 'planche_progression',
      apparatus: ['floor', 'parallettes'],
      difficulty_level: 5,
      hold_time_seconds: 5,
      prerequisite_milestone_ids: ['advanced_tuck_planche'],
      xp_reward: 1200,
    },
    {
      id: 'full_planche',
      name: 'Full Planche',
      description: 'Hold a full planche with legs together',
      category: 'straight_arm_strength',
      subcategory: 'planche_progression',
      apparatus: ['floor', 'parallettes'],
      difficulty_level: 5,
      hold_time_seconds: 3,
      prerequisite_milestone_ids: ['straddle_planche'],
      xp_reward: 2000,
    },
    {
      id: 'tuck_front_lever',
      name: 'Tuck Front Lever',
      description: 'Hold a tucked front lever on the bar',
      category: 'straight_arm_strength',
      subcategory: 'front_lever_progression',
      apparatus: ['bar', 'rings'],
      difficulty_level: 2,
      hold_time_seconds: 10,
      xp_reward: 350,
    },
    {
      id: 'advanced_tuck_front_lever',
      name: 'Advanced Tuck Front Lever',
      description: 'Hold an advanced tuck front lever',
      category: 'straight_arm_strength',
      subcategory: 'front_lever_progression',
      apparatus: ['bar', 'rings'],
      difficulty_level: 3,
      hold_time_seconds: 10,
      prerequisite_milestone_ids: ['tuck_front_lever'],
      xp_reward: 500,
    },
    {
      id: 'straddle_front_lever',
      name: 'Straddle Front Lever',
      description: 'Hold a straddle front lever',
      category: 'straight_arm_strength',
      subcategory: 'front_lever_progression',
      apparatus: ['bar', 'rings'],
      difficulty_level: 4,
      hold_time_seconds: 5,
      prerequisite_milestone_ids: ['advanced_tuck_front_lever'],
      xp_reward: 800,
    },
    {
      id: 'full_front_lever',
      name: 'Full Front Lever',
      description: 'Hold a full front lever with body horizontal',
      category: 'straight_arm_strength',
      subcategory: 'front_lever_progression',
      apparatus: ['bar', 'rings'],
      difficulty_level: 5,
      hold_time_seconds: 3,
      prerequisite_milestone_ids: ['straddle_front_lever'],
      xp_reward: 1500,
    },
    {
      id: 'tuck_back_lever',
      name: 'Tuck Back Lever',
      description: 'Hold a tucked back lever',
      category: 'straight_arm_strength',
      subcategory: 'back_lever_progression',
      apparatus: ['bar', 'rings'],
      difficulty_level: 2,
      hold_time_seconds: 10,
      xp_reward: 300,
    },
    {
      id: 'full_back_lever',
      name: 'Full Back Lever',
      description: 'Hold a full back lever',
      category: 'straight_arm_strength',
      subcategory: 'back_lever_progression',
      apparatus: ['bar', 'rings'],
      difficulty_level: 3,
      hold_time_seconds: 5,
      prerequisite_milestone_ids: ['tuck_back_lever'],
      xp_reward: 600,
    },

    // ========== PULLING POWER ==========
    {
      id: 'first_pullup',
      name: 'First Pull-Up',
      description: 'Perform your first strict pull-up',
      category: 'pulling_power',
      subcategory: 'pullup_basics',
      apparatus: ['bar'],
      difficulty_level: 2,
      rep_count: 1,
      xp_reward: 250,
    },
    {
      id: 'pullups_10',
      name: '10 Pull-Ups',
      description: 'Perform 10 consecutive strict pull-ups',
      category: 'pulling_power',
      subcategory: 'pullup_endurance',
      apparatus: ['bar'],
      difficulty_level: 3,
      rep_count: 10,
      prerequisite_milestone_ids: ['first_pullup'],
      xp_reward: 400,
    },
    {
      id: 'pullups_20',
      name: '20 Pull-Ups',
      description: 'Perform 20 consecutive strict pull-ups',
      category: 'pulling_power',
      subcategory: 'pullup_endurance',
      apparatus: ['bar'],
      difficulty_level: 4,
      rep_count: 20,
      prerequisite_milestone_ids: ['pullups_10'],
      xp_reward: 600,
    },
    {
      id: 'chest_to_bar',
      name: 'Chest to Bar Pull-Up',
      description: 'Pull up until chest touches the bar',
      category: 'pulling_power',
      subcategory: 'pullup_strength',
      apparatus: ['bar'],
      difficulty_level: 3,
      rep_count: 5,
      prerequisite_milestone_ids: ['pullups_10'],
      xp_reward: 400,
    },
    {
      id: 'muscle_up',
      name: 'Muscle-Up',
      description: 'Perform a strict bar muscle-up',
      category: 'pulling_power',
      subcategory: 'muscle_up',
      apparatus: ['bar'],
      difficulty_level: 4,
      rep_count: 1,
      prerequisite_milestone_ids: ['pullups_10', 'chest_to_bar'],
      xp_reward: 800,
      is_featured: true,
    },
    {
      id: 'muscle_ups_5',
      name: '5 Muscle-Ups',
      description: 'Perform 5 consecutive muscle-ups',
      category: 'pulling_power',
      subcategory: 'muscle_up',
      apparatus: ['bar'],
      difficulty_level: 5,
      rep_count: 5,
      prerequisite_milestone_ids: ['muscle_up'],
      xp_reward: 1000,
    },
    {
      id: 'one_arm_pullup',
      name: 'One Arm Pull-Up',
      description: 'Perform a one arm pull-up',
      category: 'pulling_power',
      subcategory: 'one_arm',
      apparatus: ['bar', 'rings'],
      difficulty_level: 5,
      rep_count: 1,
      prerequisite_milestone_ids: ['pullups_20'],
      xp_reward: 1500,
      is_featured: true,
    },
    {
      id: 'archer_pullup',
      name: 'Archer Pull-Up',
      description: 'Perform archer pull-ups',
      category: 'pulling_power',
      subcategory: 'one_arm',
      apparatus: ['bar'],
      difficulty_level: 4,
      rep_count: 5,
      prerequisite_milestone_ids: ['pullups_10'],
      xp_reward: 500,
    },
    {
      id: 'typewriter_pullup',
      name: 'Typewriter Pull-Up',
      description: 'Perform typewriter pull-ups side to side',
      category: 'pulling_power',
      subcategory: 'one_arm',
      apparatus: ['bar'],
      difficulty_level: 4,
      rep_count: 5,
      prerequisite_milestone_ids: ['archer_pullup'],
      xp_reward: 600,
    },

    // ========== PUSHING POWER ==========
    {
      id: 'dips_20',
      name: '20 Dips',
      description: 'Perform 20 consecutive parallel bar dips',
      category: 'pushing_power',
      apparatus: ['parallettes', 'dip_bars'],
      difficulty_level: 2,
      rep_count: 20,
      xp_reward: 300,
    },
    {
      id: 'ring_dips',
      name: 'Ring Dips',
      description: 'Perform 10 ring dips with control',
      category: 'pushing_power',
      apparatus: ['rings'],
      difficulty_level: 3,
      rep_count: 10,
      xp_reward: 400,
    },
    {
      id: 'pseudo_planche_pushup',
      name: 'Pseudo Planche Push-Up',
      description: 'Perform push-ups with hands by hips',
      category: 'pushing_power',
      apparatus: ['floor'],
      difficulty_level: 3,
      rep_count: 10,
      xp_reward: 400,
    },
    {
      id: 'one_arm_pushup',
      name: 'One Arm Push-Up',
      description: 'Perform a strict one arm push-up',
      category: 'pushing_power',
      apparatus: ['floor'],
      difficulty_level: 4,
      rep_count: 1,
      xp_reward: 600,
    },
    {
      id: 'planche_pushup',
      name: 'Planche Push-Up',
      description: 'Perform push-ups from planche position',
      category: 'pushing_power',
      apparatus: ['floor', 'parallettes'],
      difficulty_level: 5,
      rep_count: 1,
      prerequisite_milestone_ids: ['straddle_planche'],
      xp_reward: 1500,
    },

    // ========== RINGS SKILLS ==========
    {
      id: 'ring_support',
      name: 'Ring Support Hold',
      description: 'Hold a stable support position on rings for 30 seconds',
      category: 'rings_skills',
      apparatus: ['rings'],
      difficulty_level: 2,
      hold_time_seconds: 30,
      xp_reward: 250,
    },
    {
      id: 'ring_muscle_up',
      name: 'Ring Muscle-Up',
      description: 'Perform a strict ring muscle-up',
      category: 'rings_skills',
      apparatus: ['rings'],
      difficulty_level: 4,
      rep_count: 1,
      prerequisite_milestone_ids: ['ring_support', 'ring_dips'],
      xp_reward: 900,
      is_featured: true,
    },
    {
      id: 'iron_cross',
      name: 'Iron Cross',
      description: 'Hold the iron cross position on rings',
      category: 'rings_skills',
      apparatus: ['rings'],
      difficulty_level: 5,
      hold_time_seconds: 3,
      prerequisite_milestone_ids: ['ring_support'],
      xp_reward: 2000,
      is_featured: true,
    },
    {
      id: 'inverted_cross',
      name: 'Inverted Cross',
      description: 'Hold an inverted cross on rings',
      category: 'rings_skills',
      apparatus: ['rings'],
      difficulty_level: 5,
      hold_time_seconds: 3,
      prerequisite_milestone_ids: ['iron_cross'],
      xp_reward: 2500,
    },
    {
      id: 'maltese',
      name: 'Maltese',
      description: 'Hold a maltese position on rings',
      category: 'rings_skills',
      apparatus: ['rings'],
      difficulty_level: 5,
      hold_time_seconds: 2,
      prerequisite_milestone_ids: ['iron_cross', 'full_planche'],
      xp_reward: 3000,
    },

    // ========== HUMAN FLAG & POLE ==========
    {
      id: 'human_flag',
      name: 'Human Flag',
      description: 'Hold a human flag for 5 seconds',
      category: 'flag_pole',
      apparatus: ['pole', 'stall_bars'],
      difficulty_level: 5,
      hold_time_seconds: 5,
      xp_reward: 1200,
      is_featured: true,
    },
    {
      id: 'dragon_flag',
      name: 'Dragon Flag',
      description: 'Perform a controlled dragon flag',
      category: 'flag_pole',
      apparatus: ['bench'],
      difficulty_level: 4,
      rep_count: 5,
      xp_reward: 700,
    },

    // ========== DYNAMIC & TUMBLING ==========
    {
      id: 'handstand_walk',
      name: 'Handstand Walk',
      description: 'Walk 10 meters in a handstand',
      category: 'dynamic_tumbling',
      apparatus: ['floor'],
      difficulty_level: 3,
      achievement_criteria: 'Walk 10 meters continuously',
      prerequisite_milestone_ids: ['freestanding_handstand'],
      xp_reward: 500,
    },
    {
      id: 'cartwheel',
      name: 'Cartwheel',
      description: 'Perform a clean cartwheel',
      category: 'dynamic_tumbling',
      apparatus: ['floor'],
      difficulty_level: 1,
      rep_count: 1,
      xp_reward: 100,
    },
    {
      id: 'roundoff',
      name: 'Roundoff',
      description: 'Perform a clean roundoff',
      category: 'dynamic_tumbling',
      apparatus: ['floor'],
      difficulty_level: 2,
      rep_count: 1,
      prerequisite_milestone_ids: ['cartwheel'],
      xp_reward: 200,
    },
    {
      id: 'back_handspring',
      name: 'Back Handspring',
      description: 'Perform a standing back handspring',
      category: 'dynamic_tumbling',
      apparatus: ['floor'],
      difficulty_level: 4,
      rep_count: 1,
      xp_reward: 700,
    },
    {
      id: 'front_flip',
      name: 'Front Flip',
      description: 'Perform a front flip (front tuck)',
      category: 'dynamic_tumbling',
      apparatus: ['floor'],
      difficulty_level: 4,
      rep_count: 1,
      xp_reward: 800,
    },
    {
      id: 'back_flip',
      name: 'Back Flip',
      description: 'Perform a standing back flip (back tuck)',
      category: 'dynamic_tumbling',
      apparatus: ['floor'],
      difficulty_level: 4,
      rep_count: 1,
      xp_reward: 900,
    },
    {
      id: 'aerial',
      name: 'Aerial (No-Hands Cartwheel)',
      description: 'Perform an aerial cartwheel without hands',
      category: 'dynamic_tumbling',
      apparatus: ['floor'],
      difficulty_level: 4,
      rep_count: 1,
      prerequisite_milestone_ids: ['cartwheel'],
      xp_reward: 700,
    },

    // ========== GRIP & FOREARM ==========
    {
      id: 'dead_hang_2min',
      name: '2 Minute Dead Hang',
      description: 'Hang from a bar for 2 minutes',
      category: 'grip_forearm',
      apparatus: ['bar'],
      difficulty_level: 2,
      hold_time_seconds: 120,
      xp_reward: 200,
    },
    {
      id: 'one_arm_hang',
      name: 'One Arm Hang',
      description: 'Hang from one arm for 30 seconds',
      category: 'grip_forearm',
      apparatus: ['bar'],
      difficulty_level: 3,
      hold_time_seconds: 30,
      prerequisite_milestone_ids: ['dead_hang_2min'],
      xp_reward: 400,
    },
    {
      id: 'finger_hang',
      name: 'Two Finger Hang',
      description: 'Hang using only two fingers per hand for 30 seconds',
      category: 'grip_forearm',
      apparatus: ['bar', 'hangboard'],
      difficulty_level: 4,
      hold_time_seconds: 30,
      xp_reward: 600,
    },
  ];

  for (const m of milestones) {
    await db.query(
      `INSERT INTO skill_milestones (
        id, name, description, category, subcategory, apparatus, difficulty_level,
        prerequisite_milestone_ids, hold_time_seconds, rep_count, achievement_criteria,
        xp_reward, is_featured
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        subcategory = EXCLUDED.subcategory,
        apparatus = EXCLUDED.apparatus,
        difficulty_level = EXCLUDED.difficulty_level,
        prerequisite_milestone_ids = EXCLUDED.prerequisite_milestone_ids,
        hold_time_seconds = EXCLUDED.hold_time_seconds,
        rep_count = EXCLUDED.rep_count,
        achievement_criteria = EXCLUDED.achievement_criteria,
        xp_reward = EXCLUDED.xp_reward,
        is_featured = EXCLUDED.is_featured,
        updated_at = NOW()`,
      [
        m.id,
        m.name,
        m.description,
        m.category,
        m.subcategory || null,
        m.apparatus || [],
        m.difficulty_level,
        m.prerequisite_milestone_ids || [],
        m.hold_time_seconds || null,
        m.rep_count || null,
        m.achievement_criteria || null,
        m.xp_reward,
        m.is_featured || false,
      ]
    );
  }

  log.info(`Seeded ${milestones.length} skill milestones`);

  // ============================================
  // SEED PROGRESSIONS FOR KEY MILESTONES
  // ============================================

  const progressions = [
    // Muscle-up progression
    { milestone_id: 'muscle_up', step: 1, name: 'Dead Hang', criteria_type: 'hold_time', criteria_value: 30 },
    { milestone_id: 'muscle_up', step: 2, name: '10 Pull-Ups', criteria_type: 'reps', criteria_value: 10 },
    { milestone_id: 'muscle_up', step: 3, name: 'Chest to Bar Pull-Up', criteria_type: 'reps', criteria_value: 5 },
    { milestone_id: 'muscle_up', step: 4, name: 'High Pull-Up', criteria_type: 'reps', criteria_value: 5 },
    { milestone_id: 'muscle_up', step: 5, name: 'Negative Muscle-Up', criteria_type: 'reps', criteria_value: 5 },
    { milestone_id: 'muscle_up', step: 6, name: 'Banded Muscle-Up', criteria_type: 'reps', criteria_value: 3 },
    { milestone_id: 'muscle_up', step: 7, name: 'Muscle-Up', criteria_type: 'reps', criteria_value: 1 },

    // Front lever progression
    { milestone_id: 'full_front_lever', step: 1, name: 'Active Hang', criteria_type: 'hold_time', criteria_value: 30 },
    { milestone_id: 'full_front_lever', step: 2, name: 'Tuck Front Lever', criteria_type: 'hold_time', criteria_value: 15 },
    { milestone_id: 'full_front_lever', step: 3, name: 'Advanced Tuck', criteria_type: 'hold_time', criteria_value: 15 },
    { milestone_id: 'full_front_lever', step: 4, name: 'One Leg Front Lever', criteria_type: 'hold_time', criteria_value: 10 },
    { milestone_id: 'full_front_lever', step: 5, name: 'Straddle Front Lever', criteria_type: 'hold_time', criteria_value: 10 },
    { milestone_id: 'full_front_lever', step: 6, name: 'Full Front Lever', criteria_type: 'hold_time', criteria_value: 5 },

    // Planche progression
    { milestone_id: 'full_planche', step: 1, name: 'Planche Lean', criteria_type: 'hold_time', criteria_value: 30 },
    { milestone_id: 'full_planche', step: 2, name: 'Frog Stand', criteria_type: 'hold_time', criteria_value: 30 },
    { milestone_id: 'full_planche', step: 3, name: 'Tuck Planche', criteria_type: 'hold_time', criteria_value: 15 },
    { milestone_id: 'full_planche', step: 4, name: 'Advanced Tuck', criteria_type: 'hold_time', criteria_value: 15 },
    { milestone_id: 'full_planche', step: 5, name: 'Straddle Planche', criteria_type: 'hold_time', criteria_value: 10 },
    { milestone_id: 'full_planche', step: 6, name: 'Full Planche', criteria_type: 'hold_time', criteria_value: 5 },

    // Handstand progression
    { milestone_id: 'handstand_60s', step: 1, name: 'Chest to Wall', criteria_type: 'hold_time', criteria_value: 60 },
    { milestone_id: 'handstand_60s', step: 2, name: 'Back to Wall', criteria_type: 'hold_time', criteria_value: 60 },
    { milestone_id: 'handstand_60s', step: 3, name: 'Heel Pulls', criteria_type: 'reps', criteria_value: 10 },
    { milestone_id: 'handstand_60s', step: 4, name: 'Toe Pulls', criteria_type: 'reps', criteria_value: 10 },
    { milestone_id: 'handstand_60s', step: 5, name: '10s Freestanding', criteria_type: 'hold_time', criteria_value: 10 },
    { milestone_id: 'handstand_60s', step: 6, name: '30s Freestanding', criteria_type: 'hold_time', criteria_value: 30 },
    { milestone_id: 'handstand_60s', step: 7, name: '60s Freestanding', criteria_type: 'hold_time', criteria_value: 60 },

    // One arm pull-up progression
    { milestone_id: 'one_arm_pullup', step: 1, name: '20 Pull-Ups', criteria_type: 'reps', criteria_value: 20 },
    { milestone_id: 'one_arm_pullup', step: 2, name: 'Archer Pull-Ups', criteria_type: 'reps', criteria_value: 10 },
    { milestone_id: 'one_arm_pullup', step: 3, name: 'Typewriter Pull-Ups', criteria_type: 'reps', criteria_value: 5 },
    { milestone_id: 'one_arm_pullup', step: 4, name: 'One Arm Negative', criteria_type: 'hold_time', criteria_value: 10 },
    { milestone_id: 'one_arm_pullup', step: 5, name: 'Assisted One Arm', criteria_type: 'reps', criteria_value: 3 },
    { milestone_id: 'one_arm_pullup', step: 6, name: 'One Arm Pull-Up', criteria_type: 'reps', criteria_value: 1 },
  ];

  for (const p of progressions) {
    const id = `${p.milestone_id}_step_${p.step}`;
    await db.query(
      `INSERT INTO milestone_progressions (id, milestone_id, step_number, name, criteria_type, criteria_value, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         criteria_type = EXCLUDED.criteria_type,
         criteria_value = EXCLUDED.criteria_value`,
      [id, p.milestone_id, p.step, p.name, p.criteria_type, p.criteria_value, p.step * 10]
    );
  }

  log.info(`Seeded ${progressions.length} milestone progressions`);
  log.info('Migration 034_milestones complete');
}
