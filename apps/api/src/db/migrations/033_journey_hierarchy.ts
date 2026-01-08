/**
 * Migration: Journey Hierarchy & Templates
 *
 * Phase 2 of Journey System Overhaul:
 * - journey_categories table (persisted categories)
 * - journey_templates table (predefined journeys with defaults)
 * - Safety fields for rehabilitation journeys
 * - Exercise filter integration
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 033_journey_hierarchy');

  // ============================================
  // JOURNEY CATEGORIES TABLE
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS journey_categories (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      description TEXT,
      icon VARCHAR(64),
      display_order INT DEFAULT 100,
      parent_category_id VARCHAR(64) REFERENCES journey_categories(id),
      requires_medical_disclaimer BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ============================================
  // JOURNEY TEMPLATES TABLE
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS journey_templates (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      description TEXT,
      category_id VARCHAR(64) REFERENCES journey_categories(id),
      subcategory VARCHAR(64),
      journey_type VARCHAR(64) NOT NULL,

      -- Target defaults
      default_target_value NUMERIC,
      default_target_unit VARCHAR(32),
      suggested_duration_days INT,
      suggested_weekly_target NUMERIC,

      -- Safety & medical
      requires_medical_disclaimer BOOLEAN DEFAULT FALSE,
      requires_professional_supervision BOOLEAN DEFAULT FALSE,
      contraindications TEXT[],
      precautions TEXT[],
      medical_disclaimer_text TEXT,

      -- Exercise filtering
      exercise_filter JSONB DEFAULT '{}',
      -- Format: { locations: [], equipment: [], types: [], tags: [], exclude_tags: [] }

      -- Progression
      difficulty_level INT DEFAULT 1, -- 1-5
      prerequisite_template_ids VARCHAR(64)[],

      -- Display
      icon VARCHAR(64),
      color VARCHAR(32),
      display_order INT DEFAULT 100,
      is_featured BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,

      -- Milestones template
      default_milestones JSONB DEFAULT '[]',
      -- Format: [{ title, description, target_value, xp_reward }]

      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ============================================
  // INDEXES
  // ============================================

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_journey_templates_category
    ON journey_templates(category_id)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_journey_templates_type
    ON journey_templates(journey_type)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_journey_templates_active
    ON journey_templates(is_active) WHERE is_active = TRUE
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_journey_categories_parent
    ON journey_categories(parent_category_id)
  `);

  // ============================================
  // SEED CATEGORIES
  // ============================================

  const categories = [
    {
      id: 'weight_management',
      name: 'Weight Management',
      description: 'Lose weight, gain weight, or maintain your current weight',
      icon: 'scale',
      display_order: 10,
      requires_medical_disclaimer: false,
    },
    {
      id: 'strength_foundations',
      name: 'Strength Foundations',
      description: 'Build fundamental strength in pushing, pulling, squatting, and core',
      icon: 'dumbbell',
      display_order: 20,
      requires_medical_disclaimer: false,
    },
    {
      id: 'cardiovascular',
      name: 'Cardiovascular',
      description: 'Improve endurance through running, swimming, or cycling',
      icon: 'heart',
      display_order: 30,
      requires_medical_disclaimer: false,
    },
    {
      id: 'mobility_flexibility',
      name: 'Mobility & Flexibility',
      description: 'Increase range of motion and flexibility',
      icon: 'stretch',
      display_order: 40,
      requires_medical_disclaimer: false,
    },
    {
      id: 'rehabilitation_recovery',
      name: 'Rehabilitation & Recovery',
      description: 'Recover from injury or surgery with guided rehabilitation',
      icon: 'medical',
      display_order: 50,
      requires_medical_disclaimer: true,
    },
    {
      id: 'accessibility_adaptive',
      name: 'Accessibility & Adaptive',
      description: 'Training programs adapted for various abilities and conditions',
      icon: 'accessibility',
      display_order: 60,
      requires_medical_disclaimer: true,
    },
    {
      id: 'life_stage',
      name: 'Life Stage',
      description: 'Programs tailored for specific life stages',
      icon: 'lifecycle',
      display_order: 70,
      requires_medical_disclaimer: true,
    },
    {
      id: 'return_to_activity',
      name: 'Return to Activity',
      description: 'Get back into fitness after time away',
      icon: 'refresh',
      display_order: 80,
      requires_medical_disclaimer: false,
    },
  ];

  for (const cat of categories) {
    await db.query(
      `INSERT INTO journey_categories (id, name, description, icon, display_order, requires_medical_disclaimer)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         icon = EXCLUDED.icon,
         display_order = EXCLUDED.display_order,
         requires_medical_disclaimer = EXCLUDED.requires_medical_disclaimer`,
      [cat.id, cat.name, cat.description, cat.icon, cat.display_order, cat.requires_medical_disclaimer]
    );
  }

  // ============================================
  // SEED SUBCATEGORIES
  // ============================================

  const subcategories = [
    // Weight Management
    { id: 'lose_weight', name: 'Lose Weight', parent: 'weight_management', order: 1 },
    { id: 'gain_weight', name: 'Gain Weight', parent: 'weight_management', order: 2 },
    { id: 'body_recomp', name: 'Body Recomposition', parent: 'weight_management', order: 3 },
    { id: 'maintain_weight', name: 'Maintain Weight', parent: 'weight_management', order: 4 },

    // Strength Foundations
    { id: 'push', name: 'Pushing Strength', parent: 'strength_foundations', order: 1 },
    { id: 'pull', name: 'Pulling Strength', parent: 'strength_foundations', order: 2 },
    { id: 'squat', name: 'Squat & Legs', parent: 'strength_foundations', order: 3 },
    { id: 'core', name: 'Core Strength', parent: 'strength_foundations', order: 4 },
    { id: 'full_body', name: 'Full Body', parent: 'strength_foundations', order: 5 },

    // Cardiovascular
    { id: 'running', name: 'Running', parent: 'cardiovascular', order: 1 },
    { id: 'swimming', name: 'Swimming', parent: 'cardiovascular', order: 2 },
    { id: 'cycling', name: 'Cycling', parent: 'cardiovascular', order: 3 },
    { id: 'hiit', name: 'HIIT', parent: 'cardiovascular', order: 4 },
    { id: 'low_intensity', name: 'Low Intensity Steady State', parent: 'cardiovascular', order: 5 },

    // Mobility & Flexibility
    { id: 'general_mobility', name: 'General Mobility', parent: 'mobility_flexibility', order: 1 },
    { id: 'splits', name: 'Splits', parent: 'mobility_flexibility', order: 2 },
    { id: 'backbend', name: 'Backbend', parent: 'mobility_flexibility', order: 3 },
    { id: 'hip_mobility', name: 'Hip Mobility', parent: 'mobility_flexibility', order: 4 },
    { id: 'shoulder_mobility', name: 'Shoulder Mobility', parent: 'mobility_flexibility', order: 5 },

    // Rehabilitation & Recovery
    { id: 'shoulder_rehab', name: 'Shoulder', parent: 'rehabilitation_recovery', order: 1, medical: true },
    { id: 'back_rehab', name: 'Back & Spine', parent: 'rehabilitation_recovery', order: 2, medical: true },
    { id: 'knee_rehab', name: 'Knee', parent: 'rehabilitation_recovery', order: 3, medical: true },
    { id: 'hip_rehab', name: 'Hip', parent: 'rehabilitation_recovery', order: 4, medical: true },
    { id: 'ankle_rehab', name: 'Ankle & Foot', parent: 'rehabilitation_recovery', order: 5, medical: true },
    { id: 'wrist_rehab', name: 'Wrist & Hand', parent: 'rehabilitation_recovery', order: 6, medical: true },
    { id: 'neck_rehab', name: 'Neck', parent: 'rehabilitation_recovery', order: 7, medical: true },
    { id: 'post_surgery', name: 'Post-Surgery', parent: 'rehabilitation_recovery', order: 8, medical: true },

    // Accessibility & Adaptive
    { id: 'limited_mobility', name: 'Limited Mobility', parent: 'accessibility_adaptive', order: 1, medical: true },
    { id: 'seated_exercise', name: 'Seated Exercise', parent: 'accessibility_adaptive', order: 2, medical: true },
    { id: 'chronic_conditions', name: 'Chronic Conditions', parent: 'accessibility_adaptive', order: 3, medical: true },
    { id: 'neurological', name: 'Neurological Conditions', parent: 'accessibility_adaptive', order: 4, medical: true },
    { id: 'visual_impairment', name: 'Visual Impairment', parent: 'accessibility_adaptive', order: 5, medical: true },

    // Life Stage
    { id: 'prenatal', name: 'Prenatal', parent: 'life_stage', order: 1, medical: true },
    { id: 'postnatal', name: 'Postnatal', parent: 'life_stage', order: 2, medical: true },
    { id: 'aging_well', name: 'Aging Well (55+)', parent: 'life_stage', order: 3, medical: true },
    { id: 'teen_fitness', name: 'Teen Fitness', parent: 'life_stage', order: 4 },

    // Return to Activity
    { id: 'from_sedentary', name: 'From Sedentary', parent: 'return_to_activity', order: 1 },
    { id: 'post_illness', name: 'Post-Illness Recovery', parent: 'return_to_activity', order: 2, medical: true },
    { id: 'sport_specific', name: 'Sport-Specific Return', parent: 'return_to_activity', order: 3 },
    { id: 'mental_barriers', name: 'Overcoming Mental Barriers', parent: 'return_to_activity', order: 4 },
  ];

  for (const sub of subcategories) {
    await db.query(
      `INSERT INTO journey_categories (id, name, parent_category_id, display_order, requires_medical_disclaimer)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         parent_category_id = EXCLUDED.parent_category_id,
         display_order = EXCLUDED.display_order,
         requires_medical_disclaimer = EXCLUDED.requires_medical_disclaimer`,
      [sub.id, sub.name, sub.parent, sub.order, (sub as { medical?: boolean }).medical || false]
    );
  }

  // ============================================
  // SEED JOURNEY TEMPLATES
  // ============================================

  const templates = [
    // Weight Management - Lose Weight
    {
      id: 'lose_10_lbs',
      name: 'Lose 10 lbs',
      description: 'A beginner-friendly weight loss journey targeting 10 pounds',
      category_id: 'weight_management',
      subcategory: 'lose_weight',
      journey_type: 'weight_loss',
      default_target_value: 10,
      default_target_unit: 'lbs',
      suggested_duration_days: 70,
      suggested_weekly_target: 1,
      difficulty_level: 1,
      display_order: 1,
      default_milestones: JSON.stringify([
        { title: 'First 2 lbs', target_value: 2, xp_reward: 50 },
        { title: 'Halfway There', target_value: 5, xp_reward: 100 },
        { title: 'Almost Done', target_value: 8, xp_reward: 75 },
        { title: 'Goal Reached!', target_value: 10, xp_reward: 200 },
      ]),
    },
    {
      id: 'lose_20_lbs',
      name: 'Lose 20 lbs',
      description: 'An intermediate weight loss journey targeting 20 pounds',
      category_id: 'weight_management',
      subcategory: 'lose_weight',
      journey_type: 'weight_loss',
      default_target_value: 20,
      default_target_unit: 'lbs',
      suggested_duration_days: 140,
      suggested_weekly_target: 1,
      difficulty_level: 2,
      display_order: 2,
      default_milestones: JSON.stringify([
        { title: 'First 5 lbs', target_value: 5, xp_reward: 75 },
        { title: '10 lbs Down', target_value: 10, xp_reward: 150 },
        { title: '15 lbs Down', target_value: 15, xp_reward: 100 },
        { title: 'Goal Reached!', target_value: 20, xp_reward: 300 },
      ]),
    },
    {
      id: 'lose_50_lbs',
      name: 'Lose 50 lbs',
      description: 'A major transformation journey for significant weight loss',
      category_id: 'weight_management',
      subcategory: 'lose_weight',
      journey_type: 'weight_loss',
      default_target_value: 50,
      default_target_unit: 'lbs',
      suggested_duration_days: 365,
      suggested_weekly_target: 1,
      difficulty_level: 4,
      display_order: 3,
      default_milestones: JSON.stringify([
        { title: 'First 10 lbs', target_value: 10, xp_reward: 100 },
        { title: '25 lbs Down', target_value: 25, xp_reward: 200 },
        { title: '40 lbs Down', target_value: 40, xp_reward: 150 },
        { title: 'Goal Reached!', target_value: 50, xp_reward: 500 },
      ]),
    },

    // Weight Management - Gain Weight
    {
      id: 'gain_10_lbs_muscle',
      name: 'Gain 10 lbs of Muscle',
      description: 'Build lean muscle mass through progressive overload',
      category_id: 'weight_management',
      subcategory: 'gain_weight',
      journey_type: 'muscle_gain',
      default_target_value: 10,
      default_target_unit: 'lbs',
      suggested_duration_days: 180,
      suggested_weekly_target: 0.5,
      difficulty_level: 3,
      display_order: 1,
      default_milestones: JSON.stringify([
        { title: 'First 2 lbs', target_value: 2, xp_reward: 75 },
        { title: '5 lbs Gained', target_value: 5, xp_reward: 150 },
        { title: 'Almost There', target_value: 8, xp_reward: 100 },
        { title: 'Goal Reached!', target_value: 10, xp_reward: 250 },
      ]),
    },

    // Strength Foundations - Push
    {
      id: 'first_pushup',
      name: 'First Push-Up',
      description: 'Build up to your first full push-up from the ground',
      category_id: 'strength_foundations',
      subcategory: 'push',
      journey_type: 'strength',
      default_target_value: 1,
      default_target_unit: 'reps',
      suggested_duration_days: 30,
      difficulty_level: 1,
      display_order: 1,
      exercise_filter: JSON.stringify({ tags: ['push', 'chest', 'beginner'] }),
      default_milestones: JSON.stringify([
        { title: 'Wall Push-Ups x10', target_value: 0.3, xp_reward: 50 },
        { title: 'Incline Push-Ups x10', target_value: 0.6, xp_reward: 75 },
        { title: 'Knee Push-Ups x10', target_value: 0.9, xp_reward: 100 },
        { title: 'First Full Push-Up', target_value: 1, xp_reward: 200 },
      ]),
    },
    {
      id: 'pushups_25',
      name: '25 Push-Ups',
      description: 'Build up to 25 consecutive push-ups',
      category_id: 'strength_foundations',
      subcategory: 'push',
      journey_type: 'strength',
      default_target_value: 25,
      default_target_unit: 'reps',
      suggested_duration_days: 60,
      difficulty_level: 2,
      display_order: 2,
      exercise_filter: JSON.stringify({ tags: ['push', 'chest'] }),
      default_milestones: JSON.stringify([
        { title: '5 Push-Ups', target_value: 5, xp_reward: 50 },
        { title: '10 Push-Ups', target_value: 10, xp_reward: 75 },
        { title: '15 Push-Ups', target_value: 15, xp_reward: 100 },
        { title: '20 Push-Ups', target_value: 20, xp_reward: 100 },
        { title: '25 Push-Ups', target_value: 25, xp_reward: 200 },
      ]),
    },
    {
      id: 'pushups_50',
      name: '50 Push-Ups',
      description: 'Build up to 50 consecutive push-ups',
      category_id: 'strength_foundations',
      subcategory: 'push',
      journey_type: 'strength',
      default_target_value: 50,
      default_target_unit: 'reps',
      suggested_duration_days: 90,
      difficulty_level: 3,
      display_order: 3,
      exercise_filter: JSON.stringify({ tags: ['push', 'chest'] }),
    },
    {
      id: 'pushups_100',
      name: '100 Push-Ups',
      description: 'The classic challenge - 100 consecutive push-ups',
      category_id: 'strength_foundations',
      subcategory: 'push',
      journey_type: 'strength',
      default_target_value: 100,
      default_target_unit: 'reps',
      suggested_duration_days: 180,
      difficulty_level: 4,
      display_order: 4,
      exercise_filter: JSON.stringify({ tags: ['push', 'chest'] }),
    },

    // Strength Foundations - Pull
    {
      id: 'first_pullup',
      name: 'First Pull-Up',
      description: 'Build up to your first unassisted pull-up',
      category_id: 'strength_foundations',
      subcategory: 'pull',
      journey_type: 'strength',
      default_target_value: 1,
      default_target_unit: 'reps',
      suggested_duration_days: 60,
      difficulty_level: 2,
      display_order: 1,
      exercise_filter: JSON.stringify({ tags: ['pull', 'back', 'lats'] }),
      default_milestones: JSON.stringify([
        { title: 'Dead Hang 30s', target_value: 0.25, xp_reward: 50 },
        { title: 'Active Hang 15s', target_value: 0.5, xp_reward: 75 },
        { title: 'Negative Pull-Up', target_value: 0.75, xp_reward: 100 },
        { title: 'First Pull-Up', target_value: 1, xp_reward: 250 },
      ]),
    },
    {
      id: 'pullups_10',
      name: '10 Pull-Ups',
      description: 'Build up to 10 consecutive pull-ups',
      category_id: 'strength_foundations',
      subcategory: 'pull',
      journey_type: 'strength',
      default_target_value: 10,
      default_target_unit: 'reps',
      suggested_duration_days: 90,
      difficulty_level: 3,
      display_order: 2,
      exercise_filter: JSON.stringify({ tags: ['pull', 'back'] }),
    },
    {
      id: 'pullups_20',
      name: '20 Pull-Ups',
      description: 'Build up to 20 consecutive pull-ups',
      category_id: 'strength_foundations',
      subcategory: 'pull',
      journey_type: 'strength',
      default_target_value: 20,
      default_target_unit: 'reps',
      suggested_duration_days: 180,
      difficulty_level: 4,
      display_order: 3,
      exercise_filter: JSON.stringify({ tags: ['pull', 'back'] }),
    },

    // Strength Foundations - Squat
    {
      id: 'bodyweight_squat_50',
      name: '50 Bodyweight Squats',
      description: 'Build up to 50 consecutive bodyweight squats',
      category_id: 'strength_foundations',
      subcategory: 'squat',
      journey_type: 'strength',
      default_target_value: 50,
      default_target_unit: 'reps',
      suggested_duration_days: 45,
      difficulty_level: 1,
      display_order: 1,
      exercise_filter: JSON.stringify({ tags: ['squat', 'legs', 'bodyweight'] }),
    },
    {
      id: 'pistol_squat',
      name: 'Pistol Squat',
      description: 'Master the single-leg pistol squat',
      category_id: 'strength_foundations',
      subcategory: 'squat',
      journey_type: 'skill_acquisition',
      default_target_value: 1,
      default_target_unit: 'reps',
      suggested_duration_days: 120,
      difficulty_level: 4,
      display_order: 2,
      exercise_filter: JSON.stringify({ tags: ['squat', 'legs', 'balance'] }),
    },

    // Strength Foundations - Core
    {
      id: 'plank_60s',
      name: '60 Second Plank',
      description: 'Build up to a 60 second plank hold',
      category_id: 'strength_foundations',
      subcategory: 'core',
      journey_type: 'strength',
      default_target_value: 60,
      default_target_unit: 'seconds',
      suggested_duration_days: 30,
      difficulty_level: 1,
      display_order: 1,
      exercise_filter: JSON.stringify({ tags: ['core', 'plank'] }),
    },
    {
      id: 'plank_5min',
      name: '5 Minute Plank',
      description: 'The ultimate core endurance challenge',
      category_id: 'strength_foundations',
      subcategory: 'core',
      journey_type: 'strength',
      default_target_value: 300,
      default_target_unit: 'seconds',
      suggested_duration_days: 120,
      difficulty_level: 4,
      display_order: 2,
      exercise_filter: JSON.stringify({ tags: ['core', 'plank'] }),
    },

    // Cardiovascular - Running
    {
      id: 'couch_to_5k',
      name: 'Couch to 5K',
      description: 'Go from zero to running a 5K in 8-10 weeks',
      category_id: 'cardiovascular',
      subcategory: 'running',
      journey_type: 'endurance',
      default_target_value: 5,
      default_target_unit: 'km',
      suggested_duration_days: 56,
      difficulty_level: 2,
      display_order: 1,
      is_featured: true,
      exercise_filter: JSON.stringify({ tags: ['running', 'cardio'] }),
      default_milestones: JSON.stringify([
        { title: 'Run 1 minute', target_value: 0.2, xp_reward: 50 },
        { title: 'Run 5 minutes', target_value: 0.8, xp_reward: 75 },
        { title: 'Run 1 mile', target_value: 1.6, xp_reward: 100 },
        { title: 'Run 3K', target_value: 3, xp_reward: 150 },
        { title: 'Complete 5K', target_value: 5, xp_reward: 300 },
      ]),
    },
    {
      id: 'run_10k',
      name: 'Run a 10K',
      description: 'Train to complete a 10 kilometer run',
      category_id: 'cardiovascular',
      subcategory: 'running',
      journey_type: 'endurance',
      default_target_value: 10,
      default_target_unit: 'km',
      suggested_duration_days: 84,
      difficulty_level: 3,
      display_order: 2,
      exercise_filter: JSON.stringify({ tags: ['running', 'cardio'] }),
    },
    {
      id: 'run_half_marathon',
      name: 'Half Marathon',
      description: 'Train to complete a half marathon (21.1 km)',
      category_id: 'cardiovascular',
      subcategory: 'running',
      journey_type: 'endurance',
      default_target_value: 21.1,
      default_target_unit: 'km',
      suggested_duration_days: 120,
      difficulty_level: 4,
      display_order: 3,
      exercise_filter: JSON.stringify({ tags: ['running', 'cardio'] }),
    },
    {
      id: 'run_marathon',
      name: 'Marathon',
      description: 'Train to complete a full marathon (42.2 km)',
      category_id: 'cardiovascular',
      subcategory: 'running',
      journey_type: 'endurance',
      default_target_value: 42.2,
      default_target_unit: 'km',
      suggested_duration_days: 180,
      difficulty_level: 5,
      display_order: 4,
      exercise_filter: JSON.stringify({ tags: ['running', 'cardio'] }),
    },

    // Cardiovascular - HIIT
    {
      id: 'hiit_beginner',
      name: 'HIIT Beginner',
      description: 'Introduction to High Intensity Interval Training',
      category_id: 'cardiovascular',
      subcategory: 'hiit',
      journey_type: 'endurance',
      default_target_value: 20,
      default_target_unit: 'minutes',
      suggested_duration_days: 30,
      difficulty_level: 2,
      display_order: 1,
      exercise_filter: JSON.stringify({ tags: ['hiit', 'cardio', 'beginner'] }),
    },

    // Mobility & Flexibility
    {
      id: 'touch_toes',
      name: 'Touch Your Toes',
      description: 'Improve hamstring flexibility to touch your toes',
      category_id: 'mobility_flexibility',
      subcategory: 'general_mobility',
      journey_type: 'flexibility',
      suggested_duration_days: 30,
      difficulty_level: 1,
      display_order: 1,
      exercise_filter: JSON.stringify({ tags: ['flexibility', 'hamstrings', 'stretch'] }),
    },
    {
      id: 'front_splits',
      name: 'Front Splits',
      description: 'Work towards a full front split',
      category_id: 'mobility_flexibility',
      subcategory: 'splits',
      journey_type: 'flexibility',
      suggested_duration_days: 180,
      difficulty_level: 4,
      display_order: 1,
      exercise_filter: JSON.stringify({ tags: ['flexibility', 'splits', 'hips'] }),
    },
    {
      id: 'middle_splits',
      name: 'Middle Splits',
      description: 'Work towards a full middle split (straddle)',
      category_id: 'mobility_flexibility',
      subcategory: 'splits',
      journey_type: 'flexibility',
      suggested_duration_days: 365,
      difficulty_level: 5,
      display_order: 2,
      exercise_filter: JSON.stringify({ tags: ['flexibility', 'splits', 'hips'] }),
    },

    // Rehabilitation - Shoulder
    {
      id: 'shoulder_impingement_rehab',
      name: 'Shoulder Impingement Rehab',
      description: 'Rehabilitation program for shoulder impingement syndrome',
      category_id: 'rehabilitation_recovery',
      subcategory: 'shoulder_rehab',
      journey_type: 'rehabilitation',
      suggested_duration_days: 60,
      difficulty_level: 2,
      display_order: 1,
      requires_medical_disclaimer: true,
      requires_professional_supervision: true,
      contraindications: ['acute injury', 'torn rotator cuff', 'frozen shoulder'],
      precautions: ['Start with low resistance', 'Stop if pain increases', 'Follow medical advice'],
      medical_disclaimer_text: 'This program is not a substitute for professional medical advice. Consult your healthcare provider before starting.',
      exercise_filter: JSON.stringify({ tags: ['shoulder', 'rehab', 'rotator_cuff'], exclude_tags: ['heavy', 'explosive'] }),
    },
    {
      id: 'rotator_cuff_rehab',
      name: 'Rotator Cuff Recovery',
      description: 'Rehabilitation for rotator cuff issues',
      category_id: 'rehabilitation_recovery',
      subcategory: 'shoulder_rehab',
      journey_type: 'rehabilitation',
      suggested_duration_days: 90,
      difficulty_level: 2,
      display_order: 2,
      requires_medical_disclaimer: true,
      requires_professional_supervision: true,
      contraindications: ['complete tear requiring surgery', 'acute inflammation'],
      precautions: ['Progress slowly', 'Ice after exercises if needed'],
      exercise_filter: JSON.stringify({ tags: ['shoulder', 'rehab', 'rotator_cuff'], exclude_tags: ['heavy'] }),
    },

    // Rehabilitation - Back
    {
      id: 'lower_back_pain_rehab',
      name: 'Lower Back Pain Relief',
      description: 'Exercise program to alleviate lower back pain',
      category_id: 'rehabilitation_recovery',
      subcategory: 'back_rehab',
      journey_type: 'rehabilitation',
      suggested_duration_days: 45,
      difficulty_level: 2,
      display_order: 1,
      requires_medical_disclaimer: true,
      requires_professional_supervision: true,
      contraindications: ['acute disc herniation', 'spinal stenosis', 'recent back surgery'],
      precautions: ['Avoid flexion-based exercises if disc-related', 'No heavy lifting'],
      exercise_filter: JSON.stringify({ tags: ['back', 'core', 'rehab'], exclude_tags: ['heavy', 'deadlift'] }),
    },

    // Rehabilitation - Knee
    {
      id: 'acl_rehab',
      name: 'ACL Recovery Program',
      description: 'Post-ACL reconstruction rehabilitation',
      category_id: 'rehabilitation_recovery',
      subcategory: 'knee_rehab',
      journey_type: 'rehabilitation',
      suggested_duration_days: 270,
      difficulty_level: 4,
      display_order: 1,
      requires_medical_disclaimer: true,
      requires_professional_supervision: true,
      contraindications: ['before medical clearance', 'active infection'],
      precautions: ['Follow surgeon timeline', 'Progress based on PT assessment'],
      exercise_filter: JSON.stringify({ tags: ['knee', 'rehab', 'legs'], exclude_tags: ['jumping', 'cutting', 'pivoting'] }),
    },
    {
      id: 'knee_arthritis_management',
      name: 'Knee Arthritis Management',
      description: 'Exercise program for knee osteoarthritis',
      category_id: 'rehabilitation_recovery',
      subcategory: 'knee_rehab',
      journey_type: 'rehabilitation',
      suggested_duration_days: 90,
      difficulty_level: 2,
      display_order: 2,
      requires_medical_disclaimer: true,
      contraindications: ['acute flare-up', 'severe joint damage'],
      precautions: ['Low impact only', 'Avoid deep squats'],
      exercise_filter: JSON.stringify({ tags: ['knee', 'low_impact', 'gentle'], exclude_tags: ['jumping', 'running', 'heavy'] }),
    },

    // Accessibility & Adaptive
    {
      id: 'wheelchair_upper_body',
      name: 'Wheelchair Upper Body Fitness',
      description: 'Complete upper body workout program from a wheelchair',
      category_id: 'accessibility_adaptive',
      subcategory: 'seated_exercise',
      journey_type: 'general_fitness',
      suggested_duration_days: 60,
      difficulty_level: 2,
      display_order: 1,
      requires_medical_disclaimer: true,
      exercise_filter: JSON.stringify({ tags: ['seated', 'upper_body', 'adaptive'], locations: ['home', 'gym'] }),
    },
    {
      id: 'chair_fitness',
      name: 'Chair-Based Fitness',
      description: 'Full workout program performed entirely from a chair',
      category_id: 'accessibility_adaptive',
      subcategory: 'seated_exercise',
      journey_type: 'general_fitness',
      suggested_duration_days: 45,
      difficulty_level: 1,
      display_order: 2,
      requires_medical_disclaimer: true,
      exercise_filter: JSON.stringify({ tags: ['seated', 'chair', 'gentle'] }),
    },
    {
      id: 'parkinsons_exercise',
      name: 'Parkinson\'s Exercise Program',
      description: 'Exercise program designed for people with Parkinson\'s disease',
      category_id: 'accessibility_adaptive',
      subcategory: 'neurological',
      journey_type: 'general_fitness',
      suggested_duration_days: 90,
      difficulty_level: 2,
      display_order: 1,
      requires_medical_disclaimer: true,
      requires_professional_supervision: true,
      precautions: ['Have support nearby', 'Avoid exercises during OFF periods'],
      exercise_filter: JSON.stringify({ tags: ['balance', 'coordination', 'parkinsons', 'gentle'] }),
    },

    // Life Stage
    {
      id: 'prenatal_first_trimester',
      name: 'First Trimester Fitness',
      description: 'Safe exercise during the first trimester of pregnancy',
      category_id: 'life_stage',
      subcategory: 'prenatal',
      journey_type: 'general_fitness',
      suggested_duration_days: 90,
      difficulty_level: 2,
      display_order: 1,
      requires_medical_disclaimer: true,
      requires_professional_supervision: true,
      contraindications: ['high-risk pregnancy', 'placenta previa', 'preeclampsia'],
      precautions: ['Avoid overheating', 'No lying flat on back after 16 weeks', 'Stay hydrated'],
      exercise_filter: JSON.stringify({ tags: ['prenatal', 'low_impact', 'safe_pregnancy'], exclude_tags: ['high_intensity', 'jumping', 'contact'] }),
    },
    {
      id: 'postnatal_recovery',
      name: 'Postnatal Recovery',
      description: 'Gentle return to exercise after childbirth',
      category_id: 'life_stage',
      subcategory: 'postnatal',
      journey_type: 'general_fitness',
      suggested_duration_days: 90,
      difficulty_level: 2,
      display_order: 1,
      requires_medical_disclaimer: true,
      requires_professional_supervision: true,
      contraindications: ['diastasis recti without clearance', 'pelvic floor dysfunction'],
      precautions: ['Wait for 6-week clearance', 'Start with pelvic floor exercises'],
      exercise_filter: JSON.stringify({ tags: ['postnatal', 'core', 'pelvic_floor', 'gentle'] }),
    },
    {
      id: 'senior_strength',
      name: 'Strength for Seniors',
      description: 'Safe strength training for adults 65+',
      category_id: 'life_stage',
      subcategory: 'aging_well',
      journey_type: 'strength',
      suggested_duration_days: 90,
      difficulty_level: 2,
      display_order: 1,
      requires_medical_disclaimer: true,
      precautions: ['Have chair nearby for balance', 'Avoid holding breath'],
      exercise_filter: JSON.stringify({ tags: ['senior', 'balance', 'strength', 'low_impact'] }),
    },
    {
      id: 'senior_balance',
      name: 'Balance & Fall Prevention',
      description: 'Improve balance and reduce fall risk for seniors',
      category_id: 'life_stage',
      subcategory: 'aging_well',
      journey_type: 'general_fitness',
      suggested_duration_days: 60,
      difficulty_level: 2,
      display_order: 2,
      requires_medical_disclaimer: true,
      precautions: ['Always have support nearby', 'Clear exercise area of obstacles'],
      exercise_filter: JSON.stringify({ tags: ['balance', 'senior', 'stability'] }),
    },

    // Return to Activity
    {
      id: 'from_couch',
      name: 'From the Couch',
      description: 'Start your fitness journey from a completely sedentary lifestyle',
      category_id: 'return_to_activity',
      subcategory: 'from_sedentary',
      journey_type: 'general_fitness',
      suggested_duration_days: 60,
      difficulty_level: 1,
      display_order: 1,
      is_featured: true,
      exercise_filter: JSON.stringify({ tags: ['beginner', 'gentle', 'low_impact'] }),
      default_milestones: JSON.stringify([
        { title: 'First Week Complete', target_value: 7, xp_reward: 50 },
        { title: 'Two Weeks Strong', target_value: 14, xp_reward: 75 },
        { title: 'One Month In', target_value: 30, xp_reward: 150 },
        { title: 'Journey Complete', target_value: 60, xp_reward: 300 },
      ]),
    },
    {
      id: 'post_covid_return',
      name: 'Post-COVID Return to Exercise',
      description: 'Safely return to exercise after COVID-19 recovery',
      category_id: 'return_to_activity',
      subcategory: 'post_illness',
      journey_type: 'recovery',
      suggested_duration_days: 45,
      difficulty_level: 2,
      display_order: 1,
      requires_medical_disclaimer: true,
      requires_professional_supervision: true,
      contraindications: ['ongoing symptoms', 'cardiac involvement'],
      precautions: ['Monitor heart rate', 'Watch for symptom recurrence', 'Progress slowly'],
      exercise_filter: JSON.stringify({ tags: ['recovery', 'gentle', 'low_intensity'], exclude_tags: ['hiit', 'heavy'] }),
    },
    {
      id: 'gym_anxiety',
      name: 'Overcoming Gym Anxiety',
      description: 'Build confidence to exercise in a gym environment',
      category_id: 'return_to_activity',
      subcategory: 'mental_barriers',
      journey_type: 'general_fitness',
      suggested_duration_days: 30,
      difficulty_level: 1,
      display_order: 1,
      exercise_filter: JSON.stringify({ locations: ['gym'], tags: ['beginner', 'simple'] }),
      default_milestones: JSON.stringify([
        { title: 'Visited the Gym', target_value: 1, xp_reward: 75 },
        { title: '3 Gym Sessions', target_value: 3, xp_reward: 100 },
        { title: 'One Week', target_value: 7, xp_reward: 150 },
        { title: 'Gym Regular', target_value: 30, xp_reward: 300 },
      ]),
    },
  ];

  for (const template of templates) {
    await db.query(
      `INSERT INTO journey_templates (
        id, name, description, category_id, subcategory, journey_type,
        default_target_value, default_target_unit, suggested_duration_days, suggested_weekly_target,
        requires_medical_disclaimer, requires_professional_supervision, contraindications, precautions,
        exercise_filter, difficulty_level, display_order, is_featured, default_milestones
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category_id = EXCLUDED.category_id,
        subcategory = EXCLUDED.subcategory,
        journey_type = EXCLUDED.journey_type,
        default_target_value = EXCLUDED.default_target_value,
        default_target_unit = EXCLUDED.default_target_unit,
        suggested_duration_days = EXCLUDED.suggested_duration_days,
        suggested_weekly_target = EXCLUDED.suggested_weekly_target,
        requires_medical_disclaimer = EXCLUDED.requires_medical_disclaimer,
        requires_professional_supervision = EXCLUDED.requires_professional_supervision,
        contraindications = EXCLUDED.contraindications,
        precautions = EXCLUDED.precautions,
        exercise_filter = EXCLUDED.exercise_filter,
        difficulty_level = EXCLUDED.difficulty_level,
        display_order = EXCLUDED.display_order,
        is_featured = EXCLUDED.is_featured,
        default_milestones = EXCLUDED.default_milestones,
        updated_at = NOW()`,
      [
        template.id,
        template.name,
        template.description,
        template.category_id,
        template.subcategory,
        template.journey_type,
        template.default_target_value ?? null,
        template.default_target_unit ?? null,
        template.suggested_duration_days ?? null,
        template.suggested_weekly_target ?? null,
        template.requires_medical_disclaimer ?? false,
        template.requires_professional_supervision ?? false,
        (template as { contraindications?: string[] }).contraindications ?? null,
        (template as { precautions?: string[] }).precautions ?? null,
        template.exercise_filter ?? '{}',
        template.difficulty_level ?? 1,
        template.display_order ?? 100,
        template.is_featured ?? false,
        template.default_milestones ?? '[]',
      ]
    );
  }

  log.info(`Seeded ${categories.length} categories, ${subcategories.length} subcategories, ${templates.length} templates`);
  log.info('Migration 033_journey_hierarchy complete');
}
