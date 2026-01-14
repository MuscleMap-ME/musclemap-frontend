/**
 * Migration: Nutrition System
 *
 * Comprehensive nutrition tracking system for MuscleMap including:
 * - User nutrition preferences (binary enable/disable)
 * - Nutrition goals with adaptive calculations
 * - Food database with multi-source caching
 * - Meal logging with workout integration
 * - Recipes and meal planning
 * - Community nutrition features
 * - Nutrition streaks and achievements
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

// ============================================
// HELPER FUNCTIONS
// ============================================

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
     WHERE table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function indexExists(indexName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_indexes
     WHERE indexname = $1`,
    [indexName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function functionExists(functionName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_proc
     WHERE proname = $1`,
    [functionName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function triggerExists(triggerName: string, tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_trigger t
     JOIN pg_class c ON t.tgrelid = c.oid
     WHERE t.tgname = $1 AND c.relname = $2`,
    [triggerName, tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

// ============================================
// MAIN MIGRATION FUNCTION
// ============================================

export async function up(): Promise<void> {
  log.info('Running migration: 069_nutrition_system');

  // ============================================
  // SECTION 1: User Nutrition Preferences
  // ============================================

  if (!(await tableExists('user_nutrition_preferences'))) {
    log.info('Creating user_nutrition_preferences table...');
    await db.query(`
      CREATE TABLE user_nutrition_preferences (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Master toggle
        enabled BOOLEAN NOT NULL DEFAULT false,
        enabled_at TIMESTAMPTZ,
        disabled_at TIMESTAMPTZ,

        -- Display preferences
        tracking_mode TEXT DEFAULT 'macros' CHECK (tracking_mode IN ('calories', 'macros', 'detailed')),
        show_on_dashboard BOOLEAN DEFAULT true,
        show_in_community BOOLEAN DEFAULT true,
        share_with_crew BOOLEAN DEFAULT false,

        -- Goal settings
        goal_type TEXT DEFAULT 'maintain' CHECK (goal_type IN ('lose', 'maintain', 'gain', 'custom')),
        custom_calories INTEGER,
        custom_protein_g INTEGER,
        custom_carbs_g INTEGER,
        custom_fat_g INTEGER,

        -- Integration settings
        sync_with_archetype BOOLEAN DEFAULT true,
        sync_with_workouts BOOLEAN DEFAULT true,
        sync_with_recovery BOOLEAN DEFAULT true,

        -- Data retention preference
        data_retention TEXT DEFAULT 'keep' CHECK (data_retention IN ('keep', 'delete')),

        -- Dietary restrictions
        dietary_restrictions TEXT[] DEFAULT '{}',
        allergens TEXT[] DEFAULT '{}',
        excluded_ingredients TEXT[] DEFAULT '{}',

        -- Water tracking
        water_tracking_enabled BOOLEAN DEFAULT false,
        daily_water_goal_ml INTEGER DEFAULT 2500,

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        UNIQUE(user_id)
      )
    `);

    await db.query('CREATE INDEX idx_nutrition_prefs_user ON user_nutrition_preferences(user_id)');
    await db.query('CREATE INDEX idx_nutrition_prefs_enabled ON user_nutrition_preferences(enabled) WHERE enabled = true');
  }

  // ============================================
  // SECTION 2: Nutrition Goals
  // ============================================

  if (!(await tableExists('nutrition_goals'))) {
    log.info('Creating nutrition_goals table...');
    await db.query(`
      CREATE TABLE nutrition_goals (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Base goals
        calories INTEGER NOT NULL,
        protein_g INTEGER NOT NULL,
        carbs_g INTEGER NOT NULL,
        fat_g INTEGER NOT NULL,
        fiber_g INTEGER DEFAULT 25,

        -- Workout day adjustments
        workout_day_calories INTEGER NOT NULL,
        workout_day_protein_g INTEGER NOT NULL,
        workout_day_carbs_g INTEGER NOT NULL,

        -- Calculation inputs
        tdee INTEGER NOT NULL,
        bmr INTEGER NOT NULL,
        activity_multiplier DECIMAL(4,2) NOT NULL,
        goal_adjustment INTEGER NOT NULL DEFAULT 0,

        -- User metrics at calculation time
        weight_kg DECIMAL(5,2),
        height_cm DECIMAL(5,2),
        age INTEGER,
        sex TEXT,
        activity_level TEXT,

        -- Archetype modifier
        archetype TEXT,
        archetype_modifier JSONB,

        -- Validity
        calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        valid_until TIMESTAMPTZ NOT NULL,
        confidence_score DECIMAL(3,2) DEFAULT 0.80,

        UNIQUE(user_id)
      )
    `);

    await db.query('CREATE INDEX idx_nutrition_goals_user ON nutrition_goals(user_id)');
  }

  // ============================================
  // SECTION 3: Foods Database Cache
  // ============================================

  if (!(await tableExists('foods'))) {
    log.info('Creating foods table...');
    await db.query(`
      CREATE TABLE foods (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

        -- External references
        source TEXT NOT NULL CHECK (source IN ('usda', 'openfoodfacts', 'fatsecret', 'custom', 'user')),
        external_id TEXT,
        barcode TEXT,

        -- Basic info
        name TEXT NOT NULL,
        brand TEXT,
        description TEXT,
        category TEXT,

        -- Serving info
        serving_size_g DECIMAL(10,2),
        serving_unit TEXT,
        serving_description TEXT DEFAULT '1 serving',

        -- Macros (per serving)
        calories INTEGER NOT NULL,
        protein_g DECIMAL(10,2) DEFAULT 0,
        carbs_g DECIMAL(10,2) DEFAULT 0,
        fat_g DECIMAL(10,2) DEFAULT 0,
        fiber_g DECIMAL(10,2) DEFAULT 0,
        sugar_g DECIMAL(10,2) DEFAULT 0,
        saturated_fat_g DECIMAL(10,2) DEFAULT 0,
        sodium_mg DECIMAL(10,2) DEFAULT 0,

        -- Micronutrients (JSON for flexibility)
        micronutrients JSONB DEFAULT '{}',

        -- Amino acids (for muscle recovery)
        amino_acids JSONB DEFAULT '{}',

        -- Meta
        verified BOOLEAN DEFAULT false,
        popularity_score INTEGER DEFAULT 0,
        image_url TEXT,

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        UNIQUE(source, external_id)
      )
    `);

    await db.query('CREATE INDEX idx_foods_barcode ON foods(barcode) WHERE barcode IS NOT NULL');
    await db.query('CREATE INDEX idx_foods_source ON foods(source)');
    await db.query('CREATE INDEX idx_foods_popularity ON foods(popularity_score DESC)');
    await db.query(`
      CREATE INDEX idx_foods_name_search ON foods
      USING GIN(to_tsvector('english', name || ' ' || COALESCE(brand, '')))
    `);
  }

  // ============================================
  // SECTION 4: Custom Foods (User-Created)
  // ============================================

  if (!(await tableExists('custom_foods'))) {
    log.info('Creating custom_foods table...');
    await db.query(`
      CREATE TABLE custom_foods (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        name TEXT NOT NULL,
        brand TEXT,

        -- Serving info
        serving_size_g DECIMAL(10,2) NOT NULL,
        serving_unit TEXT,
        serving_description TEXT,

        -- Macros
        calories INTEGER NOT NULL,
        protein_g DECIMAL(10,2) DEFAULT 0,
        carbs_g DECIMAL(10,2) DEFAULT 0,
        fat_g DECIMAL(10,2) DEFAULT 0,
        fiber_g DECIMAL(10,2) DEFAULT 0,

        -- Visibility
        is_public BOOLEAN DEFAULT false,
        use_count INTEGER DEFAULT 0,

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_custom_foods_user ON custom_foods(user_id)');
    await db.query('CREATE INDEX idx_custom_foods_public ON custom_foods(is_public) WHERE is_public = true');
  }

  // ============================================
  // SECTION 5: Recipes
  // ============================================

  if (!(await tableExists('recipes'))) {
    log.info('Creating recipes table...');
    await db.query(`
      CREATE TABLE recipes (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Basic info
        name TEXT NOT NULL,
        description TEXT,
        slug TEXT,

        -- Servings
        servings INTEGER NOT NULL DEFAULT 1,

        -- Per-serving macros
        calories_per_serving INTEGER NOT NULL,
        protein_per_serving DECIMAL(10,2) DEFAULT 0,
        carbs_per_serving DECIMAL(10,2) DEFAULT 0,
        fat_per_serving DECIMAL(10,2) DEFAULT 0,
        fiber_per_serving DECIMAL(10,2) DEFAULT 0,

        -- Prep info
        prep_time_min INTEGER,
        cook_time_min INTEGER,
        total_time_min INTEGER GENERATED ALWAYS AS (COALESCE(prep_time_min, 0) + COALESCE(cook_time_min, 0)) STORED,
        difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),

        -- Content
        ingredients JSONB NOT NULL DEFAULT '[]',
        steps JSONB NOT NULL DEFAULT '[]',
        tips TEXT,

        -- Tags
        cuisine TEXT,
        dietary_tags TEXT[] DEFAULT '{}',
        allergens TEXT[] DEFAULT '{}',
        meal_types TEXT[] DEFAULT '{}',

        -- Archetype alignment
        archetype_bonus TEXT,
        muscle_groups TEXT[] DEFAULT '{}',

        -- Media
        photo_url TEXT,
        video_url TEXT,

        -- Community
        is_public BOOLEAN DEFAULT false,
        rating DECIMAL(3,2) DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        save_count INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,

        -- Status
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_recipes_author ON recipes(author_id)');
    await db.query('CREATE INDEX idx_recipes_public ON recipes(is_public, rating DESC) WHERE is_public = true');
    await db.query('CREATE INDEX idx_recipes_dietary ON recipes USING GIN(dietary_tags)');
    await db.query('CREATE INDEX idx_recipes_keyset ON recipes(created_at DESC, id DESC)');
    await db.query(`
      CREATE INDEX idx_recipes_search ON recipes
      USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')))
      WHERE is_public = true
    `);
  }

  // ============================================
  // SECTION 6: Recipe Saves
  // ============================================

  if (!(await tableExists('recipe_saves'))) {
    log.info('Creating recipe_saves table...');
    await db.query(`
      CREATE TABLE recipe_saves (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        notes TEXT,

        PRIMARY KEY(user_id, recipe_id)
      )
    `);

    await db.query('CREATE INDEX idx_recipe_saves_user ON recipe_saves(user_id, saved_at DESC)');
  }

  // ============================================
  // SECTION 7: Recipe Ratings
  // ============================================

  if (!(await tableExists('recipe_ratings'))) {
    log.info('Creating recipe_ratings table...');
    await db.query(`
      CREATE TABLE recipe_ratings (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
        review TEXT,
        helpful_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        PRIMARY KEY(user_id, recipe_id)
      )
    `);
  }

  // ============================================
  // SECTION 8: Meal Logs
  // ============================================

  if (!(await tableExists('meal_logs'))) {
    log.info('Creating meal_logs table...');
    await db.query(`
      CREATE TABLE meal_logs (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Timing
        logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        meal_date DATE NOT NULL,
        meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack')),

        -- Food reference (one of these)
        food_id TEXT REFERENCES foods(id) ON DELETE SET NULL,
        custom_food_id TEXT REFERENCES custom_foods(id) ON DELETE SET NULL,
        recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,

        -- Quick entry (no food reference)
        quick_entry_name TEXT,

        -- Quantity
        servings DECIMAL(5,2) NOT NULL DEFAULT 1,
        grams DECIMAL(10,2),

        -- Calculated totals (denormalized for query performance)
        total_calories INTEGER NOT NULL,
        total_protein_g DECIMAL(10,2) DEFAULT 0,
        total_carbs_g DECIMAL(10,2) DEFAULT 0,
        total_fat_g DECIMAL(10,2) DEFAULT 0,
        total_fiber_g DECIMAL(10,2) DEFAULT 0,

        -- Optional
        notes TEXT,
        photo_url TEXT,

        -- Workout context
        workout_id TEXT,
        is_post_workout BOOLEAN DEFAULT false,

        -- Source tracking
        logged_via TEXT DEFAULT 'manual' CHECK (logged_via IN ('manual', 'barcode', 'photo', 'voice', 'quick', 'meal_plan')),

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_meal_logs_user_date ON meal_logs(user_id, meal_date DESC)');
    await db.query('CREATE INDEX idx_meal_logs_keyset ON meal_logs(user_id, logged_at DESC, id DESC)');
    await db.query('CREATE INDEX idx_meal_logs_food ON meal_logs(food_id) WHERE food_id IS NOT NULL');
  }

  // ============================================
  // SECTION 9: Daily Nutrition Summaries
  // ============================================

  if (!(await tableExists('daily_nutrition_summaries'))) {
    log.info('Creating daily_nutrition_summaries table...');
    await db.query(`
      CREATE TABLE daily_nutrition_summaries (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        summary_date DATE NOT NULL,

        -- Totals
        total_calories INTEGER NOT NULL DEFAULT 0,
        total_protein_g DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_carbs_g DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_fat_g DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_fiber_g DECIMAL(10,2) NOT NULL DEFAULT 0,

        -- Goals for that day
        goal_calories INTEGER,
        goal_protein_g INTEGER,
        goal_carbs_g INTEGER,
        goal_fat_g INTEGER,

        -- Workout context
        was_workout_day BOOLEAN DEFAULT false,
        workout_tu INTEGER DEFAULT 0,
        calories_burned INTEGER DEFAULT 0,

        -- Meal tracking
        meal_count INTEGER NOT NULL DEFAULT 0,
        meals_logged JSONB DEFAULT '{}',

        -- Adherence scores (0-100)
        calorie_adherence INTEGER,
        protein_adherence INTEGER,
        macro_adherence INTEGER,
        overall_score INTEGER,

        -- Water tracking
        water_ml INTEGER DEFAULT 0,
        water_goal_ml INTEGER,

        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        UNIQUE(user_id, summary_date)
      )
    `);

    await db.query('CREATE INDEX idx_daily_summaries_user_date ON daily_nutrition_summaries(user_id, summary_date DESC)');
    await db.query(`
      CREATE INDEX idx_daily_summaries_dashboard ON daily_nutrition_summaries(user_id, summary_date DESC)
      INCLUDE (total_calories, total_protein_g, total_carbs_g, total_fat_g, goal_calories)
    `);
  }

  // ============================================
  // SECTION 10: Meal Plans
  // ============================================

  if (!(await tableExists('meal_plans'))) {
    log.info('Creating meal_plans table...');
    await db.query(`
      CREATE TABLE meal_plans (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        name TEXT NOT NULL,
        description TEXT,

        -- Duration
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,

        -- Goals for this plan
        daily_calories INTEGER,
        daily_protein_g INTEGER,
        daily_carbs_g INTEGER,
        daily_fat_g INTEGER,

        -- Status
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),

        -- Source
        ai_generated BOOLEAN DEFAULT false,
        template_id TEXT,

        -- Shopping list
        shopping_list JSONB DEFAULT '[]',
        estimated_cost DECIMAL(10,2),

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_meal_plans_user ON meal_plans(user_id, start_date DESC)');
    await db.query('CREATE INDEX idx_meal_plans_active ON meal_plans(user_id, status) WHERE status = \'active\'');
  }

  // ============================================
  // SECTION 11: Meal Plan Items
  // ============================================

  if (!(await tableExists('meal_plan_items'))) {
    log.info('Creating meal_plan_items table...');
    await db.query(`
      CREATE TABLE meal_plan_items (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        meal_plan_id TEXT NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,

        plan_date DATE NOT NULL,
        meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack')),

        -- What to eat (one of these)
        recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
        food_id TEXT REFERENCES foods(id) ON DELETE SET NULL,
        custom_description TEXT,

        -- Portion
        servings DECIMAL(5,2) DEFAULT 1,

        -- Calculated
        calories INTEGER,
        protein_g DECIMAL(10,2),
        carbs_g DECIMAL(10,2),
        fat_g DECIMAL(10,2),

        -- Status
        completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMPTZ,
        completed_meal_log_id TEXT REFERENCES meal_logs(id) ON DELETE SET NULL,

        -- Order within day
        sort_order INTEGER DEFAULT 0
      )
    `);

    await db.query('CREATE INDEX idx_meal_plan_items_plan_date ON meal_plan_items(meal_plan_id, plan_date)');
  }

  // ============================================
  // SECTION 12: Nutrition Streaks
  // ============================================

  if (!(await tableExists('nutrition_streaks'))) {
    log.info('Creating nutrition_streaks table...');
    await db.query(`
      CREATE TABLE nutrition_streaks (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

        -- Logging streaks
        current_logging_streak INTEGER DEFAULT 0,
        longest_logging_streak INTEGER DEFAULT 0,
        last_logged_date DATE,

        -- Goal streaks
        current_goal_streak INTEGER DEFAULT 0,
        longest_goal_streak INTEGER DEFAULT 0,
        last_goal_hit_date DATE,

        -- Protein streaks
        current_protein_streak INTEGER DEFAULT 0,
        longest_protein_streak INTEGER DEFAULT 0,

        -- Total stats
        total_meals_logged INTEGER DEFAULT 0,
        total_days_logged INTEGER DEFAULT 0,
        total_calories_logged INTEGER DEFAULT 0,

        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  // ============================================
  // SECTION 13: Hydration Logs
  // ============================================

  if (!(await tableExists('hydration_logs'))) {
    log.info('Creating hydration_logs table...');
    await db.query(`
      CREATE TABLE hydration_logs (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        log_date DATE NOT NULL,
        logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        amount_ml INTEGER NOT NULL,
        beverage_type TEXT DEFAULT 'water' CHECK (beverage_type IN ('water', 'coffee', 'tea', 'juice', 'sports_drink', 'other')),

        notes TEXT
      )
    `);

    await db.query('CREATE INDEX idx_hydration_user_date ON hydration_logs(user_id, log_date DESC)');
  }

  // ============================================
  // SECTION 14: Nutrition Posts (Community)
  // ============================================

  if (!(await tableExists('nutrition_posts'))) {
    log.info('Creating nutrition_posts table...');
    await db.query(`
      CREATE TABLE nutrition_posts (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        post_type TEXT NOT NULL CHECK (post_type IN ('meal_share', 'recipe_share', 'milestone', 'challenge_update')),

        -- References
        meal_log_id TEXT REFERENCES meal_logs(id) ON DELETE SET NULL,
        recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,

        -- Content
        caption TEXT,
        photo_url TEXT,

        -- What to show
        show_macros BOOLEAN DEFAULT true,
        show_calories BOOLEAN DEFAULT true,

        -- Context
        is_post_workout BOOLEAN DEFAULT false,
        workout_id TEXT,
        muscles_worked TEXT[] DEFAULT '{}',

        -- Engagement
        prop_count INTEGER DEFAULT 0,
        comment_count INTEGER DEFAULT 0,
        save_count INTEGER DEFAULT 0,

        -- Visibility
        visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'crew', 'friends', 'private')),

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_nutrition_posts_user ON nutrition_posts(user_id, created_at DESC)');
    await db.query('CREATE INDEX idx_nutrition_posts_keyset ON nutrition_posts(created_at DESC, id DESC)');
  }

  // ============================================
  // SECTION 15: Frequent Foods (User's commonly used)
  // ============================================

  if (!(await tableExists('user_frequent_foods'))) {
    log.info('Creating user_frequent_foods table...');
    await db.query(`
      CREATE TABLE user_frequent_foods (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        food_id TEXT REFERENCES foods(id) ON DELETE CASCADE,
        custom_food_id TEXT REFERENCES custom_foods(id) ON DELETE CASCADE,
        recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,

        use_count INTEGER NOT NULL DEFAULT 1,
        last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        -- Default serving for this user
        default_servings DECIMAL(5,2) DEFAULT 1,

        PRIMARY KEY(user_id, COALESCE(food_id, ''), COALESCE(custom_food_id, ''), COALESCE(recipe_id, '')),
        CHECK (
          (food_id IS NOT NULL AND custom_food_id IS NULL AND recipe_id IS NULL) OR
          (food_id IS NULL AND custom_food_id IS NOT NULL AND recipe_id IS NULL) OR
          (food_id IS NULL AND custom_food_id IS NULL AND recipe_id IS NOT NULL)
        )
      )
    `);

    await db.query('CREATE INDEX idx_frequent_foods_user ON user_frequent_foods(user_id, use_count DESC)');
  }

  // ============================================
  // SECTION 16: Archetype Nutrition Profiles
  // ============================================

  if (!(await tableExists('archetype_nutrition_profiles'))) {
    log.info('Creating archetype_nutrition_profiles table...');
    await db.query(`
      CREATE TABLE archetype_nutrition_profiles (
        archetype TEXT PRIMARY KEY,

        name TEXT NOT NULL,
        description TEXT,

        -- Macro splits (as percentages)
        protein_pct DECIMAL(4,2) NOT NULL,
        carbs_pct DECIMAL(4,2) NOT NULL,
        fat_pct DECIMAL(4,2) NOT NULL,

        -- Modifiers
        protein_multiplier DECIMAL(4,2) DEFAULT 1.0,
        calorie_adjustment INTEGER DEFAULT 0,

        -- Priority nutrients
        priority_nutrients TEXT[] DEFAULT '{}',

        -- Timing preferences
        meal_timing TEXT DEFAULT 'standard' CHECK (meal_timing IN ('standard', 'around_training', 'frequent_small', 'intermittent')),

        -- Suggested foods
        suggested_foods TEXT[] DEFAULT '{}',
        avoid_foods TEXT[] DEFAULT '{}',

        -- Tips
        tips TEXT[] DEFAULT '{}'
      )
    `);

    // Seed archetype profiles
    log.info('Seeding archetype nutrition profiles...');
    const profiles = [
      {
        archetype: 'warrior',
        name: 'Warrior Fuel',
        description: 'Power-focused nutrition for maximum strength and explosive performance',
        protein_pct: 0.35,
        carbs_pct: 0.40,
        fat_pct: 0.25,
        protein_multiplier: 1.1,
        calorie_adjustment: 0,
        priority_nutrients: ['protein', 'creatine', 'iron', 'zinc'],
        meal_timing: 'around_training',
        suggested_foods: ['lean beef', 'eggs', 'oats', 'sweet potato', 'rice', 'chicken breast'],
        avoid_foods: [],
        tips: ['Consume 40g protein within 2 hours of training', 'Prioritize red meat 2-3x/week for iron', 'Time carbs around workouts']
      },
      {
        archetype: 'guardian',
        name: 'Guardian Sustenance',
        description: 'Balanced nutrition for endurance, resilience, and steady energy',
        protein_pct: 0.30,
        carbs_pct: 0.45,
        fat_pct: 0.25,
        protein_multiplier: 1.0,
        calorie_adjustment: 0,
        priority_nutrients: ['complex_carbs', 'fiber', 'iron', 'b_vitamins'],
        meal_timing: 'frequent_small',
        suggested_foods: ['whole grains', 'legumes', 'lean protein', 'vegetables', 'nuts'],
        avoid_foods: ['simple sugars', 'processed foods'],
        tips: ['Eat every 3-4 hours for steady energy', 'Focus on complex carbs for sustained performance', 'Include fiber at every meal']
      },
      {
        archetype: 'athlete',
        name: 'Athlete Performance',
        description: 'Periodized nutrition optimized for peak athletic performance',
        protein_pct: 0.30,
        carbs_pct: 0.50,
        fat_pct: 0.20,
        protein_multiplier: 1.05,
        calorie_adjustment: 200,
        priority_nutrients: ['carbs', 'electrolytes', 'protein', 'antioxidants'],
        meal_timing: 'around_training',
        suggested_foods: ['pasta', 'rice', 'bananas', 'chicken', 'fish', 'sports drinks'],
        avoid_foods: ['high fat before training', 'alcohol'],
        tips: ['Carb load before competition', 'Replenish glycogen within 30 min post-workout', 'Stay hydrated with electrolytes']
      },
      {
        archetype: 'sentinel',
        name: 'Sentinel Tactical',
        description: 'Tactical nutrition for alertness, focus, and sustained readiness',
        protein_pct: 0.35,
        carbs_pct: 0.30,
        fat_pct: 0.35,
        protein_multiplier: 1.05,
        calorie_adjustment: -100,
        priority_nutrients: ['omega3', 'protein', 'healthy_fats', 'caffeine'],
        meal_timing: 'intermittent',
        suggested_foods: ['salmon', 'avocado', 'eggs', 'nuts', 'dark chocolate', 'green tea'],
        avoid_foods: ['sugar spikes', 'heavy carbs midday'],
        tips: ['Prioritize fats for sustained mental energy', 'Limit carbs to evening for better sleep', 'Use caffeine strategically']
      },
      {
        archetype: 'titan',
        name: 'Titan Mass',
        description: 'High-volume nutrition designed for maximum muscle growth',
        protein_pct: 0.30,
        carbs_pct: 0.50,
        fat_pct: 0.20,
        protein_multiplier: 1.2,
        calorie_adjustment: 500,
        priority_nutrients: ['protein', 'carbs', 'leucine', 'creatine'],
        meal_timing: 'frequent_small',
        suggested_foods: ['rice', 'chicken', 'beef', 'pasta', 'whole milk', 'peanut butter'],
        avoid_foods: [],
        tips: ['Eat 5-6 meals per day', 'Never miss post-workout nutrition', 'Aim for 1g protein per lb bodyweight']
      },
      {
        archetype: 'phoenix',
        name: 'Phoenix Recovery',
        description: 'Anti-inflammatory nutrition focused on healing and regeneration',
        protein_pct: 0.30,
        carbs_pct: 0.40,
        fat_pct: 0.30,
        protein_multiplier: 1.0,
        calorie_adjustment: 0,
        priority_nutrients: ['omega3', 'antioxidants', 'vitamin_c', 'collagen', 'zinc'],
        meal_timing: 'standard',
        suggested_foods: ['salmon', 'berries', 'leafy greens', 'bone broth', 'turmeric', 'ginger'],
        avoid_foods: ['processed foods', 'excess sugar', 'alcohol', 'fried foods'],
        tips: ['Prioritize colorful vegetables', 'Include omega-3s daily', 'Bone broth for joint health']
      }
    ];

    for (const profile of profiles) {
      await db.query(`
        INSERT INTO archetype_nutrition_profiles (
          archetype, name, description, protein_pct, carbs_pct, fat_pct,
          protein_multiplier, calorie_adjustment, priority_nutrients,
          meal_timing, suggested_foods, avoid_foods, tips
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (archetype) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          protein_pct = EXCLUDED.protein_pct,
          carbs_pct = EXCLUDED.carbs_pct,
          fat_pct = EXCLUDED.fat_pct,
          protein_multiplier = EXCLUDED.protein_multiplier,
          calorie_adjustment = EXCLUDED.calorie_adjustment,
          priority_nutrients = EXCLUDED.priority_nutrients,
          meal_timing = EXCLUDED.meal_timing,
          suggested_foods = EXCLUDED.suggested_foods,
          avoid_foods = EXCLUDED.avoid_foods,
          tips = EXCLUDED.tips
      `, [
        profile.archetype, profile.name, profile.description,
        profile.protein_pct, profile.carbs_pct, profile.fat_pct,
        profile.protein_multiplier, profile.calorie_adjustment, profile.priority_nutrients,
        profile.meal_timing, profile.suggested_foods, profile.avoid_foods, profile.tips
      ]);
    }
  }

  // ============================================
  // SECTION 17: Trigger Functions
  // ============================================

  // Update daily summary trigger
  if (!(await functionExists('update_daily_nutrition_summary'))) {
    log.info('Creating update_daily_nutrition_summary function...');
    await db.query(`
      CREATE OR REPLACE FUNCTION update_daily_nutrition_summary()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Recalculate daily summary for affected date
        INSERT INTO daily_nutrition_summaries (user_id, summary_date, total_calories, total_protein_g, total_carbs_g, total_fat_g, total_fiber_g, meal_count)
        SELECT
          COALESCE(NEW.user_id, OLD.user_id),
          COALESCE(NEW.meal_date, OLD.meal_date),
          COALESCE(SUM(total_calories), 0),
          COALESCE(SUM(total_protein_g), 0),
          COALESCE(SUM(total_carbs_g), 0),
          COALESCE(SUM(total_fat_g), 0),
          COALESCE(SUM(total_fiber_g), 0),
          COUNT(*)
        FROM meal_logs
        WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
          AND meal_date = COALESCE(NEW.meal_date, OLD.meal_date)
        GROUP BY user_id, meal_date
        ON CONFLICT (user_id, summary_date) DO UPDATE SET
          total_calories = EXCLUDED.total_calories,
          total_protein_g = EXCLUDED.total_protein_g,
          total_carbs_g = EXCLUDED.total_carbs_g,
          total_fat_g = EXCLUDED.total_fat_g,
          total_fiber_g = EXCLUDED.total_fiber_g,
          meal_count = EXCLUDED.meal_count,
          updated_at = NOW();

        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql
    `);
  }

  // Create trigger on meal_logs
  if (!(await triggerExists('trg_meal_log_summary', 'meal_logs'))) {
    log.info('Creating meal_logs summary trigger...');
    await db.query(`
      CREATE TRIGGER trg_meal_log_summary
      AFTER INSERT OR UPDATE OR DELETE ON meal_logs
      FOR EACH ROW
      EXECUTE FUNCTION update_daily_nutrition_summary()
    `);
  }

  // Update recipe rating trigger
  if (!(await functionExists('update_recipe_rating'))) {
    log.info('Creating update_recipe_rating function...');
    await db.query(`
      CREATE OR REPLACE FUNCTION update_recipe_rating()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE recipes
        SET
          rating = (SELECT AVG(rating) FROM recipe_ratings WHERE recipe_id = COALESCE(NEW.recipe_id, OLD.recipe_id)),
          rating_count = (SELECT COUNT(*) FROM recipe_ratings WHERE recipe_id = COALESCE(NEW.recipe_id, OLD.recipe_id))
        WHERE id = COALESCE(NEW.recipe_id, OLD.recipe_id);

        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql
    `);
  }

  if (!(await triggerExists('trg_recipe_rating', 'recipe_ratings'))) {
    log.info('Creating recipe_ratings trigger...');
    await db.query(`
      CREATE TRIGGER trg_recipe_rating
      AFTER INSERT OR UPDATE OR DELETE ON recipe_ratings
      FOR EACH ROW
      EXECUTE FUNCTION update_recipe_rating()
    `);
  }

  // Update recipe save count trigger
  if (!(await functionExists('update_recipe_save_count'))) {
    log.info('Creating update_recipe_save_count function...');
    await db.query(`
      CREATE OR REPLACE FUNCTION update_recipe_save_count()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE recipes
        SET save_count = (SELECT COUNT(*) FROM recipe_saves WHERE recipe_id = COALESCE(NEW.recipe_id, OLD.recipe_id))
        WHERE id = COALESCE(NEW.recipe_id, OLD.recipe_id);

        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql
    `);
  }

  if (!(await triggerExists('trg_recipe_save', 'recipe_saves'))) {
    log.info('Creating recipe_saves trigger...');
    await db.query(`
      CREATE TRIGGER trg_recipe_save
      AFTER INSERT OR DELETE ON recipe_saves
      FOR EACH ROW
      EXECUTE FUNCTION update_recipe_save_count()
    `);
  }

  // ============================================
  // SECTION 18: Nutrition Achievements
  // ============================================

  log.info('Seeding nutrition achievements...');
  const achievements = [
    { slug: 'first_meal_logged', name: 'First Bite', description: 'Log your first meal', category: 'nutrition', xp: 10, credits: 5 },
    { slug: 'nutrition_enabled', name: 'Fuel Tracker', description: 'Enable nutrition tracking', category: 'nutrition', xp: 25, credits: 10 },
    { slug: 'log_streak_3', name: 'Getting Started', description: 'Log meals for 3 consecutive days', category: 'nutrition', xp: 25, credits: 15 },
    { slug: 'log_streak_7', name: 'Week Warrior', description: 'Log meals for 7 consecutive days', category: 'nutrition', xp: 50, credits: 25 },
    { slug: 'log_streak_14', name: 'Fortnight Fighter', description: 'Log meals for 14 consecutive days', category: 'nutrition', xp: 100, credits: 50 },
    { slug: 'log_streak_30', name: 'Month Master', description: 'Log meals for 30 consecutive days', category: 'nutrition', xp: 200, credits: 100 },
    { slug: 'log_streak_100', name: 'Century Logger', description: 'Log meals for 100 consecutive days', category: 'nutrition', xp: 500, credits: 250 },
    { slug: 'macro_master_3', name: 'Macro Beginner', description: 'Hit macro targets for 3 days', category: 'nutrition', xp: 30, credits: 15 },
    { slug: 'macro_master_7', name: 'Macro Master', description: 'Hit macro targets for 7 days', category: 'nutrition', xp: 100, credits: 50 },
    { slug: 'macro_master_30', name: 'Macro Legend', description: 'Hit macro targets for 30 days', category: 'nutrition', xp: 300, credits: 150 },
    { slug: 'protein_goal_7', name: 'Protein Pro', description: 'Hit protein goal for 7 consecutive days', category: 'nutrition', xp: 75, credits: 35 },
    { slug: 'recipe_creator', name: 'Chef Mode', description: 'Create your first recipe', category: 'nutrition', xp: 25, credits: 10 },
    { slug: 'recipe_10', name: 'Recipe Book', description: 'Create 10 recipes', category: 'nutrition', xp: 100, credits: 50 },
    { slug: 'recipe_saved_10', name: 'Community Favorite', description: 'Have a recipe saved 10 times', category: 'nutrition', xp: 100, credits: 50 },
    { slug: 'recipe_saved_100', name: 'Community Chef', description: 'Have a recipe saved 100 times', category: 'nutrition', xp: 500, credits: 200 },
    { slug: 'recipe_5_star', name: 'Five Star Chef', description: 'Get a 5-star rating on a recipe', category: 'nutrition', xp: 75, credits: 35 },
    { slug: 'meal_plan_completed', name: 'Plan Executor', description: 'Complete a full meal plan', category: 'nutrition', xp: 150, credits: 75 },
    { slug: 'archetype_diet_7', name: 'Path Follower', description: 'Follow archetype diet for 7 days', category: 'nutrition', xp: 100, credits: 50 },
    { slug: 'archetype_diet_30', name: 'True to Path', description: 'Follow archetype diet for 30 days', category: 'nutrition', xp: 300, credits: 150 },
    { slug: 'barcode_scanner', name: 'Scan Master', description: 'Log 50 meals via barcode', category: 'nutrition', xp: 50, credits: 25 },
    { slug: 'photo_logger', name: 'Food Photographer', description: 'Log 25 meals with photos', category: 'nutrition', xp: 50, credits: 25 },
    { slug: 'hydration_hero', name: 'Hydration Hero', description: 'Hit water goal for 7 consecutive days', category: 'nutrition', xp: 50, credits: 25 },
    { slug: 'meals_logged_100', name: 'Centurion', description: 'Log 100 total meals', category: 'nutrition', xp: 100, credits: 50 },
    { slug: 'meals_logged_500', name: 'Meal Master', description: 'Log 500 total meals', category: 'nutrition', xp: 250, credits: 125 },
    { slug: 'meals_logged_1000', name: 'Nutrition Legend', description: 'Log 1000 total meals', category: 'nutrition', xp: 500, credits: 250 }
  ];

  for (const achievement of achievements) {
    await db.query(`
      INSERT INTO achievement_definitions (id, slug, name, description, category, xp_reward, credit_reward)
      VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        xp_reward = EXCLUDED.xp_reward,
        credit_reward = EXCLUDED.credit_reward
    `, [achievement.slug, achievement.name, achievement.description, achievement.category, achievement.xp, achievement.credits]);
  }

  // ============================================
  // SECTION 19: Add nutrition_enabled to users
  // ============================================

  if (!(await columnExists('users', 'nutrition_enabled'))) {
    log.info('Adding nutrition_enabled to users table...');
    await db.query('ALTER TABLE users ADD COLUMN nutrition_enabled BOOLEAN DEFAULT false');
    await db.query('CREATE INDEX idx_users_nutrition ON users(nutrition_enabled) WHERE nutrition_enabled = true');
  }

  log.info('Migration 069_nutrition_system completed successfully');
}

// ============================================
// ROLLBACK FUNCTION
// ============================================

export async function down(): Promise<void> {
  log.info('Rolling back migration: 069_nutrition_system');

  // Drop triggers first
  await db.query('DROP TRIGGER IF EXISTS trg_meal_log_summary ON meal_logs');
  await db.query('DROP TRIGGER IF EXISTS trg_recipe_rating ON recipe_ratings');
  await db.query('DROP TRIGGER IF EXISTS trg_recipe_save ON recipe_saves');

  // Drop functions
  await db.query('DROP FUNCTION IF EXISTS update_daily_nutrition_summary()');
  await db.query('DROP FUNCTION IF EXISTS update_recipe_rating()');
  await db.query('DROP FUNCTION IF EXISTS update_recipe_save_count()');

  // Drop tables in reverse dependency order
  await db.query('DROP TABLE IF EXISTS nutrition_posts CASCADE');
  await db.query('DROP TABLE IF EXISTS user_frequent_foods CASCADE');
  await db.query('DROP TABLE IF EXISTS hydration_logs CASCADE');
  await db.query('DROP TABLE IF EXISTS nutrition_streaks CASCADE');
  await db.query('DROP TABLE IF EXISTS meal_plan_items CASCADE');
  await db.query('DROP TABLE IF EXISTS meal_plans CASCADE');
  await db.query('DROP TABLE IF EXISTS daily_nutrition_summaries CASCADE');
  await db.query('DROP TABLE IF EXISTS meal_logs CASCADE');
  await db.query('DROP TABLE IF EXISTS recipe_ratings CASCADE');
  await db.query('DROP TABLE IF EXISTS recipe_saves CASCADE');
  await db.query('DROP TABLE IF EXISTS recipes CASCADE');
  await db.query('DROP TABLE IF EXISTS custom_foods CASCADE');
  await db.query('DROP TABLE IF EXISTS foods CASCADE');
  await db.query('DROP TABLE IF EXISTS nutrition_goals CASCADE');
  await db.query('DROP TABLE IF EXISTS user_nutrition_preferences CASCADE');
  await db.query('DROP TABLE IF EXISTS archetype_nutrition_profiles CASCADE');

  // Drop column from users
  await db.query('ALTER TABLE users DROP COLUMN IF EXISTS nutrition_enabled');

  // Delete achievements
  await db.query("DELETE FROM achievement_definitions WHERE category = 'nutrition'");

  log.info('Rollback 069_nutrition_system completed');
}

export const migrate = up;
