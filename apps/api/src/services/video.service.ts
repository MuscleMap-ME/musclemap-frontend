/**
 * Video Service
 *
 * Manages video assets, processing, and demo videos:
 * - Upload handling
 * - Processing queue with BullMQ
 * - Content-based deduplication
 * - Multi-resolution transcoding
 */

import crypto from 'crypto';
import { queryOne, queryAll, query, serializableTransaction } from '../db/client';
import { getRedis, isRedisAvailable } from '../lib/redis';
import { loggers } from '../lib/logger';

const log = loggers.core;

// Video status codes
export enum VideoStatus {
  PENDING = 0,
  PROCESSING = 1,
  READY = 2,
  FAILED = 3,
  DELETED = 4,
}

// Moderation status codes
export enum ModerationStatus {
  PENDING = 0,
  APPROVED = 1,
  REJECTED = 2,
  FLAGGED = 3,
}

// Demo variant types
export enum DemoVariant {
  DEFAULT = 0,
  MALE = 1,
  FEMALE = 2,
}

interface VideoAsset {
  id: string;
  uploaderId?: string;
  storageKey: string;
  originalFilename?: string;
  fileSizeBytes?: number;
  durationMs?: number;
  width?: number;
  height?: number;
  status: VideoStatus;
  contentHash?: string;
  renditions: Record<string, { url: string; width: number; height: number; bitrate?: number }>;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateVideoRequest {
  uploaderId?: string;
  storageKey: string;
  originalFilename?: string;
  fileSizeBytes?: number;
}

interface ExerciseDemo {
  id: string;
  exerciseId: string;
  variant: DemoVariant;
  videoAssetId: string;
  isPrimary: boolean;
  displayOrder: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  durationMs?: number;
}

interface UserVideoClip {
  id: string;
  userId: string;
  videoAssetId: string;
  exerciseId?: string;
  hangoutId?: number;
  title?: string;
  description?: string;
  tags: string[];
  moderationStatus: ModerationStatus;
  viewCount: number;
  likeCount: number;
  createdAt: Date;
  updatedAt: Date;
  // Joined data
  videoUrl?: string;
  thumbnailUrl?: string;
  durationMs?: number;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

interface CreateClipRequest {
  userId: string;
  videoAssetId: string;
  exerciseId?: string;
  hangoutId?: number;
  title?: string;
  description?: string;
  tags?: string[];
}

export const videoService = {
  /**
   * Create a video asset record (before processing)
   */
  async createAsset(request: CreateVideoRequest): Promise<VideoAsset> {
    const { uploaderId, storageKey, originalFilename, fileSizeBytes } = request;

    const row = await queryOne<{
      id: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO video_assets (uploader_id, storage_key, original_filename, file_size_bytes)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at, updated_at`,
      [uploaderId, storageKey, originalFilename, fileSizeBytes]
    );

    log.info({ videoId: row!.id, storageKey }, 'Video asset created');

    return {
      id: row!.id,
      uploaderId,
      storageKey,
      originalFilename,
      fileSizeBytes,
      status: VideoStatus.PENDING,
      renditions: {},
      createdAt: row!.created_at,
      updatedAt: row!.updated_at,
    };
  },

  /**
   * Get video asset by ID
   */
  async getAsset(videoId: string): Promise<VideoAsset | null> {
    const row = await queryOne<{
      id: string;
      uploader_id: string | null;
      storage_key: string;
      original_filename: string | null;
      file_size_bytes: number | null;
      duration_ms: number | null;
      width: number | null;
      height: number | null;
      status: number;
      content_hash: Buffer | null;
      renditions: string;
      created_at: Date;
      updated_at: Date;
    }>('SELECT * FROM video_assets WHERE id = $1', [videoId]);

    if (!row) return null;

    return {
      id: row.id,
      uploaderId: row.uploader_id ?? undefined,
      storageKey: row.storage_key,
      originalFilename: row.original_filename ?? undefined,
      fileSizeBytes: row.file_size_bytes ?? undefined,
      durationMs: row.duration_ms ?? undefined,
      width: row.width ?? undefined,
      height: row.height ?? undefined,
      status: row.status as VideoStatus,
      contentHash: row.content_hash?.toString('hex'),
      renditions: JSON.parse(row.renditions || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  /**
   * Update video asset after processing
   */
  async updateAsset(
    videoId: string,
    update: {
      status?: VideoStatus;
      durationMs?: number;
      width?: number;
      height?: number;
      contentHash?: Buffer;
      renditions?: Record<string, unknown>;
      errorMessage?: string;
    }
  ): Promise<void> {
    const sets: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (update.status !== undefined) {
      sets.push(`status = $${paramIndex++}`);
      params.push(update.status);
    }

    if (update.durationMs !== undefined) {
      sets.push(`duration_ms = $${paramIndex++}`);
      params.push(update.durationMs);
    }

    if (update.width !== undefined) {
      sets.push(`width = $${paramIndex++}`);
      params.push(update.width);
    }

    if (update.height !== undefined) {
      sets.push(`height = $${paramIndex++}`);
      params.push(update.height);
    }

    if (update.contentHash !== undefined) {
      sets.push(`content_hash = $${paramIndex++}`);
      params.push(update.contentHash);
    }

    if (update.renditions !== undefined) {
      sets.push(`renditions = $${paramIndex++}`);
      params.push(JSON.stringify(update.renditions));
    }

    if (update.errorMessage !== undefined) {
      sets.push(`error_message = $${paramIndex++}`);
      params.push(update.errorMessage);
    }

    params.push(videoId);

    await query(`UPDATE video_assets SET ${sets.join(', ')} WHERE id = $${paramIndex}`, params);
  },

  /**
   * Check for duplicate video by content hash
   */
  async findDuplicate(contentHash: Buffer): Promise<VideoAsset | null> {
    const row = await queryOne<{
      id: string;
      uploader_id: string | null;
      storage_key: string;
      renditions: string;
      created_at: Date;
      updated_at: Date;
    }>(
      'SELECT id, uploader_id, storage_key, renditions, created_at, updated_at FROM video_assets WHERE content_hash = $1 AND status = $2',
      [contentHash, VideoStatus.READY]
    );

    if (!row) return null;

    return {
      id: row.id,
      uploaderId: row.uploader_id ?? undefined,
      storageKey: row.storage_key,
      status: VideoStatus.READY,
      renditions: JSON.parse(row.renditions || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  /**
   * Acquire processing lock for a video
   */
  async acquireProcessingLock(videoId: string, workerId: string): Promise<boolean> {
    const result = await query(
      `UPDATE video_assets
       SET status = $1, processing_locked_at = NOW(), processing_worker = $2
       WHERE id = $3 AND status = $4
         AND (processing_locked_at IS NULL OR processing_locked_at < NOW() - INTERVAL '10 minutes')
       RETURNING id`,
      [VideoStatus.PROCESSING, workerId, videoId, VideoStatus.PENDING]
    );

    return (result.rowCount ?? 0) > 0;
  },

  /**
   * Release processing lock
   */
  async releaseProcessingLock(videoId: string): Promise<void> {
    await query(
      'UPDATE video_assets SET processing_locked_at = NULL, processing_worker = NULL WHERE id = $1',
      [videoId]
    );
  },

  /**
   * Get pending videos for processing
   */
  async getPendingVideos(limit: number = 10): Promise<string[]> {
    const rows = await queryAll<{ id: string }>(
      `SELECT id FROM video_assets
       WHERE status = $1
         AND (processing_locked_at IS NULL OR processing_locked_at < NOW() - INTERVAL '10 minutes')
       ORDER BY created_at
       LIMIT $2`,
      [VideoStatus.PENDING, limit]
    );

    return rows.map((r) => r.id);
  },

  // ============================================
  // EXERCISE DEMOS
  // ============================================

  /**
   * Get demos for an exercise
   */
  async getExerciseDemos(
    exerciseId: string,
    options: { variant?: DemoVariant } = {}
  ): Promise<ExerciseDemo[]> {
    const { variant } = options;

    let sql = `
      SELECT
        ed.id, ed.exercise_id, ed.variant, ed.video_asset_id, ed.is_primary, ed.display_order,
        va.renditions, va.duration_ms
      FROM exercise_demos ed
      JOIN video_assets va ON va.id = ed.video_asset_id
      WHERE ed.exercise_id = $1 AND va.status = $2
    `;
    const params: unknown[] = [exerciseId, VideoStatus.READY];

    if (variant !== undefined) {
      sql += ' AND ed.variant = $3';
      params.push(variant);
    }

    sql += ' ORDER BY ed.is_primary DESC, ed.display_order';

    const rows = await queryAll<{
      id: string;
      exercise_id: string;
      variant: number;
      video_asset_id: string;
      is_primary: boolean;
      display_order: number;
      renditions: string;
      duration_ms: number | null;
    }>(sql, params);

    return rows.map((r) => {
      const renditions = JSON.parse(r.renditions || '{}');
      return {
        id: r.id,
        exerciseId: r.exercise_id,
        variant: r.variant as DemoVariant,
        videoAssetId: r.video_asset_id,
        isPrimary: r.is_primary,
        displayOrder: r.display_order,
        videoUrl: renditions['720p']?.url || renditions['480p']?.url,
        thumbnailUrl: renditions['thumbnail']?.url,
        durationMs: r.duration_ms ?? undefined,
      };
    });
  },

  /**
   * Add demo to an exercise
   */
  async addExerciseDemo(
    exerciseId: string,
    videoAssetId: string,
    options: { variant?: DemoVariant; isPrimary?: boolean; displayOrder?: number } = {}
  ): Promise<ExerciseDemo> {
    const { variant = DemoVariant.DEFAULT, isPrimary = false, displayOrder = 0 } = options;

    // If setting as primary, unset other primaries for this exercise/variant
    if (isPrimary) {
      await query(
        'UPDATE exercise_demos SET is_primary = FALSE WHERE exercise_id = $1 AND variant = $2',
        [exerciseId, variant]
      );
    }

    const row = await queryOne<{ id: string }>(
      `INSERT INTO exercise_demos (exercise_id, variant, video_asset_id, is_primary, display_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [exerciseId, variant, videoAssetId, isPrimary, displayOrder]
    );

    return {
      id: row!.id,
      exerciseId,
      variant,
      videoAssetId,
      isPrimary,
      displayOrder,
    };
  },

  // ============================================
  // USER VIDEO CLIPS
  // ============================================

  /**
   * Create a user video clip
   */
  async createClip(request: CreateClipRequest): Promise<UserVideoClip> {
    const { userId, videoAssetId, exerciseId, hangoutId, title, description, tags = [] } = request;

    const row = await queryOne<{
      id: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO user_video_clips (user_id, video_asset_id, exercise_id, hangout_id, title, description, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at, updated_at`,
      [userId, videoAssetId, exerciseId, hangoutId, title, description, JSON.stringify(tags)]
    );

    return {
      id: row!.id,
      userId,
      videoAssetId,
      exerciseId,
      hangoutId,
      title,
      description,
      tags,
      moderationStatus: ModerationStatus.PENDING,
      viewCount: 0,
      likeCount: 0,
      createdAt: row!.created_at,
      updatedAt: row!.updated_at,
    };
  },

  /**
   * Get user video clips
   */
  async getUserClips(
    userId: string,
    options: { limit?: number; offset?: number; moderationStatus?: ModerationStatus } = {}
  ): Promise<{ clips: UserVideoClip[]; total: number }> {
    const { limit = 20, offset = 0, moderationStatus } = options;

    let whereClause = 'WHERE uvc.user_id = $1';
    const params: unknown[] = [userId, limit, offset];

    if (moderationStatus !== undefined) {
      whereClause += ' AND uvc.moderation_status = $4';
      params.push(moderationStatus);
    }

    const rows = await queryAll<{
      id: string;
      user_id: string;
      video_asset_id: string;
      exercise_id: string | null;
      hangout_id: number | null;
      title: string | null;
      description: string | null;
      tags: string;
      moderation_status: number;
      view_count: number;
      like_count: number;
      created_at: Date;
      updated_at: Date;
      renditions: string;
      duration_ms: number | null;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    }>(
      `SELECT
        uvc.*, va.renditions, va.duration_ms,
        u.username, u.display_name, u.avatar_url
       FROM user_video_clips uvc
       JOIN video_assets va ON va.id = uvc.video_asset_id
       JOIN users u ON u.id = uvc.user_id
       ${whereClause}
       ORDER BY uvc.created_at DESC
       LIMIT $2 OFFSET $3`,
      params
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM user_video_clips ${whereClause.replace('$4', '$2')}`,
      moderationStatus !== undefined ? [userId, moderationStatus] : [userId]
    );

    return {
      clips: rows.map((r) => {
        const renditions = JSON.parse(r.renditions || '{}');
        return {
          id: r.id,
          userId: r.user_id,
          videoAssetId: r.video_asset_id,
          exerciseId: r.exercise_id ?? undefined,
          hangoutId: r.hangout_id ?? undefined,
          title: r.title ?? undefined,
          description: r.description ?? undefined,
          tags: JSON.parse(r.tags || '[]'),
          moderationStatus: r.moderation_status as ModerationStatus,
          viewCount: r.view_count,
          likeCount: r.like_count,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          videoUrl: renditions['720p']?.url || renditions['480p']?.url,
          thumbnailUrl: renditions['thumbnail']?.url,
          durationMs: r.duration_ms ?? undefined,
          username: r.username,
          displayName: r.display_name ?? undefined,
          avatarUrl: r.avatar_url ?? undefined,
        };
      }),
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  /**
   * Get clips pending moderation
   */
  async getPendingModeration(limit: number = 50): Promise<UserVideoClip[]> {
    const rows = await queryAll<{
      id: string;
      user_id: string;
      video_asset_id: string;
      title: string | null;
      created_at: Date;
      username: string;
    }>(
      `SELECT uvc.id, uvc.user_id, uvc.video_asset_id, uvc.title, uvc.created_at, u.username
       FROM user_video_clips uvc
       JOIN users u ON u.id = uvc.user_id
       WHERE uvc.moderation_status = $1
       ORDER BY uvc.created_at
       LIMIT $2`,
      [ModerationStatus.PENDING, limit]
    );

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      videoAssetId: r.video_asset_id,
      title: r.title ?? undefined,
      tags: [],
      moderationStatus: ModerationStatus.PENDING,
      viewCount: 0,
      likeCount: 0,
      createdAt: r.created_at,
      updatedAt: r.created_at,
      username: r.username,
    }));
  },

  /**
   * Update moderation status
   */
  async updateModerationStatus(clipId: string, status: ModerationStatus): Promise<void> {
    await query(
      'UPDATE user_video_clips SET moderation_status = $1, updated_at = NOW() WHERE id = $2',
      [status, clipId]
    );
  },

  /**
   * Increment view count
   */
  async incrementViewCount(clipId: string): Promise<void> {
    await query(
      'UPDATE user_video_clips SET view_count = view_count + 1 WHERE id = $1',
      [clipId]
    );
  },
};
