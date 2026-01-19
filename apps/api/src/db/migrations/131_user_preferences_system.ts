/**
 * Migration 131: User Preferences System
 *
 * Creates a comprehensive user customization system including:
 * - Central user preferences with JSONB flexibility
 * - Configuration profiles (Gym Mode, Home Mode, Competition Mode)
 * - Dashboard widget layouts
 * - Music streaming connections
 * - Custom sound packs
 * - Device-specific settings
 */

import { query } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration 131: User Preferences System');

  // ============================================
  // 1. Central User Preferences Table
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id TEXT PRIMARY KEY DEFAULT 'pref_' || replace(gen_random_uuid()::text, '-', ''),
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      preferences JSONB NOT NULL DEFAULT '{}',
      active_profile_id TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id)
  `);

  // ============================================
  // 2. Configuration Profiles Table
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS user_preference_profiles (
      id TEXT PRIMARY KEY DEFAULT 'profile_' || replace(gen_random_uuid()::text, '-', ''),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT 'settings',
      color TEXT DEFAULT '#3B82F6',
      preferences_override JSONB NOT NULL DEFAULT '{}',
      auto_activate_rules JSONB DEFAULT '{}',
      is_default BOOLEAN DEFAULT false,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE (user_id, name)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_preference_profiles(user_id)
  `);

  // Add foreign key from user_preferences to profiles now that profiles table exists
  await query(`
    ALTER TABLE user_preferences
    ADD CONSTRAINT fk_user_preferences_active_profile
    FOREIGN KEY (active_profile_id)
    REFERENCES user_preference_profiles(id)
    ON DELETE SET NULL
  `);

  // ============================================
  // 3. Dashboard Widget Layouts Table
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS user_dashboard_layouts (
      id TEXT PRIMARY KEY DEFAULT 'layout_' || replace(gen_random_uuid()::text, '-', ''),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      profile_id TEXT REFERENCES user_preference_profiles(id) ON DELETE SET NULL,
      widgets JSONB NOT NULL DEFAULT '[]',
      columns INTEGER DEFAULT 12,
      row_height INTEGER DEFAULT 100,
      platform TEXT DEFAULT 'web',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE (user_id, platform, profile_id)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user ON user_dashboard_layouts(user_id)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_platform ON user_dashboard_layouts(platform)
  `);

  // ============================================
  // 4. Music Streaming Connections Table
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS user_music_connections (
      id TEXT PRIMARY KEY DEFAULT 'music_' || replace(gen_random_uuid()::text, '-', ''),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at TIMESTAMP WITH TIME ZONE,
      provider_user_id TEXT,
      provider_display_name TEXT,
      default_playlist_id TEXT,
      default_playlist_name TEXT,
      auto_play_on_workout BOOLEAN DEFAULT true,
      bpm_matching_enabled BOOLEAN DEFAULT false,
      connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_used_at TIMESTAMP WITH TIME ZONE,
      UNIQUE (user_id, provider)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_music_connections_user ON user_music_connections(user_id)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_music_connections_provider ON user_music_connections(provider)
  `);

  // ============================================
  // 5. Custom Sound Packs Table
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS user_sound_packs (
      id TEXT PRIMARY KEY DEFAULT 'sound_' || replace(gen_random_uuid()::text, '-', ''),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      sounds JSONB NOT NULL DEFAULT '{}',
      is_default BOOLEAN DEFAULT false,
      is_public BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_sound_packs_user ON user_sound_packs(user_id)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_sound_packs_public ON user_sound_packs(is_public) WHERE is_public = true
  `);

  // ============================================
  // 6. Device-Specific Settings Table
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS user_device_settings (
      id TEXT PRIMARY KEY DEFAULT 'device_' || replace(gen_random_uuid()::text, '-', ''),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_id TEXT NOT NULL,
      device_name TEXT,
      platform TEXT NOT NULL,
      device_model TEXT,
      os_version TEXT,
      app_version TEXT,
      settings_override JSONB DEFAULT '{}',
      sync_enabled BOOLEAN DEFAULT true,
      last_sync_at TIMESTAMP WITH TIME ZONE,
      push_token TEXT,
      push_enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE (user_id, device_id)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_device_settings_user ON user_device_settings(user_id)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_device_settings_platform ON user_device_settings(platform)
  `);

  // ============================================
  // 7. Hydration Log Table
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS user_hydration_logs (
      id TEXT PRIMARY KEY DEFAULT 'hydration_' || replace(gen_random_uuid()::text, '-', ''),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_oz DECIMAL(6, 2) NOT NULL,
      workout_session_id TEXT,
      source TEXT DEFAULT 'manual',
      logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_hydration_logs_user ON user_hydration_logs(user_id)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_hydration_logs_date ON user_hydration_logs(user_id, logged_at)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_hydration_logs_daily ON user_hydration_logs(user_id, (logged_at::date))
  `);

  // ============================================
  // 8. System Sound Packs (Pre-built)
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS system_sound_packs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      sounds JSONB NOT NULL,
      is_premium BOOLEAN DEFAULT false,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Seed default system sound packs
  await query(`
    INSERT INTO system_sound_packs (id, name, description, category, sounds, is_premium, sort_order)
    VALUES
      ('default', 'Default', 'Clean, professional sounds', 'minimal', $1::jsonb, false, 0),
      ('energetic', 'Energetic', 'High-energy sounds to pump you up', 'energetic', $2::jsonb, false, 1),
      ('calm', 'Calm', 'Soft, relaxing tones for yoga and stretching', 'calm', $3::jsonb, false, 2),
      ('gaming', 'Gaming', 'Retro gaming-inspired sound effects', 'gaming', $4::jsonb, true, 3),
      ('military', 'Military', 'Tactical sounds for serious training', 'military', $5::jsonb, true, 4)
    ON CONFLICT (id) DO NOTHING
  `, [
    JSON.stringify({
      timer_complete: '/sounds/default/timer-complete.mp3',
      timer_warning: '/sounds/default/timer-warning.mp3',
      set_complete: '/sounds/default/set-complete.mp3',
      workout_complete: '/sounds/default/workout-complete.mp3',
      achievement: '/sounds/default/achievement.mp3',
      metronome_tick: '/sounds/default/metronome-tick.mp3',
      metronome_accent: '/sounds/default/metronome-accent.mp3',
      hydration_reminder: '/sounds/default/hydration.mp3',
    }),
    JSON.stringify({
      timer_complete: '/sounds/energetic/timer-complete.mp3',
      timer_warning: '/sounds/energetic/timer-warning.mp3',
      set_complete: '/sounds/energetic/set-complete.mp3',
      workout_complete: '/sounds/energetic/workout-complete.mp3',
      achievement: '/sounds/energetic/achievement.mp3',
      metronome_tick: '/sounds/energetic/metronome-tick.mp3',
      metronome_accent: '/sounds/energetic/metronome-accent.mp3',
      hydration_reminder: '/sounds/energetic/hydration.mp3',
    }),
    JSON.stringify({
      timer_complete: '/sounds/calm/timer-complete.mp3',
      timer_warning: '/sounds/calm/timer-warning.mp3',
      set_complete: '/sounds/calm/set-complete.mp3',
      workout_complete: '/sounds/calm/workout-complete.mp3',
      achievement: '/sounds/calm/achievement.mp3',
      metronome_tick: '/sounds/calm/metronome-tick.mp3',
      metronome_accent: '/sounds/calm/metronome-accent.mp3',
      hydration_reminder: '/sounds/calm/hydration.mp3',
    }),
    JSON.stringify({
      timer_complete: '/sounds/gaming/timer-complete.mp3',
      timer_warning: '/sounds/gaming/timer-warning.mp3',
      set_complete: '/sounds/gaming/set-complete.mp3',
      workout_complete: '/sounds/gaming/workout-complete.mp3',
      achievement: '/sounds/gaming/achievement.mp3',
      metronome_tick: '/sounds/gaming/metronome-tick.mp3',
      metronome_accent: '/sounds/gaming/metronome-accent.mp3',
      hydration_reminder: '/sounds/gaming/hydration.mp3',
    }),
    JSON.stringify({
      timer_complete: '/sounds/military/timer-complete.mp3',
      timer_warning: '/sounds/military/timer-warning.mp3',
      set_complete: '/sounds/military/set-complete.mp3',
      workout_complete: '/sounds/military/workout-complete.mp3',
      achievement: '/sounds/military/achievement.mp3',
      metronome_tick: '/sounds/military/metronome-tick.mp3',
      metronome_accent: '/sounds/military/metronome-accent.mp3',
      hydration_reminder: '/sounds/military/hydration.mp3',
    }),
  ]);

  // ============================================
  // 9. Widget Registry Table (System-defined widgets)
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS dashboard_widget_registry (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      default_width INTEGER DEFAULT 2,
      default_height INTEGER DEFAULT 1,
      min_width INTEGER DEFAULT 1,
      min_height INTEGER DEFAULT 1,
      max_width INTEGER DEFAULT 4,
      max_height INTEGER DEFAULT 3,
      is_premium BOOLEAN DEFAULT false,
      is_enabled BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      component_path TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Seed widget registry
  await query(`
    INSERT INTO dashboard_widget_registry (id, name, description, category, default_width, default_height, sort_order)
    VALUES
      ('current_path', 'Current Path', 'Your current archetype and level', 'core', 2, 1, 0),
      ('stats', 'Character Stats', 'STR, CON, DEX, PWR, END, VIT', 'core', 1, 2, 1),
      ('quick_actions', 'Quick Actions', 'Start workout, journey, exercises', 'core', 3, 1, 2),
      ('xp_progress', 'XP Progress', 'Level progress and XP bar', 'gamification', 1, 1, 3),
      ('daily_quests', 'Daily Quests', 'Daily challenges and rewards', 'gamification', 1, 1, 4),
      ('insights', 'Smart Insights', 'AI-powered training insights', 'core', 3, 1, 5),
      ('daily_challenges', 'Daily Challenges', 'Challenge completion tracking', 'gamification', 2, 1, 6),
      ('todays_workout', 'Today''s Workout', 'Scheduled workout summary', 'core', 1, 1, 7),
      ('weekly_progress', 'Weekly Progress', 'Week at a glance', 'core', 1, 1, 8),
      ('nutrition', 'Nutrition', 'Macro and calorie tracking', 'health', 2, 1, 9),
      ('muscle_map', 'Muscle Activation', '2D body muscle visualization', 'visualization', 2, 2, 10),
      ('daily_tip', 'Daily Tip', 'Training tips and advice', 'core', 2, 1, 11),
      ('milestones', 'Milestones', 'Progress toward milestones', 'gamification', 2, 1, 12),
      ('adventure_map', 'Adventure Map', 'RPG-style site navigation', 'gamification', 2, 2, 13),
      ('activity', 'Recent Activity', 'Recent workouts and achievements', 'social', 2, 2, 14),
      ('hydration', 'Hydration Tracker', 'Daily water intake', 'health', 1, 1, 15),
      ('music_player', 'Music Player', 'Control music playback', 'media', 2, 1, 16),
      ('coach_tips', 'Coach Tips', 'Tips from Max the coach', 'core', 2, 1, 17),
      ('feature_discovery', 'Feature Discovery', 'Discover new features', 'core', 2, 1, 18)
    ON CONFLICT (id) DO NOTHING
  `);

  // ============================================
  // 10. Migration Trigger for updated_at
  // ============================================
  await query(`
    CREATE OR REPLACE FUNCTION update_preferences_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await query(`
    CREATE TRIGGER trigger_user_preferences_updated_at
      BEFORE UPDATE ON user_preferences
      FOR EACH ROW
      EXECUTE FUNCTION update_preferences_updated_at()
  `);

  await query(`
    CREATE TRIGGER trigger_user_profiles_updated_at
      BEFORE UPDATE ON user_preference_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_preferences_updated_at()
  `);

  await query(`
    CREATE TRIGGER trigger_dashboard_layouts_updated_at
      BEFORE UPDATE ON user_dashboard_layouts
      FOR EACH ROW
      EXECUTE FUNCTION update_preferences_updated_at()
  `);

  await query(`
    CREATE TRIGGER trigger_device_settings_updated_at
      BEFORE UPDATE ON user_device_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_preferences_updated_at()
  `);

  log.info('Migration 131 complete: User Preferences System created');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration 131: User Preferences System');

  // Drop triggers first
  await query(`DROP TRIGGER IF EXISTS trigger_user_preferences_updated_at ON user_preferences`);
  await query(`DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON user_preference_profiles`);
  await query(`DROP TRIGGER IF EXISTS trigger_dashboard_layouts_updated_at ON user_dashboard_layouts`);
  await query(`DROP TRIGGER IF EXISTS trigger_device_settings_updated_at ON user_device_settings`);
  await query(`DROP FUNCTION IF EXISTS update_preferences_updated_at()`);

  // Drop tables in reverse order of creation (respecting foreign keys)
  await query(`DROP TABLE IF EXISTS dashboard_widget_registry CASCADE`);
  await query(`DROP TABLE IF EXISTS system_sound_packs CASCADE`);
  await query(`DROP TABLE IF EXISTS user_hydration_logs CASCADE`);
  await query(`DROP TABLE IF EXISTS user_device_settings CASCADE`);
  await query(`DROP TABLE IF EXISTS user_sound_packs CASCADE`);
  await query(`DROP TABLE IF EXISTS user_music_connections CASCADE`);
  await query(`DROP TABLE IF EXISTS user_dashboard_layouts CASCADE`);
  await query(`DROP TABLE IF EXISTS user_preference_profiles CASCADE`);
  await query(`DROP TABLE IF EXISTS user_preferences CASCADE`);

  log.info('Migration 131 rolled back');
}
