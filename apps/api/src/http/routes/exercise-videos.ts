/**
 * Exercise Videos Routes
 *
 * API endpoints for exercise video demonstrations:
 * - GET /exercises/:id/videos - Get all videos for an exercise
 * - GET /exercises/:id/videos/:videoId - Get specific video details
 * - POST /exercises/:id/videos - Add a video (admin only)
 * - PATCH /exercises/:id/videos/:videoId - Update video (admin only)
 * - DELETE /exercises/:id/videos/:videoId - Remove video (admin only)
 * - POST /videos/:videoId/watch - Track video watch progress
 * - POST /videos/:videoId/favorite - Toggle video favorite
 */

import { FastifyInstance } from 'fastify';
import { authenticate, optionalAuth, requireRole } from './auth';
import { queryAll, queryOne, db } from '../../db/client';
import { loggers } from '../../lib/logger';
import { randomUUID } from 'crypto';

const log = loggers.http;

// Types
interface ExerciseVideo {
  id: string;
  exercise_id: string;
  video_url: string;
  video_type: string;
  view_angle: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  file_size_bytes: number | null;
  hls_url: string | null;
  dash_url: string | null;
  quality_variants: any;
  title: string | null;
  description: string | null;
  language: string;
  has_audio: boolean;
  has_captions: boolean;
  captions_url: string | null;
  source: string | null;
  license: string | null;
  attribution: string | null;
  is_primary: boolean;
  is_active: boolean;
  processing_status: string;
  created_at: Date;
  updated_at: Date;
}

interface VideoWatchHistory {
  id: string;
  user_id: string;
  video_id: string;
  watch_duration_seconds: number;
  completed: boolean;
  watched_at: Date;
}

// Validation schemas
const VideoTypes = ['demonstration', 'common_mistakes', 'cues', 'slow_motion', 'warmup', 'regression', 'progression'] as const;
const ViewAngles = ['front', 'side', 'back', 'detail', 'overhead'] as const;
const _ProcessingStatuses = ['pending', 'processing', 'ready', 'failed'] as const;

/**
 * Register exercise video routes
 */
