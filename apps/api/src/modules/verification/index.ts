/**
 * Achievement Verification Module
 *
 * Handles video verification for elite achievements:
 * - Video proof submissions
 * - Witness attestations
 * - Verification status tracking
 * - Achievement granting upon verification
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { queryOne, queryAll, query, transaction } from '../../db/client';
import { ValidationError, NotFoundError, ForbiddenError } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import cache, { CACHE_TTL, CACHE_PREFIX } from '../../lib/cache.service';
import { VideoProcessingService } from '../../services/video-processing.service';
import { NotificationService } from '../../services/notification.service';

const log = loggers.core;

// Constants
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || '/var/www/musclemap.me/uploads';
const VERIFICATION_DIR = 'verifications';
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const _MAX_VIDEO_DURATION_SECONDS = 60;
const MAX_PENDING_VERIFICATIONS = 3;
const VERIFICATION_EXPIRY_DAYS = 30;
const MIN_WITNESS_ACCOUNT_AGE_DAYS = 30;

// Types
export type VerificationStatus = 'pending_witness' | 'verified' | 'rejected' | 'expired';
export type WitnessStatus = 'pending' | 'confirmed' | 'declined';

export interface AchievementVerification {
  id: string;
  userId: string;
  achievementId: string;
  achievementKey?: string;
  achievementName?: string;
  achievementTier?: string;
  videoAssetId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  videoDurationSeconds?: number;
  status: VerificationStatus;
  notes?: string;
  rejectionReason?: string;
  submittedAt: Date;
  verifiedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  // Joined data
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  witness?: WitnessInfo;
}

export interface WitnessInfo {
  id: string;
  witnessUserId: string;
  witnessUsername?: string;
  witnessDisplayName?: string;
  witnessAvatarUrl?: string;
  attestationText?: string;
  relationship?: string;
  locationDescription?: string;
  status: WitnessStatus;
  isPublic: boolean;
  requestedAt: Date;
  respondedAt?: Date;
}

export interface SubmitVerificationParams {
  userId: string;
  achievementId: string;
  witnessUserId: string;
  notes?: string;
  videoBuffer?: Buffer;
  videoStream?: NodeJS.ReadableStream;
  originalFilename?: string;
  fileSizeBytes?: number;
}

export interface WitnessAttestationParams {
  verificationId: string;
  witnessUserId: string;
  confirm: boolean;
  attestationText?: string;
  relationship?: string;
  locationDescription?: string;
  isPublic?: boolean;
}

// Service
export const verificationService = {
  /**
   * Check if an achievement requires verification
   */
  async requiresVerification(achievementId: string): Promise<boolean> {
    const result = await queryOne<{ requires_verification: boolean }>(
      'SELECT requires_verification FROM achievement_definitions WHERE id = $1',
      [achievementId]
    );
    return result?.requires_verification ?? false;
  },

  /**
   * Check if an achievement requires verification by key
   */
  async requiresVerificationByKey(achievementKey: string): Promise<boolean> {
    const result = await queryOne<{ requires_verification: boolean }>(
      'SELECT requires_verification FROM achievement_definitions WHERE key = $1',
      [achievementKey]
    );
    return result?.requires_verification ?? false;
  },

  /**
   * Get achievement definition with tier info
   */
  async getAchievementWithTier(achievementId: string) {
    return queryOne<{
      id: string;
      key: string;
      name: string;
      tier: string;
      requires_verification: boolean;
      rarity: string;
      points: number;
    }>(
      'SELECT id, key, name, tier, requires_verification, rarity, points FROM achievement_definitions WHERE id = $1',
      [achievementId]
    );
  },

  /**
   * Submit a verification request with video proof
   */
  async submitVerification(params: SubmitVerificationParams): Promise<AchievementVerification> {
    const { userId, achievementId, witnessUserId, notes, videoBuffer, videoStream, originalFilename: _originalFilename, fileSizeBytes } =
      params;

    // Validate achievement exists and requires verification
    const achievement = await this.getAchievementWithTier(achievementId);
    if (!achievement) {
      throw new NotFoundError('Achievement not found');
    }

    // Check if user already has this achievement
    const existingAchievement = await queryOne<{ id: string }>(
      'SELECT id FROM achievement_events WHERE user_id = $1 AND achievement_id = $2',
      [userId, achievementId]
    );
    if (existingAchievement) {
      throw new ValidationError('You already have this achievement');
    }

    // Check pending verification limit
    const pendingCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM achievement_verifications
       WHERE user_id = $1 AND status = 'pending_witness'`,
      [userId]
    );
    if (parseInt(pendingCount?.count || '0') >= MAX_PENDING_VERIFICATIONS) {
      throw new ValidationError(`You can only have ${MAX_PENDING_VERIFICATIONS} pending verifications at a time`);
    }

    // Check for existing pending verification for this achievement
    const existingVerification = await queryOne<{ id: string }>(
      `SELECT id FROM achievement_verifications
       WHERE user_id = $1 AND achievement_id = $2 AND status = 'pending_witness'`,
      [userId, achievementId]
    );
    if (existingVerification) {
      throw new ValidationError('You already have a pending verification for this achievement');
    }

    // Validate witness
    if (witnessUserId === userId) {
      throw new ValidationError('You cannot be your own witness');
    }

    const witness = await queryOne<{ id: string; created_at: Date; email_verified: boolean }>(
      'SELECT id, created_at, email_verified FROM users WHERE id = $1',
      [witnessUserId]
    );
    if (!witness) {
      throw new NotFoundError('Witness user not found');
    }

    // Check witness account age
    const accountAgeDays = Math.floor(
      (Date.now() - new Date(witness.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (accountAgeDays < MIN_WITNESS_ACCOUNT_AGE_DAYS) {
      throw new ValidationError(
        `Witness must have an account at least ${MIN_WITNESS_ACCOUNT_AGE_DAYS} days old`
      );
    }

    // Generate verification ID
    const verificationId = 'av_' + crypto.randomBytes(16).toString('hex');

    // Handle video upload
    let videoUrl: string | undefined;
    let thumbnailUrl: string | undefined;

    if (videoBuffer || videoStream) {
      // Validate file size
      if (fileSizeBytes && fileSizeBytes > MAX_VIDEO_SIZE_BYTES) {
        throw new ValidationError(`Video must be less than ${MAX_VIDEO_SIZE_BYTES / (1024 * 1024)}MB`);
      }

      // Create upload directory
      const uploadDir = path.join(UPLOAD_BASE_DIR, VERIFICATION_DIR, userId, verificationId);
      await fs.mkdir(uploadDir, { recursive: true });

      const videoPath = path.join(uploadDir, 'video.mp4');

      if (videoBuffer) {
        await fs.writeFile(videoPath, videoBuffer);
      } else if (videoStream) {
        await pipeline(videoStream, createWriteStream(videoPath));
      }

      // Set URLs (relative to uploads directory)
      videoUrl = `/uploads/${VERIFICATION_DIR}/${userId}/${verificationId}/video.mp4`;
      thumbnailUrl = `/uploads/${VERIFICATION_DIR}/${userId}/${verificationId}/thumbnail.jpg`;

      // Generate thumbnail with ffmpeg
      const thumbnailPath = path.join(uploadDir, 'thumbnail.jpg');
      const thumbnailResult = await VideoProcessingService.generateThumbnail(
        videoPath,
        thumbnailPath,
        { quality: 5, timestamp: 1, scale: { width: 640 } }
      );

      if (!thumbnailResult.success) {
        log.warn(`Failed to generate thumbnail for verification ${verificationId}: ${thumbnailResult.error}`);
        // Continue without thumbnail - it's not critical
        thumbnailUrl = undefined;
      } else {
        log.info(`Thumbnail generated for verification ${verificationId}`);
      }
    }

    // Create verification record
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + VERIFICATION_EXPIRY_DAYS);

    await transaction(async (client) => {
      // Insert verification
      await client.query(
        `INSERT INTO achievement_verifications
         (id, user_id, achievement_id, video_url, thumbnail_url, status, notes, expires_at)
         VALUES ($1, $2, $3, $4, $5, 'pending_witness', $6, $7)`,
        [verificationId, userId, achievementId, videoUrl, thumbnailUrl, notes, expiresAt]
      );

      // Create witness request
      await client.query(
        `INSERT INTO achievement_witnesses
         (verification_id, witness_user_id, status)
         VALUES ($1, $2, 'pending')`,
        [verificationId, witnessUserId]
      );
    });

    log.info(`Verification ${verificationId} created for user ${userId}, achievement ${achievementId}`);

    // Send notification to witness
    try {
      await NotificationService.sendVerificationWitnessRequest(
        witnessUserId,
        userId,
        verificationId,
        achievement.name
      );
      log.info(`Witness notification sent for verification ${verificationId}`);
    } catch (err) {
      log.warn(`Failed to send witness notification for ${verificationId}: ${err}`);
      // Don't fail the verification submission if notification fails
    }

    return this.getVerification(verificationId);
  },

  /**
   * Get a verification by ID
   */
  async getVerification(verificationId: string): Promise<AchievementVerification> {
    const row = await queryOne<{
      id: string;
      user_id: string;
      achievement_id: string;
      video_asset_id: string | null;
      video_url: string | null;
      thumbnail_url: string | null;
      video_duration_seconds: number | null;
      status: string;
      notes: string | null;
      rejection_reason: string | null;
      submitted_at: Date;
      verified_at: Date | null;
      expires_at: Date;
      created_at: Date;
      updated_at: Date;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      achievement_key: string;
      achievement_name: string;
      achievement_tier: string;
    }>(
      `SELECT v.*,
              u.username, u.display_name, u.avatar_url,
              a.key as achievement_key, a.name as achievement_name, a.tier as achievement_tier
       FROM achievement_verifications v
       JOIN users u ON u.id = v.user_id
       JOIN achievement_definitions a ON a.id = v.achievement_id
       WHERE v.id = $1`,
      [verificationId]
    );

    if (!row) {
      throw new NotFoundError('Verification not found');
    }

    // Get witness info
    const witness = await this.getWitnessInfo(verificationId);

    return {
      id: row.id,
      userId: row.user_id,
      achievementId: row.achievement_id,
      achievementKey: row.achievement_key,
      achievementName: row.achievement_name,
      achievementTier: row.achievement_tier,
      videoAssetId: row.video_asset_id ?? undefined,
      videoUrl: row.video_url ?? undefined,
      thumbnailUrl: row.thumbnail_url ?? undefined,
      videoDurationSeconds: row.video_duration_seconds ?? undefined,
      status: row.status as VerificationStatus,
      notes: row.notes ?? undefined,
      rejectionReason: row.rejection_reason ?? undefined,
      submittedAt: row.submitted_at,
      verifiedAt: row.verified_at ?? undefined,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      username: row.username,
      displayName: row.display_name ?? undefined,
      avatarUrl: row.avatar_url ?? undefined,
      witness,
    };
  },

  /**
   * Get witness info for a verification
   */
  async getWitnessInfo(verificationId: string): Promise<WitnessInfo | undefined> {
    const row = await queryOne<{
      id: string;
      witness_user_id: string;
      attestation_text: string | null;
      relationship: string | null;
      location_description: string | null;
      status: string;
      is_public: boolean;
      requested_at: Date;
      responded_at: Date | null;
      witness_username: string;
      witness_display_name: string | null;
      witness_avatar_url: string | null;
    }>(
      `SELECT w.*,
              u.username as witness_username,
              u.display_name as witness_display_name,
              u.avatar_url as witness_avatar_url
       FROM achievement_witnesses w
       JOIN users u ON u.id = w.witness_user_id
       WHERE w.verification_id = $1`,
      [verificationId]
    );

    if (!row) return undefined;

    return {
      id: row.id,
      witnessUserId: row.witness_user_id,
      witnessUsername: row.witness_username,
      witnessDisplayName: row.witness_display_name ?? undefined,
      witnessAvatarUrl: row.witness_avatar_url ?? undefined,
      attestationText: row.attestation_text ?? undefined,
      relationship: row.relationship ?? undefined,
      locationDescription: row.location_description ?? undefined,
      status: row.status as WitnessStatus,
      isPublic: row.is_public,
      requestedAt: row.requested_at,
      respondedAt: row.responded_at ?? undefined,
    };
  },

  /**
   * Get user's verifications
   */
  async getUserVerifications(
    userId: string,
    options: { status?: VerificationStatus; limit?: number; offset?: number } = {}
  ): Promise<{ verifications: AchievementVerification[]; total: number }> {
    const { status, limit = 20, offset = 0 } = options;

    let whereClause = 'v.user_id = $1';
    const params: unknown[] = [userId];

    if (status) {
      whereClause += ` AND v.status = $${params.length + 1}`;
      params.push(status);
    }

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM achievement_verifications v WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0');

    const rows = await queryAll<{
      id: string;
      user_id: string;
      achievement_id: string;
      video_url: string | null;
      thumbnail_url: string | null;
      status: string;
      notes: string | null;
      submitted_at: Date;
      verified_at: Date | null;
      expires_at: Date;
      created_at: Date;
      updated_at: Date;
      achievement_key: string;
      achievement_name: string;
      achievement_tier: string;
    }>(
      `SELECT v.id, v.user_id, v.achievement_id, v.video_url, v.thumbnail_url,
              v.status, v.notes, v.submitted_at, v.verified_at, v.expires_at,
              v.created_at, v.updated_at,
              a.key as achievement_key, a.name as achievement_name, a.tier as achievement_tier
       FROM achievement_verifications v
       JOIN achievement_definitions a ON a.id = v.achievement_id
       WHERE ${whereClause}
       ORDER BY v.submitted_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const verifications = await Promise.all(
      rows.map(async (row) => {
        const witness = await this.getWitnessInfo(row.id);
        return {
          id: row.id,
          userId: row.user_id,
          achievementId: row.achievement_id,
          achievementKey: row.achievement_key,
          achievementName: row.achievement_name,
          achievementTier: row.achievement_tier,
          videoUrl: row.video_url ?? undefined,
          thumbnailUrl: row.thumbnail_url ?? undefined,
          status: row.status as VerificationStatus,
          notes: row.notes ?? undefined,
          submittedAt: row.submitted_at,
          verifiedAt: row.verified_at ?? undefined,
          expiresAt: row.expires_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          witness,
        } as AchievementVerification;
      })
    );

    return { verifications, total };
  },

  /**
   * Get pending witness requests for a user
   */
  async getWitnessRequests(
    witnessUserId: string,
    options: { status?: WitnessStatus; limit?: number; offset?: number } = {}
  ): Promise<{ requests: AchievementVerification[]; total: number }> {
    const { status = 'pending', limit = 20, offset = 0 } = options;

    let whereClause = 'w.witness_user_id = $1';
    const params: unknown[] = [witnessUserId];

    if (status) {
      whereClause += ` AND w.status = $${params.length + 1}`;
      params.push(status);
    }

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM achievement_witnesses w
       JOIN achievement_verifications v ON v.id = w.verification_id
       WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0');

    const rows = await queryAll<{
      verification_id: string;
    }>(
      `SELECT w.verification_id
       FROM achievement_witnesses w
       JOIN achievement_verifications v ON v.id = w.verification_id
       WHERE ${whereClause}
       ORDER BY w.requested_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const requests = await Promise.all(rows.map((row) => this.getVerification(row.verification_id)));

    return { requests, total };
  },

  /**
   * Submit witness attestation
   */
  async submitWitnessAttestation(params: WitnessAttestationParams): Promise<AchievementVerification> {
    const {
      verificationId,
      witnessUserId,
      confirm,
      attestationText,
      relationship,
      locationDescription,
      isPublic = true,
    } = params;

    // Get the witness record
    const witnessRecord = await queryOne<{
      id: string;
      verification_id: string;
      witness_user_id: string;
      status: string;
    }>(
      `SELECT * FROM achievement_witnesses WHERE verification_id = $1`,
      [verificationId]
    );

    if (!witnessRecord) {
      throw new NotFoundError('Witness request not found');
    }

    if (witnessRecord.witness_user_id !== witnessUserId) {
      throw new ForbiddenError('You are not the requested witness for this verification');
    }

    if (witnessRecord.status !== 'pending') {
      throw new ValidationError('This witness request has already been responded to');
    }

    // Get verification to check status
    const verification = await queryOne<{ status: string; user_id: string; achievement_id: string; achievement_name: string }>(
      `SELECT v.status, v.user_id, v.achievement_id, a.name as achievement_name
       FROM achievement_verifications v
       JOIN achievement_definitions a ON a.id = v.achievement_id
       WHERE v.id = $1`,
      [verificationId]
    );

    if (!verification) {
      throw new NotFoundError('Verification not found');
    }

    if (verification.status !== 'pending_witness') {
      throw new ValidationError('This verification is no longer pending');
    }

    if (confirm && !attestationText) {
      throw new ValidationError('Attestation text is required when confirming');
    }

    // Get witness username for the achievement event
    const witnessUser = await queryOne<{ username: string }>(
      'SELECT username FROM users WHERE id = $1',
      [witnessUserId]
    );

    await transaction(async (client) => {
      // Update witness record
      await client.query(
        `UPDATE achievement_witnesses
         SET status = $1,
             attestation_text = $2,
             relationship = $3,
             location_description = $4,
             is_public = $5,
             responded_at = NOW()
         WHERE verification_id = $6`,
        [
          confirm ? 'confirmed' : 'declined',
          attestationText,
          relationship,
          locationDescription,
          isPublic,
          verificationId,
        ]
      );

      if (confirm) {
        // Update verification status
        await client.query(
          `UPDATE achievement_verifications
           SET status = 'verified', verified_at = NOW()
           WHERE id = $1`,
          [verificationId]
        );

        // Grant the achievement
        const achievementId = 'ae_' + crypto.randomBytes(16).toString('hex');
        await client.query(
          `INSERT INTO achievement_events
           (id, user_id, achievement_id, verification_id, is_verified, witness_username, earned_at)
           VALUES ($1, $2, $3, $4, TRUE, $5, NOW())`,
          [achievementId, verification.user_id, verification.achievement_id, verificationId, witnessUser?.username]
        );

        // Update user achievement points
        await client.query(
          `UPDATE users
           SET achievement_points = achievement_points + (
             SELECT points FROM achievement_definitions WHERE id = $1
           )
           WHERE id = $2`,
          [verification.achievement_id, verification.user_id]
        );

        log.info(
          `Achievement ${verification.achievement_id} verified and granted to user ${verification.user_id}`
        );
      } else {
        // Mark as rejected
        await client.query(
          `UPDATE achievement_verifications
           SET status = 'rejected', rejection_reason = 'Witness declined'
           WHERE id = $1`,
          [verificationId]
        );

        log.info(`Verification ${verificationId} rejected by witness`);
      }
    });

    // Send notification to user about result
    try {
      if (confirm) {
        await NotificationService.sendVerificationConfirmed(
          verification.user_id,
          witnessUserId,
          verificationId,
          verification.achievement_name
        );
      } else {
        await NotificationService.sendVerificationRejected(
          verification.user_id,
          witnessUserId,
          verificationId,
          verification.achievement_name
        );
      }
      log.info(`Result notification sent for verification ${verificationId}`);
    } catch (err) {
      log.warn(`Failed to send result notification for ${verificationId}: ${err}`);
      // Don't fail the attestation if notification fails
    }

    return this.getVerification(verificationId);
  },

  /**
   * Cancel a pending verification
   */
  async cancelVerification(verificationId: string, userId: string): Promise<void> {
    const verification = await queryOne<{ user_id: string; status: string }>(
      'SELECT user_id, status FROM achievement_verifications WHERE id = $1',
      [verificationId]
    );

    if (!verification) {
      throw new NotFoundError('Verification not found');
    }

    if (verification.user_id !== userId) {
      throw new ForbiddenError('You can only cancel your own verifications');
    }

    if (verification.status !== 'pending_witness') {
      throw new ValidationError('Only pending verifications can be cancelled');
    }

    await query('DELETE FROM achievement_verifications WHERE id = $1', [verificationId]);

    // Clean up video files
    const uploadDir = path.join(UPLOAD_BASE_DIR, VERIFICATION_DIR, userId, verificationId);
    try {
      await fs.rm(uploadDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    log.info(`Verification ${verificationId} cancelled by user ${userId}`);
  },

  /**
   * Expire old pending verifications (run as cron job)
   */
  async expireOldVerifications(): Promise<number> {
    const result = await query(
      `UPDATE achievement_verifications
       SET status = 'expired'
       WHERE status = 'pending_witness' AND expires_at < NOW()
       RETURNING id`
    );

    const expiredCount = result.rowCount || 0;
    if (expiredCount > 0) {
      log.info(`Expired ${expiredCount} old verifications`);
    }

    return expiredCount;
  },

  /**
   * Get achievements that require verification
   */
  async getVerificationRequiredAchievements(): Promise<
    Array<{
      id: string;
      key: string;
      name: string;
      description?: string;
      tier: string;
      rarity: string;
      points: number;
    }>
  > {
    const cacheKey = `${CACHE_PREFIX.ACHIEVEMENT_DEFS}:verification_required`;

    return cache.getOrSet(cacheKey, CACHE_TTL.ACHIEVEMENT_DEFINITIONS, async () => {
      const rows = await queryAll<{
        id: string;
        key: string;
        name: string;
        description: string | null;
        tier: string;
        rarity: string;
        points: number;
      }>(
        `SELECT id, key, name, description, tier, rarity, points
         FROM achievement_definitions
         WHERE requires_verification = TRUE AND enabled = TRUE
         ORDER BY tier DESC, points DESC`
      );

      return rows.map((r) => ({
        id: r.id,
        key: r.key,
        name: r.name,
        description: r.description ?? undefined,
        tier: r.tier,
        rarity: r.rarity,
        points: r.points,
      }));
    });
  },

  /**
   * Check if user can submit verification for an achievement
   */
  async canSubmitVerification(
    userId: string,
    achievementId: string
  ): Promise<{ canSubmit: boolean; reason?: string }> {
    // Check if achievement exists
    const achievement = await this.getAchievementWithTier(achievementId);
    if (!achievement) {
      return { canSubmit: false, reason: 'Achievement not found' };
    }

    // Check if user already has this achievement
    const existingAchievement = await queryOne<{ id: string }>(
      'SELECT id FROM achievement_events WHERE user_id = $1 AND achievement_id = $2',
      [userId, achievementId]
    );
    if (existingAchievement) {
      return { canSubmit: false, reason: 'You already have this achievement' };
    }

    // Check pending verification limit
    const pendingCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM achievement_verifications
       WHERE user_id = $1 AND status = 'pending_witness'`,
      [userId]
    );
    if (parseInt(pendingCount?.count || '0') >= MAX_PENDING_VERIFICATIONS) {
      return {
        canSubmit: false,
        reason: `You can only have ${MAX_PENDING_VERIFICATIONS} pending verifications at a time`,
      };
    }

    // Check for existing pending verification
    const existingVerification = await queryOne<{ id: string }>(
      `SELECT id FROM achievement_verifications
       WHERE user_id = $1 AND achievement_id = $2 AND status = 'pending_witness'`,
      [userId, achievementId]
    );
    if (existingVerification) {
      return { canSubmit: false, reason: 'You already have a pending verification for this achievement' };
    }

    return { canSubmit: true };
  },
};

export default verificationService;
