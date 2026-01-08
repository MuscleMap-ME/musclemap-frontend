/**
 * Migration: Future Module Preparation
 *
 * Phase 6 of Journey Overhaul - adds:
 * - Navigation modules system for dynamic feature toggling
 * - Placeholder schemas for Nutrition & Supplementation
 * - Module waitlist for user interest tracking
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 037_future_modules');

  // ============================================
  // NAVIGATION MODULES TABLE
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS navigation_modules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      route TEXT, -- App route path

      -- Status
      status TEXT DEFAULT 'coming_soon', -- active, coming_soon, beta, deprecated
      release_phase INTEGER DEFAULT 1, -- Priority order for release

      -- Display
      display_order INTEGER DEFAULT 0,
      show_in_nav BOOLEAN DEFAULT TRUE,
      show_badge BOOLEAN DEFAULT FALSE,
      badge_text TEXT, -- e.g., "NEW", "BETA"

      -- Coming soon details
      coming_soon_message TEXT,
      expected_release TEXT, -- e.g., "Q2 2026"
      preview_image_url TEXT,

      -- Feature flags
      is_premium BOOLEAN DEFAULT FALSE,
      minimum_level INTEGER DEFAULT 1, -- User level required

      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ============================================
  // MODULE WAITLIST TABLE
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS module_waitlist (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      module_id TEXT NOT NULL REFERENCES navigation_modules(id) ON DELETE CASCADE,

      -- User interest
      interest_level INTEGER DEFAULT 5, -- 1-10 scale
      use_case TEXT, -- Why they want this feature

      -- Notification preferences
      notify_on_release BOOLEAN DEFAULT TRUE,
      notify_on_beta BOOLEAN DEFAULT TRUE,

      created_at TIMESTAMPTZ DEFAULT NOW(),

      CONSTRAINT unique_user_module_waitlist UNIQUE (user_id, module_id)
    )
  `);

  // ============================================
  // NUTRITION PLANS TABLE (Placeholder)
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS nutrition_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

      -- Plan basics
      name TEXT NOT NULL,
      description TEXT,
      plan_type TEXT DEFAULT 'custom', -- custom, cutting, bulking, maintenance, recomp

      -- Targets
      target_calories INTEGER,
      target_protein_g INTEGER,
      target_carbs_g INTEGER,
      target_fat_g INTEGER,
      target_fiber_g INTEGER,

      -- Timing
      meals_per_day INTEGER DEFAULT 4,
      eating_window_start TIME,
      eating_window_end TIME,

      -- Status
      is_active BOOLEAN DEFAULT TRUE,
      start_date DATE,
      end_date DATE,

      -- Integration
      linked_journey_id TEXT, -- Can be linked to a journey
      linked_competition_profile_id UUID, -- Can be linked to competition prep

      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ============================================
  // FOOD LOGS TABLE (Placeholder)
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS food_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nutrition_plan_id UUID REFERENCES nutrition_plans(id) ON DELETE SET NULL,

      -- Entry details
      logged_at TIMESTAMPTZ DEFAULT NOW(),
      meal_type TEXT, -- breakfast, lunch, dinner, snack, pre_workout, post_workout

      -- Food info
      food_name TEXT NOT NULL,
      brand TEXT,
      serving_size NUMERIC,
      serving_unit TEXT,
      servings NUMERIC DEFAULT 1,

      -- Macros
      calories INTEGER,
      protein_g NUMERIC,
      carbs_g NUMERIC,
      fat_g NUMERIC,
      fiber_g NUMERIC,
      sugar_g NUMERIC,
      sodium_mg NUMERIC,

      -- Source
      source TEXT DEFAULT 'manual', -- manual, barcode_scan, api_lookup, ai_photo
      external_food_id TEXT, -- ID from external API if applicable

      -- Photo
      photo_url TEXT,

      notes TEXT,

      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ============================================
  // SUPPLEMENT STACKS TABLE (Placeholder)
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS supplement_stacks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

      -- Stack info
      name TEXT NOT NULL,
      description TEXT,
      stack_type TEXT DEFAULT 'custom', -- custom, pre_workout, post_workout, daily, competition_prep

      -- Status
      is_active BOOLEAN DEFAULT TRUE,
      start_date DATE,
      end_date DATE,

      -- Timing
      default_time TIME,

      -- Cost tracking
      monthly_cost_cents INTEGER,

      -- Integration
      linked_journey_id TEXT,
      linked_competition_profile_id UUID,

      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ============================================
  // SUPPLEMENT ITEMS TABLE (Placeholder)
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS supplement_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      stack_id UUID NOT NULL REFERENCES supplement_stacks(id) ON DELETE CASCADE,

      -- Product info
      name TEXT NOT NULL,
      brand TEXT,
      category TEXT, -- protein, creatine, pre_workout, vitamin, mineral, amino_acid, fat_burner, other

      -- Dosage
      dosage_amount NUMERIC,
      dosage_unit TEXT, -- mg, g, ml, iu, capsules, scoops
      frequency TEXT DEFAULT 'daily', -- daily, twice_daily, pre_workout, post_workout, as_needed

      -- Timing
      take_with_food BOOLEAN DEFAULT FALSE,
      take_time TEXT, -- morning, evening, pre_workout, post_workout, with_meals

      -- Status
      is_active BOOLEAN DEFAULT TRUE,

      -- Cost
      price_cents INTEGER,
      servings_per_container INTEGER,

      -- Research
      research_rating TEXT, -- strong, moderate, weak, inconclusive
      notes TEXT,

      display_order INTEGER DEFAULT 0,

      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ============================================
  // SUPPLEMENT LOGS TABLE (Placeholder)
  // ============================================

  await db.query(`
    CREATE TABLE IF NOT EXISTS supplement_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stack_id UUID REFERENCES supplement_stacks(id) ON DELETE SET NULL,
      item_id UUID REFERENCES supplement_items(id) ON DELETE SET NULL,

      -- Log entry
      logged_at TIMESTAMPTZ DEFAULT NOW(),
      taken BOOLEAN DEFAULT TRUE, -- FALSE = marked as skipped

      -- Custom entry (if not from stack)
      supplement_name TEXT,
      dosage_amount NUMERIC,
      dosage_unit TEXT,

      notes TEXT,

      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ============================================
  // INDEXES
  // ============================================

  await db.query(`CREATE INDEX IF NOT EXISTS idx_module_waitlist_user ON module_waitlist(user_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_module_waitlist_module ON module_waitlist(module_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_nutrition_plans_user ON nutrition_plans(user_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_food_logs_user ON food_logs(user_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_food_logs_date ON food_logs(logged_at)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_supplement_stacks_user ON supplement_stacks(user_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_supplement_logs_user ON supplement_logs(user_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_supplement_logs_date ON supplement_logs(logged_at)`);

  // ============================================
  // SEED NAVIGATION MODULES
  // ============================================

  log.info('Seeding navigation modules...');

  const modules = [
    {
      id: 'training',
      name: 'Training',
      description: 'Workout prescriptions, exercise library, and progress tracking',
      icon: 'dumbbell',
      route: '/training',
      status: 'active',
      release_phase: 1,
      display_order: 1,
      show_in_nav: true,
      is_premium: false,
    },
    {
      id: 'journeys',
      name: 'Journeys',
      description: 'Goal-oriented fitness programs with structured progression',
      icon: 'map',
      route: '/journeys',
      status: 'active',
      release_phase: 1,
      display_order: 2,
      show_in_nav: true,
      is_premium: false,
    },
    {
      id: 'milestones',
      name: 'Milestones',
      description: 'Track elite bodyweight skills and movement achievements',
      icon: 'trophy',
      route: '/milestones',
      status: 'active',
      release_phase: 1,
      display_order: 3,
      show_in_nav: true,
      is_premium: false,
    },
    {
      id: 'competition',
      name: 'Competition',
      description: 'Competition prep tracking for bodybuilding, powerlifting, and more',
      icon: 'medal',
      route: '/competition',
      status: 'active',
      release_phase: 1,
      display_order: 4,
      show_in_nav: true,
      is_premium: false,
    },
    {
      id: 'nutrition',
      name: 'Nutrition',
      description: 'Meal planning, calorie tracking, and macro optimization',
      icon: 'utensils',
      route: '/nutrition',
      status: 'coming_soon',
      release_phase: 2,
      display_order: 5,
      show_in_nav: true,
      coming_soon_message: 'Track your meals, plan your macros, and optimize your nutrition for your goals. Coming soon!',
      expected_release: 'Q2 2026',
      is_premium: false,
    },
    {
      id: 'supplements',
      name: 'Supplements',
      description: 'Stack builder, timing reminders, and effectiveness tracking',
      icon: 'pill',
      route: '/supplements',
      status: 'coming_soon',
      release_phase: 2,
      display_order: 6,
      show_in_nav: true,
      coming_soon_message: 'Build supplement stacks, track your intake, and see what actually works. Coming soon!',
      expected_release: 'Q2 2026',
      is_premium: false,
    },
    {
      id: 'recovery',
      name: 'Recovery',
      description: 'Sleep tracking, HRV monitoring, and recovery optimization',
      icon: 'bed',
      route: '/recovery',
      status: 'coming_soon',
      release_phase: 3,
      display_order: 7,
      show_in_nav: true,
      coming_soon_message: 'Track your sleep, monitor recovery metrics, and optimize your rest days. Coming soon!',
      expected_release: 'Q3 2026',
      is_premium: true,
    },
    {
      id: 'social',
      name: 'Social',
      description: 'Community features, challenges, and workout sharing',
      icon: 'users',
      route: '/social',
      status: 'coming_soon',
      release_phase: 3,
      display_order: 8,
      show_in_nav: true,
      coming_soon_message: 'Connect with other athletes, join challenges, and share your progress. Coming soon!',
      expected_release: 'Q3 2026',
      is_premium: false,
    },
    {
      id: 'coaching',
      name: 'Coaching',
      description: 'AI-powered coaching with personalized feedback and form analysis',
      icon: 'graduation-cap',
      route: '/coaching',
      status: 'coming_soon',
      release_phase: 4,
      display_order: 9,
      show_in_nav: false, // Hidden until closer to release
      coming_soon_message: 'Get personalized coaching powered by AI, including form analysis and real-time feedback.',
      expected_release: 'Q4 2026',
      is_premium: true,
    },
  ];

  for (const mod of modules) {
    await db.query(
      `INSERT INTO navigation_modules (
        id, name, description, icon, route, status, release_phase,
        display_order, show_in_nav, coming_soon_message, expected_release, is_premium
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO NOTHING`,
      [
        mod.id,
        mod.name,
        mod.description,
        mod.icon,
        mod.route,
        mod.status,
        mod.release_phase,
        mod.display_order,
        mod.show_in_nav,
        mod.coming_soon_message || null,
        mod.expected_release || null,
        mod.is_premium,
      ]
    );
  }

  log.info(`Seeded ${modules.length} navigation modules`);

  log.info('Migration 037_future_modules complete');
}
