// SQL-SAFE: Template literals contain static SQL only, no external input
/**
 * Migration: Onboarding Intents System
 *
 * Phase 5 of Journey Overhaul - adds:
 * - User intent tracking for progressive disclosure onboarding
 * - 5 primary intents: general, goal, competition, milestone, recovery
 * - Onboarding state machine with step tracking
 * - Flow-specific customization storage
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 036_onboarding_intents');

  // ============================================
  // ONBOARDING INTENTS TABLE
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS onboarding_intents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      tagline TEXT, -- Short description for selection screen
      flow_steps JSONB NOT NULL DEFAULT '[]', -- Array of step IDs in order
      estimated_time_minutes INTEGER DEFAULT 3,
      requires_medical_disclaimer BOOLEAN DEFAULT FALSE,
      display_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ============================================
  // ONBOARDING STEPS TABLE
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS onboarding_steps (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      step_type TEXT NOT NULL, -- selection, input, multi_select, confirmation, info
      component_name TEXT NOT NULL, -- React component to render
      is_skippable BOOLEAN DEFAULT FALSE,
      validation_rules JSONB DEFAULT '{}',
      default_values JSONB DEFAULT '{}',
      display_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ============================================
  // USER ONBOARDING STATE TABLE
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_onboarding_state (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

      -- Current intent and progress
      selected_intent TEXT REFERENCES onboarding_intents(id),
      current_step TEXT REFERENCES onboarding_steps(id),
      current_step_index INTEGER DEFAULT 0,

      -- Collected data during onboarding
      collected_data JSONB DEFAULT '{}',

      -- Flow state
      status TEXT DEFAULT 'started', -- started, in_progress, completed, skipped
      started_at TIMESTAMPTZ DEFAULT NOW(),
      last_activity_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,

      -- Outcome tracking
      journey_started_id TEXT, -- If they started a journey
      milestone_started_id TEXT, -- If they started a milestone
      competition_profile_id UUID, -- If they created a competition profile

      -- Resume capability
      can_resume BOOLEAN DEFAULT TRUE,

      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),

      CONSTRAINT unique_user_onboarding UNIQUE (user_id)
    )
  `);

  // ============================================
  // ONBOARDING STEP COMPLETIONS TABLE
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS onboarding_step_completions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      state_id UUID REFERENCES user_onboarding_state(id) ON DELETE CASCADE,
      step_id TEXT NOT NULL REFERENCES onboarding_steps(id),

      -- Step data
      input_data JSONB DEFAULT '{}',
      skipped BOOLEAN DEFAULT FALSE,

      -- Timing
      started_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ DEFAULT NOW(),
      duration_seconds INTEGER,

      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ============================================
  // INDEXES
  // ============================================

  await db.query(`CREATE INDEX IF NOT EXISTS idx_user_onboarding_state_user ON user_onboarding_state(user_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_user_onboarding_state_status ON user_onboarding_state(status)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_onboarding_step_completions_user ON onboarding_step_completions(user_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_onboarding_step_completions_state ON onboarding_step_completions(state_id)`);

  // ============================================
  // ADD INTENT COLUMNS TO USER PROFILE
  // ============================================

  // Add intent column to user_profile_extended if not exists
  const intentCol = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = 'user_profile_extended' AND column_name = 'primary_intent'`
  );

  if (parseInt(intentCol?.count || '0') === 0) {
    await db.query(`ALTER TABLE user_profile_extended ADD COLUMN primary_intent TEXT`);
    await db.query(`ALTER TABLE user_profile_extended ADD COLUMN onboarding_version INTEGER DEFAULT 2`);
  }

  // ============================================
  // SEED ONBOARDING STEPS
  // ============================================

  log.info('Seeding onboarding steps...');

  const steps = [
    // Universal steps
    { id: 'intent_selection', name: 'Choose Your Path', step_type: 'selection', component_name: 'IntentSelection', is_skippable: false },
    { id: 'units_preference', name: 'Measurement Units', step_type: 'selection', component_name: 'UnitsPreference', is_skippable: false },
    { id: 'physical_profile', name: 'Physical Profile', step_type: 'input', component_name: 'PhysicalProfile', is_skippable: true },
    { id: 'equipment_selection', name: 'Your Equipment', step_type: 'multi_select', component_name: 'EquipmentSelection', is_skippable: true },
    { id: 'time_availability', name: 'Training Time', step_type: 'selection', component_name: 'TimeAvailability', is_skippable: true },

    // Identity selection (for general/goal flows)
    { id: 'identity_selection', name: 'Who You Want to Become', step_type: 'selection', component_name: 'IdentitySelection', is_skippable: true },

    // Journey selection (for goal flow)
    { id: 'journey_category', name: 'Journey Category', step_type: 'selection', component_name: 'JourneyCategorySelection', is_skippable: false },
    { id: 'journey_template', name: 'Choose Your Journey', step_type: 'selection', component_name: 'JourneyTemplateSelection', is_skippable: false },
    { id: 'journey_customize', name: 'Customize Journey', step_type: 'input', component_name: 'JourneyCustomization', is_skippable: true },

    // Competition flow steps
    { id: 'competition_sport', name: 'Competition Sport', step_type: 'selection', component_name: 'CompetitionSportSelection', is_skippable: false },
    { id: 'competition_division', name: 'Your Division', step_type: 'selection', component_name: 'CompetitionDivisionSelection', is_skippable: false },
    { id: 'show_details', name: 'Show Details', step_type: 'input', component_name: 'ShowDetailsInput', is_skippable: true },
    { id: 'weak_points', name: 'Weak Points Assessment', step_type: 'multi_select', component_name: 'WeakPointsSelection', is_skippable: true },

    // Milestone flow steps
    { id: 'milestone_category', name: 'Skill Category', step_type: 'selection', component_name: 'MilestoneCategorySelection', is_skippable: false },
    { id: 'milestone_selection', name: 'Choose Your Skill', step_type: 'selection', component_name: 'MilestoneSelection', is_skippable: false },
    { id: 'current_ability', name: 'Current Ability', step_type: 'selection', component_name: 'CurrentAbilityAssessment', is_skippable: true },

    // Recovery flow steps
    { id: 'injury_region', name: 'Affected Area', step_type: 'selection', component_name: 'InjuryRegionSelection', is_skippable: false },
    { id: 'injury_type', name: 'Condition Type', step_type: 'selection', component_name: 'InjuryTypeSelection', is_skippable: true },
    { id: 'medical_disclaimer', name: 'Medical Disclaimer', step_type: 'confirmation', component_name: 'MedicalDisclaimer', is_skippable: false },
    { id: 'recovery_timeline', name: 'Recovery Timeline', step_type: 'selection', component_name: 'RecoveryTimeline', is_skippable: true },

    // Completion step
    { id: 'onboarding_complete', name: 'All Set!', step_type: 'info', component_name: 'OnboardingComplete', is_skippable: false },
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    await db.query(
      `INSERT INTO onboarding_steps (id, name, step_type, component_name, is_skippable, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [step.id, step.name, step.step_type, step.component_name, step.is_skippable, i + 1]
    );
  }

  log.info(`Seeded ${steps.length} onboarding steps`);

  // ============================================
  // SEED ONBOARDING INTENTS
  // ============================================

  log.info('Seeding onboarding intents...');

  const intents = [
    {
      id: 'general',
      name: 'Just Train Smarter',
      description: 'Get personalized workouts based on your equipment and time. No specific goal needed.',
      icon: 'dumbbell',
      tagline: 'I want to work out regularly',
      flow_steps: ['intent_selection', 'units_preference', 'physical_profile', 'equipment_selection', 'time_availability', 'identity_selection', 'onboarding_complete'],
      estimated_time_minutes: 2,
      requires_medical_disclaimer: false,
    },
    {
      id: 'goal',
      name: 'Achieve a Specific Goal',
      description: 'Work towards weight loss, strength gains, better cardio, or other fitness goals.',
      icon: 'target',
      tagline: 'I have a specific fitness goal',
      flow_steps: ['intent_selection', 'units_preference', 'physical_profile', 'journey_category', 'journey_template', 'journey_customize', 'equipment_selection', 'time_availability', 'onboarding_complete'],
      estimated_time_minutes: 3,
      requires_medical_disclaimer: false,
    },
    {
      id: 'competition',
      name: 'Train for Competition',
      description: 'Prepare for bodybuilding, powerlifting, CrossFit, or other competitions.',
      icon: 'trophy',
      tagline: 'I\'m competing in a sport',
      flow_steps: ['intent_selection', 'units_preference', 'physical_profile', 'competition_sport', 'competition_division', 'show_details', 'weak_points', 'equipment_selection', 'time_availability', 'onboarding_complete'],
      estimated_time_minutes: 4,
      requires_medical_disclaimer: false,
    },
    {
      id: 'milestone',
      name: 'Master a Skill',
      description: 'Unlock elite bodyweight skills like muscle-ups, handstands, or the human flag.',
      icon: 'flame',
      tagline: 'I want to achieve a specific skill',
      flow_steps: ['intent_selection', 'units_preference', 'physical_profile', 'milestone_category', 'milestone_selection', 'current_ability', 'equipment_selection', 'time_availability', 'onboarding_complete'],
      estimated_time_minutes: 3,
      requires_medical_disclaimer: false,
    },
    {
      id: 'recovery',
      name: 'Recover from Injury',
      description: 'Get safe, modified workouts while recovering from injury or managing a condition.',
      icon: 'heart',
      tagline: 'I\'m recovering from an injury',
      flow_steps: ['intent_selection', 'units_preference', 'injury_region', 'injury_type', 'medical_disclaimer', 'recovery_timeline', 'physical_profile', 'equipment_selection', 'onboarding_complete'],
      estimated_time_minutes: 4,
      requires_medical_disclaimer: true,
    },
  ];

  for (let i = 0; i < intents.length; i++) {
    const intent = intents[i];
    await db.query(
      `INSERT INTO onboarding_intents (id, name, description, icon, tagline, flow_steps, estimated_time_minutes, requires_medical_disclaimer, display_order)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [
        intent.id,
        intent.name,
        intent.description,
        intent.icon,
        intent.tagline,
        JSON.stringify(intent.flow_steps),
        intent.estimated_time_minutes,
        intent.requires_medical_disclaimer,
        i + 1,
      ]
    );
  }

  log.info(`Seeded ${intents.length} onboarding intents`);

  // ============================================
  // SEED INJURY REGIONS FOR RECOVERY FLOW
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS injury_regions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      body_area TEXT NOT NULL, -- upper, lower, core, full_body
      icon TEXT,
      common_conditions TEXT[], -- Common conditions for this region
      display_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE
    )
  `);

  const injuryRegions = [
    { id: 'shoulder', name: 'Shoulder', body_area: 'upper', common_conditions: ['rotator_cuff', 'impingement', 'frozen_shoulder', 'labrum_tear'] },
    { id: 'elbow', name: 'Elbow', body_area: 'upper', common_conditions: ['tennis_elbow', 'golfers_elbow', 'tendinitis'] },
    { id: 'wrist_hand', name: 'Wrist & Hand', body_area: 'upper', common_conditions: ['carpal_tunnel', 'sprain', 'tendinitis'] },
    { id: 'neck', name: 'Neck', body_area: 'upper', common_conditions: ['strain', 'herniated_disc', 'whiplash'] },
    { id: 'upper_back', name: 'Upper Back', body_area: 'core', common_conditions: ['strain', 'postural_issues', 'thoracic_outlet'] },
    { id: 'lower_back', name: 'Lower Back', body_area: 'core', common_conditions: ['herniated_disc', 'sciatica', 'strain', 'stenosis'] },
    { id: 'hip', name: 'Hip', body_area: 'lower', common_conditions: ['labrum_tear', 'bursitis', 'impingement', 'arthritis'] },
    { id: 'knee', name: 'Knee', body_area: 'lower', common_conditions: ['acl', 'mcl', 'meniscus', 'patella', 'arthritis'] },
    { id: 'ankle_foot', name: 'Ankle & Foot', body_area: 'lower', common_conditions: ['sprain', 'plantar_fasciitis', 'achilles', 'fracture'] },
    { id: 'general_deconditioning', name: 'General Deconditioning', body_area: 'full_body', common_conditions: ['post_surgery', 'illness_recovery', 'sedentary_lifestyle'] },
  ];

  for (let i = 0; i < injuryRegions.length; i++) {
    const region = injuryRegions[i];
    await db.query(
      `INSERT INTO injury_regions (id, name, body_area, common_conditions, display_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [region.id, region.name, region.body_area, region.common_conditions, i + 1]
    );
  }

  log.info(`Seeded ${injuryRegions.length} injury regions`);

  log.info('Migration 036_onboarding_intents complete');
}
