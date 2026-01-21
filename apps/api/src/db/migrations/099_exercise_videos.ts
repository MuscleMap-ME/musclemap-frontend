// DESTRUCTIVE: Schema modification for exercise videos - contains DROP/TRUNCATE operations
// SQL-SAFE: Template literals contain static SQL only, no external input
/**
 * Migration: Exercise Videos System
 *
 * Creates infrastructure for exercise video demonstrations:
 * - exercise_videos table for multiple video angles (front, side, back, detail)
 * - Video types: demonstration, common_mistakes, cues, slow_motion
 * - Support for adaptive streaming (HLS) preparation
 * - Thumbnail and duration tracking
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

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 097_exercise_videos');

  // ============================================
  // EXERCISE VIDEOS TABLE
  // ============================================
  if (!(await tableExists('exercise_videos'))) {
    log.info('Creating exercise_videos table...');
    await db.query(`
      CREATE TABLE exercise_videos (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,

        -- Video metadata
        video_url TEXT NOT NULL,
        video_type TEXT NOT NULL DEFAULT 'demonstration',
        view_angle TEXT NOT NULL DEFAULT 'front',

        -- Technical specs
        thumbnail_url TEXT,
        duration_seconds INTEGER,
        width INTEGER,
        height INTEGER,
        file_size_bytes BIGINT,

        -- Streaming support
        hls_url TEXT,
        dash_url TEXT,

        -- Quality variants (stored as JSON array)
        quality_variants JSONB DEFAULT '[]',

        -- Content metadata
        title TEXT,
        description TEXT,
        language TEXT DEFAULT 'en',
        has_audio BOOLEAN DEFAULT false,
        has_captions BOOLEAN DEFAULT false,
        captions_url TEXT,

        -- Source tracking
        source TEXT,
        license TEXT,
        attribution TEXT,

        -- Status
        is_primary BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        processing_status TEXT DEFAULT 'ready',

        -- Timestamps
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for efficient queries
    await db.query(`CREATE INDEX idx_exercise_videos_exercise ON exercise_videos(exercise_id)`);
    await db.query(`CREATE INDEX idx_exercise_videos_type ON exercise_videos(video_type)`);
    await db.query(`CREATE INDEX idx_exercise_videos_angle ON exercise_videos(view_angle)`);
    await db.query(`CREATE INDEX idx_exercise_videos_primary ON exercise_videos(exercise_id, is_primary) WHERE is_primary = true`);
    await db.query(`CREATE INDEX idx_exercise_videos_active ON exercise_videos(exercise_id, is_active) WHERE is_active = true`);

    log.info('Created exercise_videos table with indexes');
  }

  // ============================================
  // ADD VIDEO FIELDS TO EXERCISES TABLE
  // ============================================

  // Primary video thumbnail for quick display
  if (!(await columnExists('exercises', 'video_thumbnail_url'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN video_thumbnail_url TEXT`);
    log.info('Added video_thumbnail_url to exercises');
  }

  // Primary video duration for display
  if (!(await columnExists('exercises', 'video_duration_seconds'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN video_duration_seconds INTEGER`);
    log.info('Added video_duration_seconds to exercises');
  }

  // Flag to indicate if exercise has video content
  if (!(await columnExists('exercises', 'has_video'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN has_video BOOLEAN DEFAULT false`);
    log.info('Added has_video flag to exercises');
  }

  // ============================================
  // VIDEO WATCH HISTORY (for offline caching priority)
  // ============================================
  if (!(await tableExists('video_watch_history'))) {
    log.info('Creating video_watch_history table...');
    await db.query(`
      CREATE TABLE video_watch_history (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        video_id TEXT NOT NULL REFERENCES exercise_videos(id) ON DELETE CASCADE,
        watch_duration_seconds INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT false,
        watched_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, video_id)
      )
    `);

    await db.query(`CREATE INDEX idx_video_watch_user ON video_watch_history(user_id)`);
    await db.query(`CREATE INDEX idx_video_watch_video ON video_watch_history(video_id)`);
    log.info('Created video_watch_history table');
  }

  // ============================================
  // VIDEO FAVORITES (for offline download priority)
  // ============================================
  if (!(await tableExists('video_favorites'))) {
    log.info('Creating video_favorites table...');
    await db.query(`
      CREATE TABLE video_favorites (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        video_id TEXT NOT NULL REFERENCES exercise_videos(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY(user_id, video_id)
      )
    `);

    await db.query(`CREATE INDEX idx_video_favorites_user ON video_favorites(user_id)`);
    log.info('Created video_favorites table');
  }

  // ============================================
  // SEED PLACEHOLDER VIDEO DATA
  // ============================================
  log.info('Seeding placeholder video data for common exercises...');

  // Define placeholder videos for popular exercises
  // Using placeholder URLs that can be replaced with real video content
  const placeholderVideos = [
    // Bodyweight exercises
    { exerciseId: 'bw-pushup', name: 'Push-Up', angles: ['front', 'side'] },
    { exerciseId: 'bw-pullup', name: 'Pull-Up', angles: ['front', 'side', 'back'] },
    { exerciseId: 'bw-squat', name: 'Bodyweight Squat', angles: ['front', 'side'] },
    { exerciseId: 'bw-dip', name: 'Dip', angles: ['front', 'side'] },
    { exerciseId: 'bw-plank', name: 'Plank', angles: ['side'] },
    { exerciseId: 'bw-lunge', name: 'Lunge', angles: ['front', 'side'] },

    // Freeweight exercises
    { exerciseId: 'fw-bench-press', name: 'Bench Press', angles: ['front', 'side', 'detail'] },
    { exerciseId: 'fw-squat', name: 'Barbell Squat', angles: ['front', 'side', 'back'] },
    { exerciseId: 'fw-deadlift', name: 'Deadlift', angles: ['front', 'side'] },
    { exerciseId: 'fw-ohp', name: 'Overhead Press', angles: ['front', 'side'] },
    { exerciseId: 'fw-barbell-row', name: 'Barbell Row', angles: ['side', 'back'] },
    { exerciseId: 'fw-barbell-curl', name: 'Barbell Curl', angles: ['front', 'side'] },

    // Kettlebell exercises
    { exerciseId: 'kb-swing', name: 'Kettlebell Swing', angles: ['front', 'side'] },
    { exerciseId: 'kb-goblet-squat', name: 'Goblet Squat', angles: ['front', 'side'] },
    { exerciseId: 'kb-turkish-getup', name: 'Turkish Get-Up', angles: ['front', 'side'] },
  ];

  for (const exercise of placeholderVideos) {
    // Check if exercise exists
    const exists = await db.queryOne<{ id: string }>(
      'SELECT id FROM exercises WHERE id = $1',
      [exercise.exerciseId]
    );

    if (!exists) {
      log.debug(`Skipping video seed for non-existent exercise: ${exercise.exerciseId}`);
      continue;
    }

    // Create videos for each angle
    for (const angle of exercise.angles) {
      // Check if video already exists for this exercise/angle combination
      const existingVideo = await db.queryOne<{ id: string }>(
        `SELECT id FROM exercise_videos
         WHERE exercise_id = $1 AND view_angle = $2 AND video_type = 'demonstration'`,
        [exercise.exerciseId, angle]
      );

      if (existingVideo) continue;

      // Insert placeholder video
      // URL format designed to be replaced with real CDN URLs later
      const placeholderUrl = `https://videos.musclemap.me/exercises/${exercise.exerciseId}/${angle}/demonstration.mp4`;
      const thumbnailUrl = `https://videos.musclemap.me/exercises/${exercise.exerciseId}/${angle}/thumbnail.jpg`;

      await db.query(`
        INSERT INTO exercise_videos (
          exercise_id, video_url, video_type, view_angle,
          thumbnail_url, duration_seconds, is_primary, is_active,
          title, source, processing_status
        ) VALUES (
          $1, $2, 'demonstration', $3,
          $4, $5, $6, true,
          $7, 'placeholder', 'pending'
        )
        ON CONFLICT DO NOTHING
      `, [
        exercise.exerciseId,
        placeholderUrl,
        angle,
        thumbnailUrl,
        30, // Default 30 second duration
        angle === 'front', // Front view is primary
        `${exercise.name} - ${angle.charAt(0).toUpperCase() + angle.slice(1)} View`
      ]);
    }

    // Update exercise to indicate it has video content
    await db.query(`
      UPDATE exercises SET
        has_video = true,
        video_url = $2,
        video_thumbnail_url = $3,
        video_duration_seconds = 30
      WHERE id = $1
    `, [
      exercise.exerciseId,
      `https://videos.musclemap.me/exercises/${exercise.exerciseId}/front/demonstration.mp4`,
      `https://videos.musclemap.me/exercises/${exercise.exerciseId}/front/thumbnail.jpg`
    ]);
  }

  log.info('Migration 097_exercise_videos completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 097_exercise_videos');

  // Drop tables in reverse order (respecting foreign keys)
  await db.query('DROP TABLE IF EXISTS video_favorites');
  await db.query('DROP TABLE IF EXISTS video_watch_history');
  await db.query('DROP TABLE IF EXISTS exercise_videos');

  // Remove columns from exercises table
  await db.query('ALTER TABLE exercises DROP COLUMN IF EXISTS video_thumbnail_url');
  await db.query('ALTER TABLE exercises DROP COLUMN IF EXISTS video_duration_seconds');
  await db.query('ALTER TABLE exercises DROP COLUMN IF EXISTS has_video');

  log.info('Migration 097_exercise_videos rolled back');
}
