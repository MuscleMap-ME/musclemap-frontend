/**
 * Migration 133: Journey Progression Chains
 *
 * Creates infrastructure for multi-year journey continuity:
 * - journey_progression_chains: Links journey templates into progression sequences
 *
 * This enables users to automatically unlock the next journey in a chain
 * when they complete their current journey, supporting long-term fitness
 * goals that span multiple years.
 *
 * Example chains:
 * - Weight Loss: Lose 10 lbs -> Lose 25 lbs -> Lose 50 lbs -> Maintain Weight
 * - Running: 5K -> 10K -> Half Marathon -> Marathon
 * - Pull-ups: First Pull-up -> 10 Pull-ups -> 20 Pull-ups -> Weighted Pull-ups
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

export async function up(): Promise<void> {
  log.info('Running migration: 133_journey_progression_chains');

  // ============================================
  // JOURNEY PROGRESSION CHAINS TABLE
  // ============================================
  if (!(await tableExists('journey_progression_chains'))) {
    log.info('Creating journey_progression_chains table...');
    await db.query(`
      CREATE TABLE journey_progression_chains (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        -- Chain identity
        chain_name TEXT NOT NULL,
        chain_description TEXT,
        chain_order INTEGER NOT NULL DEFAULT 0,

        -- Journey linkage
        source_journey_template_id VARCHAR(64) NOT NULL REFERENCES journey_templates(id) ON DELETE CASCADE,
        target_journey_template_id VARCHAR(64) NOT NULL REFERENCES journey_templates(id) ON DELETE CASCADE,

        -- Unlock criteria (JSONB for flexibility)
        -- Example: { "completion_percentage": 100, "min_milestones": 3, "min_days_active": 30 }
        unlock_criteria JSONB DEFAULT '{"completion_percentage": 100}',

        -- Rewards for completing chain progression
        bonus_xp INTEGER DEFAULT 0,
        bonus_credits INTEGER DEFAULT 0,
        unlock_achievement_key TEXT,

        -- Display settings
        icon TEXT,
        color TEXT,
        is_featured BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        -- Constraints
        CONSTRAINT different_journeys CHECK (source_journey_template_id != target_journey_template_id),
        CONSTRAINT positive_bonus_xp CHECK (bonus_xp >= 0),
        CONSTRAINT positive_chain_order CHECK (chain_order >= 0)
      )
    `);

    // Unique constraint: each source journey can only have one next journey in a specific chain
    await db.query(`
      CREATE UNIQUE INDEX idx_progression_chains_source_chain
      ON journey_progression_chains(chain_name, source_journey_template_id)
      WHERE is_active = TRUE
    `);

    // Index for finding chains by source journey
    await db.query(`
      CREATE INDEX idx_progression_chains_source
      ON journey_progression_chains(source_journey_template_id)
      WHERE is_active = TRUE
    `);

    // Index for finding chains by target journey
    await db.query(`
      CREATE INDEX idx_progression_chains_target
      ON journey_progression_chains(target_journey_template_id)
      WHERE is_active = TRUE
    `);

    // Index for listing all chains by name
    await db.query(`
      CREATE INDEX idx_progression_chains_name
      ON journey_progression_chains(chain_name, chain_order)
      WHERE is_active = TRUE
    `);

    // Index for featured chains
    await db.query(`
      CREATE INDEX idx_progression_chains_featured
      ON journey_progression_chains(is_featured, chain_name)
      WHERE is_active = TRUE AND is_featured = TRUE
    `);

    log.info('Created journey_progression_chains table with indexes');
  }

  // ============================================
  // UPDATE TRIGGER
  // ============================================
  await db.query(`
    CREATE OR REPLACE FUNCTION update_progression_chains_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await db.query(`
    DROP TRIGGER IF EXISTS tr_progression_chains_updated ON journey_progression_chains;
    CREATE TRIGGER tr_progression_chains_updated
    BEFORE UPDATE ON journey_progression_chains
    FOR EACH ROW EXECUTE FUNCTION update_progression_chains_timestamp()
  `);

  // ============================================
  // ADD CHAIN COMPLETION TRACKING TO USER JOURNEYS
  // ============================================
  // Check if columns exist in user_journeys table
  const hasChainColumn = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = 'user_journeys' AND column_name = 'chain_name'`
  );

  if (parseInt(hasChainColumn?.count || '0') === 0) {
    log.info('Adding chain tracking columns to user_journeys...');

    // Track which chain this journey is part of
    await db.query(`
      ALTER TABLE user_journeys
      ADD COLUMN chain_name TEXT,
      ADD COLUMN chain_position INTEGER DEFAULT 0,
      ADD COLUMN previous_journey_id UUID REFERENCES user_journeys(id) ON DELETE SET NULL,
      ADD COLUMN next_journey_unlocked BOOLEAN DEFAULT FALSE
    `);

    // Index for finding journeys in a chain
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_journeys_chain
      ON user_journeys(user_id, chain_name, chain_position)
      WHERE chain_name IS NOT NULL
    `);

    log.info('Added chain tracking columns to user_journeys');
  }

  // ============================================
  // ADD CHAIN COMPLETION ACHIEVEMENTS
  // ============================================
  log.info('Adding chain completion achievements...');

  const chainAchievements = [
    {
      key: 'chain_step_complete',
      name: 'Chain Reaction',
      description: 'Complete a journey and unlock the next one in a progression chain',
      icon: '🔗',
      category: 'milestone',
      points: 150,
      rarity: 'uncommon',
      enabled: true,
    },
    {
      key: 'chain_complete',
      name: 'Full Circle',
      description: 'Complete an entire journey progression chain',
      icon: '🏆',
      category: 'milestone',
      points: 500,
      rarity: 'rare',
      enabled: true,
    },
    {
      key: 'chains_complete_3',
      name: 'Chain Master',
      description: 'Complete 3 different journey progression chains',
      icon: '⛓️',
      category: 'milestone',
      points: 1000,
      rarity: 'epic',
      enabled: true,
    },
    {
      key: 'multi_year_journey',
      name: 'Long Game',
      description: 'Progress through a chain spanning more than 1 year',
      icon: '📅',
      category: 'milestone',
      points: 750,
      rarity: 'rare',
      enabled: true,
    },
  ];

  for (const a of chainAchievements) {
    await db.query(
      `INSERT INTO achievement_definitions (key, name, description, icon, category, points, rarity, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (key) DO NOTHING`,
      [a.key, a.name, a.description, a.icon, a.category, a.points, a.rarity, a.enabled]
    );
  }

  // ============================================
  // ADD MISSING JOURNEY TEMPLATES FOR CHAINS
  // ============================================
  log.info('Adding missing journey templates for chains...');

  const additionalTemplates = [
    // Weight Management - Maintenance
    {
      id: 'maintain_weight_journey',
      name: 'Maintain Your Weight',
      description: 'Sustain your weight loss success with healthy habits',
      category_id: 'weight_management',
      subcategory: 'maintain_weight',
      journey_type: 'maintenance',
      suggested_duration_days: 365,
      difficulty_level: 2,
      display_order: 5,
      default_milestones: JSON.stringify([
        { title: '1 Month Stable', target_value: 30, xp_reward: 100 },
        { title: '3 Months Stable', target_value: 90, xp_reward: 200 },
        { title: '6 Months Stable', target_value: 180, xp_reward: 300 },
        { title: '1 Year Maintained', target_value: 365, xp_reward: 500 },
      ]),
    },
    // Muscle Gain - Additional stages
    {
      id: 'gain_5_lbs_muscle',
      name: 'Gain 5 lbs of Muscle',
      description: 'Build your first 5 pounds of lean muscle mass',
      category_id: 'weight_management',
      subcategory: 'gain_weight',
      journey_type: 'muscle_gain',
      default_target_value: 5,
      default_target_unit: 'lbs',
      suggested_duration_days: 90,
      suggested_weekly_target: 0.5,
      difficulty_level: 2,
      display_order: 1,
      default_milestones: JSON.stringify([
        { title: 'First Pound', target_value: 1, xp_reward: 50 },
        { title: '2.5 lbs Gained', target_value: 2.5, xp_reward: 75 },
        { title: 'Goal Reached!', target_value: 5, xp_reward: 150 },
      ]),
    },
    {
      id: 'gain_15_lbs_muscle',
      name: 'Gain 15 lbs of Muscle',
      description: 'Continue building muscle with an intermediate bulk',
      category_id: 'weight_management',
      subcategory: 'gain_weight',
      journey_type: 'muscle_gain',
      default_target_value: 15,
      default_target_unit: 'lbs',
      suggested_duration_days: 270,
      suggested_weekly_target: 0.5,
      difficulty_level: 3,
      display_order: 3,
      default_milestones: JSON.stringify([
        { title: 'First 5 lbs', target_value: 5, xp_reward: 100 },
        { title: '10 lbs Gained', target_value: 10, xp_reward: 150 },
        { title: 'Goal Reached!', target_value: 15, xp_reward: 300 },
      ]),
    },
    {
      id: 'gain_30_lbs_muscle',
      name: 'Gain 30 lbs of Muscle',
      description: 'Major muscle building transformation over 2+ years',
      category_id: 'weight_management',
      subcategory: 'gain_weight',
      journey_type: 'muscle_gain',
      default_target_value: 30,
      default_target_unit: 'lbs',
      suggested_duration_days: 540,
      suggested_weekly_target: 0.4,
      difficulty_level: 4,
      display_order: 4,
      default_milestones: JSON.stringify([
        { title: 'First 10 lbs', target_value: 10, xp_reward: 150 },
        { title: '20 lbs Gained', target_value: 20, xp_reward: 250 },
        { title: 'Goal Reached!', target_value: 30, xp_reward: 500 },
      ]),
    },
    {
      id: 'maintain_muscle',
      name: 'Maintain Muscle Mass',
      description: 'Preserve your hard-earned muscle gains',
      category_id: 'weight_management',
      subcategory: 'gain_weight',
      journey_type: 'maintenance',
      suggested_duration_days: 365,
      difficulty_level: 2,
      display_order: 5,
      default_milestones: JSON.stringify([
        { title: '3 Months Maintained', target_value: 90, xp_reward: 150 },
        { title: '6 Months Maintained', target_value: 180, xp_reward: 250 },
        { title: '1 Year Maintained', target_value: 365, xp_reward: 500 },
      ]),
    },
    // Strength Foundations - Progressive levels
    {
      id: 'beginner_strength',
      name: 'Beginner Strength Program',
      description: 'Build a solid foundation of strength with basic compound movements',
      category_id: 'strength_foundations',
      subcategory: 'full_body',
      journey_type: 'strength',
      suggested_duration_days: 90,
      difficulty_level: 1,
      display_order: 1,
      exercise_filter: JSON.stringify({ tags: ['beginner', 'compound', 'strength'] }),
      default_milestones: JSON.stringify([
        { title: 'Learn the Movements', target_value: 14, xp_reward: 50 },
        { title: '1 Month Complete', target_value: 30, xp_reward: 100 },
        { title: '2 Months Complete', target_value: 60, xp_reward: 150 },
        { title: 'Program Complete', target_value: 90, xp_reward: 250 },
      ]),
    },
    {
      id: 'intermediate_strength',
      name: 'Intermediate Strength Program',
      description: 'Progress to heavier weights and more advanced techniques',
      category_id: 'strength_foundations',
      subcategory: 'full_body',
      journey_type: 'strength',
      suggested_duration_days: 120,
      difficulty_level: 2,
      display_order: 2,
      exercise_filter: JSON.stringify({ tags: ['intermediate', 'compound', 'strength'] }),
      default_milestones: JSON.stringify([
        { title: '1 Month Progress', target_value: 30, xp_reward: 100 },
        { title: '2 Months Progress', target_value: 60, xp_reward: 150 },
        { title: '3 Months Progress', target_value: 90, xp_reward: 200 },
        { title: 'Program Complete', target_value: 120, xp_reward: 300 },
      ]),
    },
    {
      id: 'advanced_strength',
      name: 'Advanced Strength Program',
      description: 'Push your limits with periodized training and peak performance',
      category_id: 'strength_foundations',
      subcategory: 'full_body',
      journey_type: 'strength',
      suggested_duration_days: 180,
      difficulty_level: 4,
      display_order: 3,
      exercise_filter: JSON.stringify({ tags: ['advanced', 'compound', 'strength'] }),
      default_milestones: JSON.stringify([
        { title: '2 Months Progress', target_value: 60, xp_reward: 150 },
        { title: '4 Months Progress', target_value: 120, xp_reward: 250 },
        { title: 'Program Complete', target_value: 180, xp_reward: 400 },
      ]),
    },
    {
      id: 'elite_strength',
      name: 'Elite Strength Program',
      description: 'Train like a competitive powerlifter or strongman',
      category_id: 'strength_foundations',
      subcategory: 'full_body',
      journey_type: 'strength',
      suggested_duration_days: 365,
      difficulty_level: 5,
      display_order: 4,
      exercise_filter: JSON.stringify({ tags: ['elite', 'powerlifting', 'strength'] }),
      default_milestones: JSON.stringify([
        { title: '3 Months Progress', target_value: 90, xp_reward: 200 },
        { title: '6 Months Progress', target_value: 180, xp_reward: 350 },
        { title: '9 Months Progress', target_value: 270, xp_reward: 450 },
        { title: 'Elite Level Achieved', target_value: 365, xp_reward: 750 },
      ]),
    },
    // Pull-up progression - Weighted
    {
      id: 'weighted_pullups',
      name: 'Weighted Pull-Ups',
      description: 'Add external resistance to your pull-ups',
      category_id: 'strength_foundations',
      subcategory: 'pull',
      journey_type: 'strength',
      default_target_value: 45,
      default_target_unit: 'lbs',
      suggested_duration_days: 180,
      difficulty_level: 4,
      display_order: 4,
      exercise_filter: JSON.stringify({ tags: ['pull', 'back', 'weighted'] }),
      default_milestones: JSON.stringify([
        { title: '10 lbs Added', target_value: 10, xp_reward: 100 },
        { title: '25 lbs Added', target_value: 25, xp_reward: 200 },
        { title: '45 lbs Added', target_value: 45, xp_reward: 400 },
      ]),
    },
    // Flexibility - Full Mobility
    {
      id: 'full_mobility_mastery',
      name: 'Full Mobility Mastery',
      description: 'Achieve complete body mobility and flexibility',
      category_id: 'mobility_flexibility',
      subcategory: 'general_mobility',
      journey_type: 'flexibility',
      suggested_duration_days: 365,
      difficulty_level: 5,
      display_order: 10,
      exercise_filter: JSON.stringify({ tags: ['mobility', 'flexibility', 'advanced'] }),
      default_milestones: JSON.stringify([
        { title: 'Upper Body Mobile', target_value: 90, xp_reward: 200 },
        { title: 'Lower Body Mobile', target_value: 180, xp_reward: 300 },
        { title: 'Full Body Mastery', target_value: 365, xp_reward: 600 },
      ]),
    },
  ];

  for (const template of additionalTemplates) {
    await db.query(
      `INSERT INTO journey_templates (
        id, name, description, category_id, subcategory, journey_type,
        default_target_value, default_target_unit, suggested_duration_days, suggested_weekly_target,
        difficulty_level, display_order, exercise_filter, default_milestones
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
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
        difficulty_level = EXCLUDED.difficulty_level,
        display_order = EXCLUDED.display_order,
        exercise_filter = EXCLUDED.exercise_filter,
        default_milestones = EXCLUDED.default_milestones,
        updated_at = NOW()`,
      [
        template.id,
        template.name,
        template.description,
        template.category_id,
        template.subcategory,
        template.journey_type,
        (template as { default_target_value?: number }).default_target_value ?? null,
        (template as { default_target_unit?: string }).default_target_unit ?? null,
        template.suggested_duration_days ?? null,
        (template as { suggested_weekly_target?: number }).suggested_weekly_target ?? null,
        template.difficulty_level ?? 1,
        template.display_order ?? 100,
        (template as { exercise_filter?: string }).exercise_filter ?? '{}',
        template.default_milestones ?? '[]',
      ]
    );
  }

  log.info(`Added ${additionalTemplates.length} journey templates for progression chains`);

  // ============================================
  // SEED PROGRESSION CHAINS
  // ============================================
  log.info('Seeding journey progression chains...');

  const progressionChains = [
    // Weight Loss Chain (3 steps)
    {
      chain_name: 'weight_loss_progression',
      chain_description: 'Progressive weight loss journey from 10 lbs to sustainable maintenance',
      chain_order: 0,
      source_journey_template_id: 'lose_10_lbs',
      target_journey_template_id: 'lose_20_lbs',
      unlock_criteria: { completion_percentage: 100, min_milestones: 3 },
      bonus_xp: 200,
      bonus_credits: 50,
      icon: '🏋️',
      color: '#4CAF50',
      is_featured: true,
    },
    {
      chain_name: 'weight_loss_progression',
      chain_description: 'Progressive weight loss journey from 10 lbs to sustainable maintenance',
      chain_order: 1,
      source_journey_template_id: 'lose_20_lbs',
      target_journey_template_id: 'lose_50_lbs',
      unlock_criteria: { completion_percentage: 100, min_milestones: 3 },
      bonus_xp: 300,
      bonus_credits: 75,
      icon: '🏋️',
      color: '#4CAF50',
    },
    {
      chain_name: 'weight_loss_progression',
      chain_description: 'Progressive weight loss journey from 10 lbs to sustainable maintenance',
      chain_order: 2,
      source_journey_template_id: 'lose_50_lbs',
      target_journey_template_id: 'maintain_weight_journey',
      unlock_criteria: { completion_percentage: 100, min_days_active: 180 },
      bonus_xp: 500,
      bonus_credits: 150,
      unlock_achievement_key: 'chain_complete',
      icon: '🏋️',
      color: '#4CAF50',
    },
    // Muscle Building Chain (4 steps)
    {
      chain_name: 'muscle_building_progression',
      chain_description: 'Progressive muscle gain from beginner to elite level',
      chain_order: 0,
      source_journey_template_id: 'gain_5_lbs_muscle',
      target_journey_template_id: 'gain_10_lbs_muscle',
      unlock_criteria: { completion_percentage: 100, min_days_active: 60 },
      bonus_xp: 200,
      bonus_credits: 50,
      icon: '💪',
      color: '#FF5722',
      is_featured: true,
    },
    {
      chain_name: 'muscle_building_progression',
      chain_description: 'Progressive muscle gain from beginner to elite level',
      chain_order: 1,
      source_journey_template_id: 'gain_10_lbs_muscle',
      target_journey_template_id: 'gain_15_lbs_muscle',
      unlock_criteria: { completion_percentage: 100, min_days_active: 120 },
      bonus_xp: 300,
      bonus_credits: 75,
      icon: '💪',
      color: '#FF5722',
    },
    {
      chain_name: 'muscle_building_progression',
      chain_description: 'Progressive muscle gain from beginner to elite level',
      chain_order: 2,
      source_journey_template_id: 'gain_15_lbs_muscle',
      target_journey_template_id: 'gain_30_lbs_muscle',
      unlock_criteria: { completion_percentage: 100, min_days_active: 180 },
      bonus_xp: 400,
      bonus_credits: 100,
      icon: '💪',
      color: '#FF5722',
    },
    {
      chain_name: 'muscle_building_progression',
      chain_description: 'Progressive muscle gain from beginner to elite level',
      chain_order: 3,
      source_journey_template_id: 'gain_30_lbs_muscle',
      target_journey_template_id: 'maintain_muscle',
      unlock_criteria: { completion_percentage: 100, min_days_active: 270 },
      bonus_xp: 600,
      bonus_credits: 175,
      unlock_achievement_key: 'chain_complete',
      icon: '💪',
      color: '#FF5722',
    },
    // Strength Chain (3 steps)
    {
      chain_name: 'strength_progression',
      chain_description: 'Build strength from beginner to elite level',
      chain_order: 0,
      source_journey_template_id: 'beginner_strength',
      target_journey_template_id: 'intermediate_strength',
      unlock_criteria: { completion_percentage: 100, min_milestones: 3 },
      bonus_xp: 200,
      bonus_credits: 50,
      icon: '🔱',
      color: '#9C27B0',
      is_featured: true,
    },
    {
      chain_name: 'strength_progression',
      chain_description: 'Build strength from beginner to elite level',
      chain_order: 1,
      source_journey_template_id: 'intermediate_strength',
      target_journey_template_id: 'advanced_strength',
      unlock_criteria: { completion_percentage: 100, min_days_active: 90 },
      bonus_xp: 350,
      bonus_credits: 85,
      icon: '🔱',
      color: '#9C27B0',
    },
    {
      chain_name: 'strength_progression',
      chain_description: 'Build strength from beginner to elite level',
      chain_order: 2,
      source_journey_template_id: 'advanced_strength',
      target_journey_template_id: 'elite_strength',
      unlock_criteria: { completion_percentage: 100, min_days_active: 180 },
      bonus_xp: 600,
      bonus_credits: 175,
      unlock_achievement_key: 'chain_complete',
      icon: '🔱',
      color: '#9C27B0',
    },
    // Running Chain (3 steps)
    {
      chain_name: 'running_progression',
      chain_description: 'From couch to marathon - the ultimate running journey',
      chain_order: 0,
      source_journey_template_id: 'couch_to_5k',
      target_journey_template_id: 'run_10k',
      unlock_criteria: { completion_percentage: 100, min_milestones: 4 },
      bonus_xp: 250,
      bonus_credits: 60,
      icon: '🏃',
      color: '#2196F3',
      is_featured: true,
    },
    {
      chain_name: 'running_progression',
      chain_description: 'From couch to marathon - the ultimate running journey',
      chain_order: 1,
      source_journey_template_id: 'run_10k',
      target_journey_template_id: 'run_half_marathon',
      unlock_criteria: { completion_percentage: 100, min_days_active: 60 },
      bonus_xp: 400,
      bonus_credits: 100,
      icon: '🏃',
      color: '#2196F3',
    },
    {
      chain_name: 'running_progression',
      chain_description: 'From couch to marathon - the ultimate running journey',
      chain_order: 2,
      source_journey_template_id: 'run_half_marathon',
      target_journey_template_id: 'run_marathon',
      unlock_criteria: { completion_percentage: 100, min_days_active: 90 },
      bonus_xp: 750,
      bonus_credits: 200,
      unlock_achievement_key: 'chain_complete',
      icon: '🏃',
      color: '#2196F3',
    },
    // Pull-up Chain (3 steps)
    {
      chain_name: 'pullup_progression',
      chain_description: 'Master the pull-up from zero to weighted',
      chain_order: 0,
      source_journey_template_id: 'first_pullup',
      target_journey_template_id: 'pullups_10',
      unlock_criteria: { completion_percentage: 100, min_milestones: 3 },
      bonus_xp: 200,
      bonus_credits: 50,
      icon: '🎯',
      color: '#E91E63',
      is_featured: true,
    },
    {
      chain_name: 'pullup_progression',
      chain_description: 'Master the pull-up from zero to weighted',
      chain_order: 1,
      source_journey_template_id: 'pullups_10',
      target_journey_template_id: 'pullups_20',
      unlock_criteria: { completion_percentage: 100, min_days_active: 60 },
      bonus_xp: 350,
      bonus_credits: 85,
      icon: '🎯',
      color: '#E91E63',
    },
    {
      chain_name: 'pullup_progression',
      chain_description: 'Master the pull-up from zero to weighted',
      chain_order: 2,
      source_journey_template_id: 'pullups_20',
      target_journey_template_id: 'weighted_pullups',
      unlock_criteria: { completion_percentage: 100, min_days_active: 90 },
      bonus_xp: 500,
      bonus_credits: 150,
      unlock_achievement_key: 'chain_complete',
      icon: '🎯',
      color: '#E91E63',
    },
    // Push-up Chain (3 steps)
    {
      chain_name: 'pushup_progression',
      chain_description: 'Master the push-up from first rep to 100',
      chain_order: 0,
      source_journey_template_id: 'first_pushup',
      target_journey_template_id: 'pushups_25',
      unlock_criteria: { completion_percentage: 100, min_milestones: 3 },
      bonus_xp: 150,
      bonus_credits: 40,
      icon: '✊',
      color: '#FF9800',
      is_featured: true,
    },
    {
      chain_name: 'pushup_progression',
      chain_description: 'Master the push-up from first rep to 100',
      chain_order: 1,
      source_journey_template_id: 'pushups_25',
      target_journey_template_id: 'pushups_50',
      unlock_criteria: { completion_percentage: 100, min_days_active: 45 },
      bonus_xp: 250,
      bonus_credits: 60,
      icon: '✊',
      color: '#FF9800',
    },
    {
      chain_name: 'pushup_progression',
      chain_description: 'Master the push-up from first rep to 100',
      chain_order: 2,
      source_journey_template_id: 'pushups_50',
      target_journey_template_id: 'pushups_100',
      unlock_criteria: { completion_percentage: 100, min_days_active: 60 },
      bonus_xp: 500,
      bonus_credits: 125,
      unlock_achievement_key: 'chain_complete',
      icon: '✊',
      color: '#FF9800',
    },
    // Flexibility Chain (3 steps)
    {
      chain_name: 'flexibility_progression',
      chain_description: 'Develop full-body flexibility from basics to advanced',
      chain_order: 0,
      source_journey_template_id: 'touch_toes',
      target_journey_template_id: 'front_splits',
      unlock_criteria: { completion_percentage: 100, min_days_active: 30 },
      bonus_xp: 200,
      bonus_credits: 50,
      icon: '🧘',
      color: '#00BCD4',
      is_featured: true,
    },
    {
      chain_name: 'flexibility_progression',
      chain_description: 'Develop full-body flexibility from basics to advanced',
      chain_order: 1,
      source_journey_template_id: 'front_splits',
      target_journey_template_id: 'middle_splits',
      unlock_criteria: { completion_percentage: 100, min_days_active: 120 },
      bonus_xp: 400,
      bonus_credits: 100,
      icon: '🧘',
      color: '#00BCD4',
    },
    {
      chain_name: 'flexibility_progression',
      chain_description: 'Develop full-body flexibility from basics to advanced',
      chain_order: 2,
      source_journey_template_id: 'middle_splits',
      target_journey_template_id: 'full_mobility_mastery',
      unlock_criteria: { completion_percentage: 100, min_days_active: 180 },
      bonus_xp: 600,
      bonus_credits: 175,
      unlock_achievement_key: 'chain_complete',
      icon: '🧘',
      color: '#00BCD4',
    },
    // Plank Chain (1 step)
    {
      chain_name: 'plank_progression',
      chain_description: 'Build core endurance from 60 seconds to 5 minutes',
      chain_order: 0,
      source_journey_template_id: 'plank_60s',
      target_journey_template_id: 'plank_5min',
      unlock_criteria: { completion_percentage: 100, min_days_active: 30 },
      bonus_xp: 350,
      bonus_credits: 85,
      unlock_achievement_key: 'chain_complete',
      icon: '🪑',
      color: '#795548',
    },
    // Rehab to Fitness Chain (2 steps)
    {
      chain_name: 'rehab_to_fitness',
      chain_description: 'Transition from sedentary to full fitness',
      chain_order: 0,
      source_journey_template_id: 'from_couch',
      target_journey_template_id: 'beginner_strength',
      unlock_criteria: { completion_percentage: 100, min_days_active: 45 },
      bonus_xp: 300,
      bonus_credits: 75,
      icon: '🌱',
      color: '#8BC34A',
    },
    {
      chain_name: 'rehab_to_fitness',
      chain_description: 'Transition from sedentary to full fitness',
      chain_order: 1,
      source_journey_template_id: 'beginner_strength',
      target_journey_template_id: 'couch_to_5k',
      unlock_criteria: { completion_percentage: 100, min_days_active: 60 },
      bonus_xp: 400,
      bonus_credits: 100,
      unlock_achievement_key: 'chain_complete',
      icon: '🌱',
      color: '#8BC34A',
    },
  ];

  for (const chain of progressionChains) {
    await db.query(
      `INSERT INTO journey_progression_chains (
        chain_name, chain_description, chain_order,
        source_journey_template_id, target_journey_template_id,
        unlock_criteria, bonus_xp, bonus_credits, unlock_achievement_key,
        icon, color, is_featured
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT DO NOTHING`,
      [
        chain.chain_name,
        chain.chain_description,
        chain.chain_order,
        chain.source_journey_template_id,
        chain.target_journey_template_id,
        JSON.stringify(chain.unlock_criteria),
        chain.bonus_xp,
        chain.bonus_credits ?? 0,
        chain.unlock_achievement_key ?? null,
        chain.icon ?? null,
        chain.color ?? null,
        chain.is_featured ?? false,
      ]
    );
  }

  log.info(`Seeded ${progressionChains.length} journey progression chains`);

  log.info('Migration 133_journey_progression_chains completed successfully');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 133_journey_progression_chains');

  // Remove achievements
  await db.query(
    `DELETE FROM achievement_definitions WHERE key IN (
      'chain_step_complete', 'chain_complete', 'chains_complete_3', 'multi_year_journey'
    )`
  );

  // Remove columns from user_journeys
  const hasChainColumn = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = 'user_journeys' AND column_name = 'chain_name'`
  );

  if (parseInt(hasChainColumn?.count || '0') > 0) {
    await db.query(`DROP INDEX IF EXISTS idx_user_journeys_chain`);
    await db.query(`
      ALTER TABLE user_journeys
      DROP COLUMN IF EXISTS next_journey_unlocked,
      DROP COLUMN IF EXISTS previous_journey_id,
      DROP COLUMN IF EXISTS chain_position,
      DROP COLUMN IF EXISTS chain_name
    `);
  }

  // Drop trigger and function
  await db.query(`DROP TRIGGER IF EXISTS tr_progression_chains_updated ON journey_progression_chains`);
  await db.query(`DROP FUNCTION IF EXISTS update_progression_chains_timestamp`);

  // Drop the main table
  await db.query(`DROP TABLE IF EXISTS journey_progression_chains`);

  // Remove the journey templates added by this migration
  // Note: Only remove templates that were added by this migration, not pre-existing ones
  const templatesAddedByThisMigration = [
    'maintain_weight_journey',
    'gain_5_lbs_muscle',
    'gain_15_lbs_muscle',
    'gain_30_lbs_muscle',
    'maintain_muscle',
    'beginner_strength',
    'intermediate_strength',
    'advanced_strength',
    'elite_strength',
    'weighted_pullups',
    'full_mobility_mastery',
  ];

  await db.query(
    `DELETE FROM journey_templates WHERE id = ANY($1)`,
    [templatesAddedByThisMigration]
  );

  log.info('Rollback of 133_journey_progression_chains completed');
}