export async function registerExerciseVideosRoutes(app: FastifyInstance) {
  /**
   * GET /exercises/:id/videos
   * Get all videos for an exercise
   */
  app.get('/exercises/:id/videos', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as {
      type?: string;
      angle?: string;
      active_only?: string;
    };

    // Verify exercise exists
    const exercise = await queryOne<{ id: string; name: string }>(
      'SELECT id, name FROM exercises WHERE id = $1',
      [id]
    );

    if (!exercise) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Exercise not found', statusCode: 404 },
      });
    }

    // Build query
    let sql = `
      SELECT * FROM exercise_videos
      WHERE exercise_id = $1
    `;
    const params: any[] = [id];
    let paramIndex = 2;

    // Filter by type
    if (query.type && VideoTypes.includes(query.type as any)) {
      sql += ` AND video_type = $${paramIndex}`;
      params.push(query.type);
      paramIndex++;
    }

    // Filter by angle
    if (query.angle && ViewAngles.includes(query.angle as any)) {
      sql += ` AND view_angle = $${paramIndex}`;
      params.push(query.angle);
      paramIndex++;
    }

    // Active only (default true)
    if (query.active_only !== 'false') {
      sql += ` AND is_active = true`;
    }

    sql += ` ORDER BY is_primary DESC, view_angle ASC, video_type ASC`;

    const videos = await queryAll<ExerciseVideo>(sql, params);

    // Transform response
    const transformedVideos = videos.map((v) => ({
      id: v.id,
      exerciseId: v.exercise_id,
      videoUrl: v.video_url,
      videoType: v.video_type,
      viewAngle: v.view_angle,
      thumbnailUrl: v.thumbnail_url,
      durationSeconds: v.duration_seconds,
      width: v.width,
      height: v.height,
      fileSizeBytes: v.file_size_bytes,
      hlsUrl: v.hls_url,
      dashUrl: v.dash_url,
      qualityVariants: v.quality_variants || [],
      title: v.title,
      description: v.description,
      language: v.language,
      hasAudio: v.has_audio,
      hasCaptions: v.has_captions,
      captionsUrl: v.captions_url,
      source: v.source,
      license: v.license,
      attribution: v.attribution,
      isPrimary: v.is_primary,
      isActive: v.is_active,
      processingStatus: v.processing_status,
      createdAt: v.created_at,
      updatedAt: v.updated_at,
    }));

    return reply.send({
      data: {
        exerciseId: id,
        exerciseName: exercise.name,
        videos: transformedVideos,
        primaryVideo: transformedVideos.find((v) => v.isPrimary) || transformedVideos[0] || null,
      },
    });
  });

  /**
   * GET /exercises/:id/videos/:videoId
   * Get specific video details
   */
  app.get('/exercises/:id/videos/:videoId', { preHandler: optionalAuth }, async (request, reply) => {
    const { id, videoId } = request.params as { id: string; videoId: string };

    const video = await queryOne<ExerciseVideo>(
      'SELECT * FROM exercise_videos WHERE id = $1 AND exercise_id = $2',
      [videoId, id]
    );

    if (!video) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Video not found', statusCode: 404 },
      });
    }

    return reply.send({
      data: {
        id: video.id,
        exerciseId: video.exercise_id,
        videoUrl: video.video_url,
        videoType: video.video_type,
        viewAngle: video.view_angle,
        thumbnailUrl: video.thumbnail_url,
        durationSeconds: video.duration_seconds,
        width: video.width,
        height: video.height,
        fileSizeBytes: video.file_size_bytes,
        hlsUrl: video.hls_url,
        dashUrl: video.dash_url,
        qualityVariants: video.quality_variants || [],
        title: video.title,
        description: video.description,
        language: video.language,
        hasAudio: video.has_audio,
        hasCaptions: video.has_captions,
        captionsUrl: video.captions_url,
        source: video.source,
        license: video.license,
        attribution: video.attribution,
        isPrimary: video.is_primary,
        isActive: video.is_active,
        processingStatus: video.processing_status,
        createdAt: video.created_at,
        updatedAt: video.updated_at,
      },
    });
  });

  /**
   * POST /exercises/:id/videos
   * Add a video to an exercise (admin only)
   */
  app.post('/exercises/:id/videos', {
    preHandler: [authenticate, requireRole('admin')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      videoUrl: string;
      videoType?: string;
      viewAngle?: string;
      thumbnailUrl?: string;
      durationSeconds?: number;
      width?: number;
      height?: number;
      fileSizeBytes?: number;
      hlsUrl?: string;
      dashUrl?: string;
      qualityVariants?: any[];
      title?: string;
      description?: string;
      language?: string;
      hasAudio?: boolean;
      hasCaptions?: boolean;
      captionsUrl?: string;
      source?: string;
      license?: string;
      attribution?: string;
      isPrimary?: boolean;
    };

    // Verify exercise exists
    const exercise = await queryOne<{ id: string }>(
      'SELECT id FROM exercises WHERE id = $1',
      [id]
    );

    if (!exercise) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Exercise not found', statusCode: 404 },
      });
    }

    // Validate required fields
    if (!body.videoUrl) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'videoUrl is required', statusCode: 400 },
      });
    }

    // Validate enums
    const videoType = body.videoType || 'demonstration';
    const viewAngle = body.viewAngle || 'front';

    if (!VideoTypes.includes(videoType as any)) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: `Invalid videoType. Must be one of: ${VideoTypes.join(', ')}`,
          statusCode: 400,
        },
      });
    }

    if (!ViewAngles.includes(viewAngle as any)) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: `Invalid viewAngle. Must be one of: ${ViewAngles.join(', ')}`,
          statusCode: 400,
        },
      });
    }

    const videoId = randomUUID();

    // If setting as primary, unset other primaries for this exercise
    if (body.isPrimary) {
      await db.query(
        'UPDATE exercise_videos SET is_primary = false WHERE exercise_id = $1',
        [id]
      );
    }

    await db.query(`
      INSERT INTO exercise_videos (
        id, exercise_id, video_url, video_type, view_angle,
        thumbnail_url, duration_seconds, width, height, file_size_bytes,
        hls_url, dash_url, quality_variants,
        title, description, language,
        has_audio, has_captions, captions_url,
        source, license, attribution, is_primary
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13,
        $14, $15, $16,
        $17, $18, $19,
        $20, $21, $22, $23
      )
    `, [
      videoId, id, body.videoUrl, videoType, viewAngle,
      body.thumbnailUrl || null, body.durationSeconds || null, body.width || null, body.height || null, body.fileSizeBytes || null,
      body.hlsUrl || null, body.dashUrl || null, JSON.stringify(body.qualityVariants || []),
      body.title || null, body.description || null, body.language || 'en',
      body.hasAudio || false, body.hasCaptions || false, body.captionsUrl || null,
      body.source || null, body.license || null, body.attribution || null, body.isPrimary || false,
    ]);

    // Update exercise has_video flag
    await db.query(`
      UPDATE exercises SET
        has_video = true,
        video_url = COALESCE(video_url, $2),
        video_thumbnail_url = COALESCE(video_thumbnail_url, $3),
        video_duration_seconds = COALESCE(video_duration_seconds, $4)
      WHERE id = $1
    `, [id, body.videoUrl, body.thumbnailUrl, body.durationSeconds]);

    log.info({ exerciseId: id, videoId }, 'Video added to exercise');

    return reply.status(201).send({
      data: { id: videoId, exerciseId: id, videoUrl: body.videoUrl },
    });
  });

  /**
   * PATCH /exercises/:id/videos/:videoId
   * Update a video (admin only)
   */
  app.patch('/exercises/:id/videos/:videoId', {
    preHandler: [authenticate, requireRole('admin')],
  }, async (request, reply) => {
    const { id, videoId } = request.params as { id: string; videoId: string };
    const body = request.body as Record<string, any>;

    // Verify video exists
    const video = await queryOne<ExerciseVideo>(
      'SELECT * FROM exercise_videos WHERE id = $1 AND exercise_id = $2',
      [videoId, id]
    );

    if (!video) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Video not found', statusCode: 404 },
      });
    }

    // Build update query
    const allowedFields = [
      'video_url', 'video_type', 'view_angle',
      'thumbnail_url', 'duration_seconds', 'width', 'height', 'file_size_bytes',
      'hls_url', 'dash_url', 'quality_variants',
      'title', 'description', 'language',
      'has_audio', 'has_captions', 'captions_url',
      'source', 'license', 'attribution',
      'is_primary', 'is_active', 'processing_status',
    ];

    const fieldMapping: Record<string, string> = {
      videoUrl: 'video_url',
      videoType: 'video_type',
      viewAngle: 'view_angle',
      thumbnailUrl: 'thumbnail_url',
      durationSeconds: 'duration_seconds',
      fileSizeBytes: 'file_size_bytes',
      hlsUrl: 'hls_url',
      dashUrl: 'dash_url',
      qualityVariants: 'quality_variants',
      hasAudio: 'has_audio',
      hasCaptions: 'has_captions',
      captionsUrl: 'captions_url',
      isPrimary: 'is_primary',
      isActive: 'is_active',
      processingStatus: 'processing_status',
    };

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(body)) {
      const dbField = fieldMapping[key] || key;
      if (allowedFields.includes(dbField) && value !== undefined) {
        updates.push(`${dbField} = $${paramIndex}`);
        values.push(dbField === 'quality_variants' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'No valid fields to update', statusCode: 400 },
      });
    }

    // If setting as primary, unset other primaries
    if (body.isPrimary) {
      await db.query(
        'UPDATE exercise_videos SET is_primary = false WHERE exercise_id = $1 AND id != $2',
        [id, videoId]
      );
    }

    updates.push('updated_at = NOW()');
    values.push(videoId);

    await db.query(
      `UPDATE exercise_videos SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    log.info({ exerciseId: id, videoId }, 'Video updated');

    return reply.send({ data: { id: videoId, updated: true } });
  });

  /**
   * DELETE /exercises/:id/videos/:videoId
   * Remove a video (admin only)
   */
  app.delete('/exercises/:id/videos/:videoId', {
    preHandler: [authenticate, requireRole('admin')],
  }, async (request, reply) => {
    const { id, videoId } = request.params as { id: string; videoId: string };

    const result = await db.query(
      'DELETE FROM exercise_videos WHERE id = $1 AND exercise_id = $2 RETURNING id',
      [videoId, id]
    );

    if (result.rowCount === 0) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Video not found', statusCode: 404 },
      });
    }

    // Check if exercise still has videos
    const remainingVideos = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM exercise_videos WHERE exercise_id = $1',
      [id]
    );

    if (parseInt(remainingVideos?.count || '0') === 0) {
      await db.query(
        'UPDATE exercises SET has_video = false, video_url = NULL, video_thumbnail_url = NULL, video_duration_seconds = NULL WHERE id = $1',
        [id]
      );
    }

    log.info({ exerciseId: id, videoId }, 'Video deleted');

    return reply.status(204).send();
  });

  /**
   * POST /videos/:videoId/watch
   * Track video watch progress
   */
  app.post('/videos/:videoId/watch', { preHandler: authenticate }, async (request, reply) => {
    const { videoId } = request.params as { videoId: string };
    const userId = request.user!.userId;
    const body = request.body as {
      watchDurationSeconds?: number;
      completed?: boolean;
    };

    // Verify video exists
    const video = await queryOne<{ id: string }>(
      'SELECT id FROM exercise_videos WHERE id = $1',
      [videoId]
    );

    if (!video) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Video not found', statusCode: 404 },
      });
    }

    // Upsert watch history
    await db.query(`
      INSERT INTO video_watch_history (id, user_id, video_id, watch_duration_seconds, completed, watched_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (user_id, video_id) DO UPDATE SET
        watch_duration_seconds = GREATEST(video_watch_history.watch_duration_seconds, EXCLUDED.watch_duration_seconds),
        completed = video_watch_history.completed OR EXCLUDED.completed,
        watched_at = NOW()
    `, [
      randomUUID(),
      userId,
      videoId,
      body.watchDurationSeconds || 0,
      body.completed || false,
    ]);

    return reply.send({ data: { tracked: true } });
  });

  /**
   * POST /videos/:videoId/favorite
   * Toggle video favorite status
   */
  app.post('/videos/:videoId/favorite', { preHandler: authenticate }, async (request, reply) => {
    const { videoId } = request.params as { videoId: string };
    const userId = request.user!.userId;

    // Verify video exists
    const video = await queryOne<{ id: string }>(
      'SELECT id FROM exercise_videos WHERE id = $1',
      [videoId]
    );

    if (!video) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Video not found', statusCode: 404 },
      });
    }

    // Check if already favorited
    const existing = await queryOne<{ user_id: string }>(
      'SELECT user_id FROM video_favorites WHERE user_id = $1 AND video_id = $2',
      [userId, videoId]
    );

    if (existing) {
      // Remove favorite
      await db.query(
        'DELETE FROM video_favorites WHERE user_id = $1 AND video_id = $2',
        [userId, videoId]
      );
      return reply.send({ data: { favorited: false } });
    } else {
      // Add favorite
      await db.query(
        'INSERT INTO video_favorites (user_id, video_id) VALUES ($1, $2)',
        [userId, videoId]
      );
      return reply.send({ data: { favorited: true } });
    }
  });

  /**
   * GET /me/video-favorites
   * Get user's favorited videos
   */
  app.get('/me/video-favorites', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const favorites = await queryAll<ExerciseVideo & { exercise_name: string }>(
      `SELECT ev.*, e.name as exercise_name
       FROM video_favorites vf
       JOIN exercise_videos ev ON vf.video_id = ev.id
       JOIN exercises e ON ev.exercise_id = e.id
       WHERE vf.user_id = $1
       ORDER BY vf.created_at DESC`,
      [userId]
    );

    return reply.send({
      data: favorites.map((v) => ({
        id: v.id,
        exerciseId: v.exercise_id,
        exerciseName: v.exercise_name,
        videoUrl: v.video_url,
        videoType: v.video_type,
        viewAngle: v.view_angle,
        thumbnailUrl: v.thumbnail_url,
        durationSeconds: v.duration_seconds,
        title: v.title,
      })),
    });
  });

  /**
   * GET /me/video-history
   * Get user's video watch history
   */
  app.get('/me/video-history', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const query = request.query as { limit?: string };
    const limit = Math.min(parseInt(query.limit || '50'), 100);

    const history = await queryAll<ExerciseVideo & VideoWatchHistory & { exercise_name: string }>(
      `SELECT ev.*, vwh.watch_duration_seconds, vwh.completed, vwh.watched_at, e.name as exercise_name
       FROM video_watch_history vwh
       JOIN exercise_videos ev ON vwh.video_id = ev.id
       JOIN exercises e ON ev.exercise_id = e.id
       WHERE vwh.user_id = $1
       ORDER BY vwh.watched_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return reply.send({
      data: history.map((v) => ({
        id: v.id,
        exerciseId: v.exercise_id,
        exerciseName: v.exercise_name,
        videoUrl: v.video_url,
        videoType: v.video_type,
        viewAngle: v.view_angle,
        thumbnailUrl: v.thumbnail_url,
        durationSeconds: v.duration_seconds,
        title: v.title,
        watchDurationSeconds: v.watch_duration_seconds,
        completed: v.completed,
        watchedAt: v.watched_at,
      })),
    });
  });

  log.info('Exercise videos routes registered');
}
