/**
 * Migration: User Preferences System
 *
 * Creates a comprehensive user customization system including:
 * - Central user preferences with JSONB flexibility
 * - Configuration profiles (Gym Mode, Home Mode, Competition Mode)
 * - Dashboard widget layouts
 * - Music streaming connections
 * - Custom sound packs
 * - Device-specific settings
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ============================================
  // 1. Central User Preferences Table
  // ============================================
  await knex.schema.createTable('user_preferences', (table) => {
    table.text('id').primary().defaultTo(knex.raw("'pref_' || replace(gen_random_uuid()::text, '-', '')"));
    table.text('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');

    // JSONB for flexible preferences storage
    table.jsonb('preferences').notNullable().defaultTo('{}');

    // Active profile reference (set after profiles table is created)
    table.text('active_profile_id');

    // Version for optimistic locking
    table.integer('version').notNullable().defaultTo(1);

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);
  `);

  // ============================================
  // 2. Configuration Profiles Table
  // ============================================
  await knex.schema.createTable('user_preference_profiles', (table) => {
    table.text('id').primary().defaultTo(knex.raw("'profile_' || replace(gen_random_uuid()::text, '-', '')"));
    table.text('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    table.text('name').notNullable();
    table.text('description');
    table.text('icon').defaultTo('settings');
    table.text('color').defaultTo('#3B82F6');

    // Profile-specific preference overrides
    table.jsonb('preferences_override').notNullable().defaultTo('{}');

    // Auto-activation rules (e.g., time of day, location)
    table.jsonb('auto_activate_rules').defaultTo('{}');

    table.boolean('is_default').defaultTo(false);
    table.integer('sort_order').defaultTo(0);

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());

    // Unique constraint on user + profile name
    table.unique(['user_id', 'name']);
  });

  await knex.raw(`
    CREATE INDEX idx_user_profiles_user ON user_preference_profiles(user_id);
  `);

  // Add foreign key from user_preferences to profiles now that profiles table exists
  await knex.schema.alterTable('user_preferences', (table) => {
    table.foreign('active_profile_id').references('id').inTable('user_preference_profiles').onDelete('SET NULL');
  });

  // ============================================
  // 3. Dashboard Widget Layouts Table
  // ============================================
  await knex.schema.createTable('user_dashboard_layouts', (table) => {
    table.text('id').primary().defaultTo(knex.raw("'layout_' || replace(gen_random_uuid()::text, '-', '')"));
    table.text('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('profile_id').references('id').inTable('user_preference_profiles').onDelete('SET NULL');

    // Widget configuration array
    // [{id, type, x, y, w, h, visible, settings}]
    table.jsonb('widgets').notNullable().defaultTo('[]');

    // Grid configuration
    table.integer('columns').defaultTo(12);
    table.integer('row_height').defaultTo(100);

    // Platform-specific layouts
    table.text('platform').defaultTo('web'); // 'web' | 'ios' | 'android'

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());

    // Unique layout per user/platform/profile combination
    table.unique(['user_id', 'platform', 'profile_id']);
  });

  await knex.raw(`
    CREATE INDEX idx_dashboard_layouts_user ON user_dashboard_layouts(user_id);
    CREATE INDEX idx_dashboard_layouts_platform ON user_dashboard_layouts(platform);
  `);

  // ============================================
  // 4. Music Streaming Connections Table
  // ============================================
  await knex.schema.createTable('user_music_connections', (table) => {
    table.text('id').primary().defaultTo(knex.raw("'music_' || replace(gen_random_uuid()::text, '-', '')"));
    table.text('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Provider: 'spotify' | 'apple_music' | 'youtube_music'
    table.text('provider').notNullable();

    // OAuth tokens (should be encrypted in production)
    table.text('access_token');
    table.text('refresh_token');
    table.timestamp('token_expires_at', { useTz: true });

    // Provider-specific user ID
    table.text('provider_user_id');
    table.text('provider_display_name');

    // User preferences for this provider
    table.text('default_playlist_id');
    table.text('default_playlist_name');
    table.boolean('auto_play_on_workout').defaultTo(true);
    table.boolean('bpm_matching_enabled').defaultTo(false);

    // Connection metadata
    table.timestamp('connected_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('last_used_at', { useTz: true });

    // Unique constraint on user + provider
    table.unique(['user_id', 'provider']);
  });

  await knex.raw(`
    CREATE INDEX idx_music_connections_user ON user_music_connections(user_id);
    CREATE INDEX idx_music_connections_provider ON user_music_connections(provider);
  `);

  // ============================================
  // 5. Custom Sound Packs Table
  // ============================================
  await knex.schema.createTable('user_sound_packs', (table) => {
    table.text('id').primary().defaultTo(knex.raw("'sound_' || replace(gen_random_uuid()::text, '-', '')"));
    table.text('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    table.text('name').notNullable();
    table.text('description');

    // Sound URLs (S3/CDN)
    // {
    //   "timer_complete": "https://cdn.../sound.mp3",
    //   "timer_warning": "...",
    //   "rep_count": "...",
    //   "set_complete": "...",
    //   "workout_complete": "...",
    //   "achievement": "...",
    //   "metronome_tick": "...",
    //   "metronome_accent": "...",
    //   "hydration_reminder": "..."
    // }
    table.jsonb('sounds').notNullable().defaultTo('{}');

    table.boolean('is_default').defaultTo(false);
    table.boolean('is_public').defaultTo(false); // Allow sharing sound packs

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_sound_packs_user ON user_sound_packs(user_id);
    CREATE INDEX idx_sound_packs_public ON user_sound_packs(is_public) WHERE is_public = true;
  `);

  // ============================================
  // 6. Device-Specific Settings Table
  // ============================================
  await knex.schema.createTable('user_device_settings', (table) => {
    table.text('id').primary().defaultTo(knex.raw("'device_' || replace(gen_random_uuid()::text, '-', '')"));
    table.text('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Client-generated unique device ID
    table.text('device_id').notNullable();
    table.text('device_name');

    // Platform: 'web' | 'ios' | 'android' | 'watchos'
    table.text('platform').notNullable();

    // Device info for display
    table.text('device_model');
    table.text('os_version');
    table.text('app_version');

    // Device-specific setting overrides
    table.jsonb('settings_override').defaultTo('{}');

    // Sync preferences
    table.boolean('sync_enabled').defaultTo(true);
    table.timestamp('last_sync_at', { useTz: true });

    // Push notification token for this device
    table.text('push_token');
    table.boolean('push_enabled').defaultTo(true);

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());

    // Unique constraint on user + device
    table.unique(['user_id', 'device_id']);
  });

  await knex.raw(`
    CREATE INDEX idx_device_settings_user ON user_device_settings(user_id);
    CREATE INDEX idx_device_settings_platform ON user_device_settings(platform);
  `);

  // ============================================
  // 7. Hydration Log Table
  // ============================================
  await knex.schema.createTable('user_hydration_logs', (table) => {
    table.text('id').primary().defaultTo(knex.raw("'hydration_' || replace(gen_random_uuid()::text, '-', '')"));
    table.text('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Amount in ounces (can convert to ml on client)
    table.decimal('amount_oz', 6, 2).notNullable();

    // Optional: link to workout session
    table.text('workout_session_id');

    // Source of the log
    table.text('source').defaultTo('manual'); // 'manual' | 'quick_log' | 'reminder' | 'wearable'

    table.timestamp('logged_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_hydration_logs_user ON user_hydration_logs(user_id);
    CREATE INDEX idx_hydration_logs_date ON user_hydration_logs(user_id, logged_at);
    CREATE INDEX idx_hydration_logs_daily ON user_hydration_logs(user_id, (logged_at::date));
  `);

  // ============================================
  // 8. System Sound Packs (Pre-built)
  // ============================================
  await knex.schema.createTable('system_sound_packs', (table) => {
    table.text('id').primary();
    table.text('name').notNullable();
    table.text('description');
    table.text('category'); // 'minimal' | 'energetic' | 'calm' | 'gaming' | 'military'
    table.jsonb('sounds').notNullable();
    table.boolean('is_premium').defaultTo(false);
    table.integer('sort_order').defaultTo(0);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // Seed default system sound packs
  await knex('system_sound_packs').insert([
    {
      id: 'default',
      name: 'Default',
      description: 'Clean, professional sounds',
      category: 'minimal',
      sounds: JSON.stringify({
        timer_complete: '/sounds/default/timer-complete.mp3',
        timer_warning: '/sounds/default/timer-warning.mp3',
        set_complete: '/sounds/default/set-complete.mp3',
        workout_complete: '/sounds/default/workout-complete.mp3',
        achievement: '/sounds/default/achievement.mp3',
        metronome_tick: '/sounds/default/metronome-tick.mp3',
        metronome_accent: '/sounds/default/metronome-accent.mp3',
        hydration_reminder: '/sounds/default/hydration.mp3',
      }),
      is_premium: false,
      sort_order: 0,
    },
    {
      id: 'energetic',
      name: 'Energetic',
      description: 'High-energy sounds to pump you up',
      category: 'energetic',
      sounds: JSON.stringify({
        timer_complete: '/sounds/energetic/timer-complete.mp3',
        timer_warning: '/sounds/energetic/timer-warning.mp3',
        set_complete: '/sounds/energetic/set-complete.mp3',
        workout_complete: '/sounds/energetic/workout-complete.mp3',
        achievement: '/sounds/energetic/achievement.mp3',
        metronome_tick: '/sounds/energetic/metronome-tick.mp3',
        metronome_accent: '/sounds/energetic/metronome-accent.mp3',
        hydration_reminder: '/sounds/energetic/hydration.mp3',
      }),
      is_premium: false,
      sort_order: 1,
    },
    {
      id: 'calm',
      name: 'Calm',
      description: 'Soft, relaxing tones for yoga and stretching',
      category: 'calm',
      sounds: JSON.stringify({
        timer_complete: '/sounds/calm/timer-complete.mp3',
        timer_warning: '/sounds/calm/timer-warning.mp3',
        set_complete: '/sounds/calm/set-complete.mp3',
        workout_complete: '/sounds/calm/workout-complete.mp3',
        achievement: '/sounds/calm/achievement.mp3',
        metronome_tick: '/sounds/calm/metronome-tick.mp3',
        metronome_accent: '/sounds/calm/metronome-accent.mp3',
        hydration_reminder: '/sounds/calm/hydration.mp3',
      }),
      is_premium: false,
      sort_order: 2,
    },
    {
      id: 'gaming',
      name: 'Gaming',
      description: 'Retro gaming-inspired sound effects',
      category: 'gaming',
      sounds: JSON.stringify({
        timer_complete: '/sounds/gaming/timer-complete.mp3',
        timer_warning: '/sounds/gaming/timer-warning.mp3',
        set_complete: '/sounds/gaming/set-complete.mp3',
        workout_complete: '/sounds/gaming/workout-complete.mp3',
        achievement: '/sounds/gaming/achievement.mp3',
        metronome_tick: '/sounds/gaming/metronome-tick.mp3',
        metronome_accent: '/sounds/gaming/metronome-accent.mp3',
        hydration_reminder: '/sounds/gaming/hydration.mp3',
      }),
      is_premium: true,
      sort_order: 3,
    },
    {
      id: 'military',
      name: 'Military',
      description: 'Tactical sounds for serious training',
      category: 'military',
      sounds: JSON.stringify({
        timer_complete: '/sounds/military/timer-complete.mp3',
        timer_warning: '/sounds/military/timer-warning.mp3',
        set_complete: '/sounds/military/set-complete.mp3',
        workout_complete: '/sounds/military/workout-complete.mp3',
        achievement: '/sounds/military/achievement.mp3',
        metronome_tick: '/sounds/military/metronome-tick.mp3',
        metronome_accent: '/sounds/military/metronome-accent.mp3',
        hydration_reminder: '/sounds/military/hydration.mp3',
      }),
      is_premium: true,
      sort_order: 4,
    },
  ]);

  // ============================================
  // 9. Widget Registry Table (System-defined widgets)
  // ============================================
  await knex.schema.createTable('dashboard_widget_registry', (table) => {
    table.text('id').primary(); // e.g., 'stats', 'muscle_map', 'challenges'
    table.text('name').notNullable();
    table.text('description');
    table.text('category'); // 'core' | 'visualization' | 'gamification' | 'health' | 'social' | 'media'

    // Size constraints
    table.integer('default_width').defaultTo(2);
    table.integer('default_height').defaultTo(1);
    table.integer('min_width').defaultTo(1);
    table.integer('min_height').defaultTo(1);
    table.integer('max_width').defaultTo(4);
    table.integer('max_height').defaultTo(3);

    // Availability
    table.boolean('is_premium').defaultTo(false);
    table.boolean('is_enabled').defaultTo(true);
    table.integer('sort_order').defaultTo(0);

    // Component path for lazy loading
    table.text('component_path');

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // Seed widget registry
  await knex('dashboard_widget_registry').insert([
    { id: 'current_path', name: 'Current Path', description: 'Your current archetype and level', category: 'core', default_width: 2, default_height: 1, sort_order: 0 },
    { id: 'stats', name: 'Character Stats', description: 'STR, CON, DEX, PWR, END, VIT', category: 'core', default_width: 1, default_height: 2, sort_order: 1 },
    { id: 'quick_actions', name: 'Quick Actions', description: 'Start workout, journey, exercises', category: 'core', default_width: 3, default_height: 1, sort_order: 2 },
    { id: 'xp_progress', name: 'XP Progress', description: 'Level progress and XP bar', category: 'gamification', default_width: 1, default_height: 1, sort_order: 3 },
    { id: 'daily_quests', name: 'Daily Quests', description: 'Daily challenges and rewards', category: 'gamification', default_width: 1, default_height: 1, sort_order: 4 },
    { id: 'insights', name: 'Smart Insights', description: 'AI-powered training insights', category: 'core', default_width: 3, default_height: 1, sort_order: 5 },
    { id: 'daily_challenges', name: 'Daily Challenges', description: 'Challenge completion tracking', category: 'gamification', default_width: 2, default_height: 1, sort_order: 6 },
    { id: 'todays_workout', name: "Today's Workout", description: 'Scheduled workout summary', category: 'core', default_width: 1, default_height: 1, sort_order: 7 },
    { id: 'weekly_progress', name: 'Weekly Progress', description: 'Week at a glance', category: 'core', default_width: 1, default_height: 1, sort_order: 8 },
    { id: 'nutrition', name: 'Nutrition', description: 'Macro and calorie tracking', category: 'health', default_width: 2, default_height: 1, sort_order: 9 },
    { id: 'muscle_map', name: 'Muscle Activation', description: '2D body muscle visualization', category: 'visualization', default_width: 2, default_height: 2, sort_order: 10 },
    { id: 'daily_tip', name: 'Daily Tip', description: 'Training tips and advice', category: 'core', default_width: 2, default_height: 1, sort_order: 11 },
    { id: 'milestones', name: 'Milestones', description: 'Progress toward milestones', category: 'gamification', default_width: 2, default_height: 1, sort_order: 12 },
    { id: 'adventure_map', name: 'Adventure Map', description: 'RPG-style site navigation', category: 'gamification', default_width: 2, default_height: 2, sort_order: 13 },
    { id: 'activity', name: 'Recent Activity', description: 'Recent workouts and achievements', category: 'social', default_width: 2, default_height: 2, sort_order: 14 },
    { id: 'hydration', name: 'Hydration Tracker', description: 'Daily water intake', category: 'health', default_width: 1, default_height: 1, sort_order: 15 },
    { id: 'music_player', name: 'Music Player', description: 'Control music playback', category: 'media', default_width: 2, default_height: 1, sort_order: 16 },
    { id: 'coach_tips', name: 'Coach Tips', description: 'Tips from Max the coach', category: 'core', default_width: 2, default_height: 1, sort_order: 17 },
    { id: 'feature_discovery', name: 'Feature Discovery', description: 'Discover new features', category: 'core', default_width: 2, default_height: 1, sort_order: 18 },
  ]);

  // ============================================
  // 10. Migration Trigger for updated_at
  // ============================================
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_preferences_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_user_preferences_updated_at
      BEFORE UPDATE ON user_preferences
      FOR EACH ROW
      EXECUTE FUNCTION update_preferences_updated_at();

    CREATE TRIGGER trigger_user_profiles_updated_at
      BEFORE UPDATE ON user_preference_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_preferences_updated_at();

    CREATE TRIGGER trigger_dashboard_layouts_updated_at
      BEFORE UPDATE ON user_dashboard_layouts
      FOR EACH ROW
      EXECUTE FUNCTION update_preferences_updated_at();

    CREATE TRIGGER trigger_device_settings_updated_at
      BEFORE UPDATE ON user_device_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_preferences_updated_at();
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers first
  await knex.raw(`
    DROP TRIGGER IF EXISTS trigger_user_preferences_updated_at ON user_preferences;
    DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON user_preference_profiles;
    DROP TRIGGER IF EXISTS trigger_dashboard_layouts_updated_at ON user_dashboard_layouts;
    DROP TRIGGER IF EXISTS trigger_device_settings_updated_at ON user_device_settings;
    DROP FUNCTION IF EXISTS update_preferences_updated_at();
  `);

  // Drop tables in reverse order of creation (respecting foreign keys)
  await knex.schema.dropTableIfExists('dashboard_widget_registry');
  await knex.schema.dropTableIfExists('system_sound_packs');
  await knex.schema.dropTableIfExists('user_hydration_logs');
  await knex.schema.dropTableIfExists('user_device_settings');
  await knex.schema.dropTableIfExists('user_sound_packs');
  await knex.schema.dropTableIfExists('user_music_connections');
  await knex.schema.dropTableIfExists('user_dashboard_layouts');

  // Drop foreign key from user_preferences before dropping profiles
  await knex.schema.alterTable('user_preferences', (table) => {
    table.dropForeign('active_profile_id');
  });

  await knex.schema.dropTableIfExists('user_preference_profiles');
  await knex.schema.dropTableIfExists('user_preferences');
}
