/**
 * Record Claim Service
 *
 * Handles the full lifecycle of venue record claims:
 * - Initiating claims with location verification
 * - Video upload and processing
 * - Witness assignment and attestation
 * - Record verification and finalization
 * - Economy integration (credit fees and rewards)
 */

import fs from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import type { PoolClient } from 'pg';
import { queryOne, queryAll, query, transaction } from '../../db/client';
import { ValidationError, NotFoundError, ForbiddenError } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import { VideoProcessingService } from '../../services/video-processing.service';
import { NotificationService } from '../../services/notification.service';
import {
  VenueRecord,
  InitiateClaimParams,
  UploadVideoParams,
  AssignWitnessParams,
  WitnessAttestationParams,
  VENUE_CONSTANTS,
  VenueRecordStatus,
} from './types';
import venueService from './venue.service';
import checkinService from './checkin.service';
import locationVerificationService from './location-verification.service';

const log = loggers.core;

const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || '/var/www/musclemap.me/uploads';
const VENUE_RECORDS_DIR = 'venue-records';

/**
 * Helper to execute a query within a transaction and return first row
 */
async function trxQueryOne<T = Record<string, unknown>>(
  trx: PoolClient,
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await trx.query(sql, params);
  return (result.rows[0] as T) ?? null;
}

/**
 * Helper to execute a query within a transaction
 */
async function trxQuery(
  trx: PoolClient,
  sql: string,
  params?: unknown[]
): Promise<number> {
  const result = await trx.query(sql, params);
  return result.rowCount ?? 0;
}

// Helper to convert DB row to VenueRecord
function rowToRecord(row: Record<string, unknown>): VenueRecord {
  return {
    id: row.id as string,
    venueId: row.venue_id as string,
    recordTypeId: row.record_type_id as string,
    userId: row.user_id as string,
    value: parseFloat(row.value as string),
    previousRecordValue: row.previous_record_value ? parseFloat(row.previous_record_value as string) : undefined,
    previousRecordHolderId: row.previous_record_holder_id as string | undefined,
    videoUrl: row.video_url as string | undefined,
    videoAssetId: row.video_asset_id as string | undefined,
    thumbnailUrl: row.thumbnail_url as string | undefined,
    videoDurationSeconds: row.video_duration_seconds as number | undefined,
    claimLatitude: parseFloat(row.claim_latitude as string),
    claimLongitude: parseFloat(row.claim_longitude as string),
    distanceFromVenueMeters: row.distance_from_venue_meters
      ? parseFloat(row.distance_from_venue_meters as string)
      : undefined,
    locationVerified: row.location_verified as boolean,
    locationVerificationMethod: row.location_verification_method as VenueRecord['locationVerificationMethod'],
    witnessUserId: row.witness_user_id as string | undefined,
    witnessVerified: row.witness_verified as boolean,
    witnessAttestation: row.witness_attestation as string | undefined,
    witnessLocationLatitude: row.witness_location_latitude
      ? parseFloat(row.witness_location_latitude as string)
      : undefined,
    witnessLocationLongitude: row.witness_location_longitude
      ? parseFloat(row.witness_location_longitude as string)
      : undefined,
    witnessDistanceMeters: row.witness_distance_meters
      ? parseFloat(row.witness_distance_meters as string)
      : undefined,
    witnessVerifiedAt: row.witness_verified_at ? new Date(row.witness_verified_at as string) : undefined,
    status: row.status as VenueRecordStatus,
    claimFeeCredits: row.claim_fee_credits as number,
    feeRefunded: row.fee_refunded as boolean,
    creditLedgerId: row.credit_ledger_id as string | undefined,
    claimedAt: new Date(row.claimed_at as string),
    witnessRequestedAt: row.witness_requested_at ? new Date(row.witness_requested_at as string) : undefined,
    verifiedAt: row.verified_at ? new Date(row.verified_at as string) : undefined,
    expiresAt: new Date(row.expires_at as string),
    additionalPhotos: (row.additional_photos as string[]) || [],
    notes: row.notes as string | undefined,
    rejectionReason: row.rejection_reason as string | undefined,
    deviceFingerprint: row.device_fingerprint as string | undefined,
    ipAddress: row.ip_address as string | undefined,
    suspiciousFlags: (row.suspicious_flags as string[]) || [],
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export const recordClaimService = {
  /**
   * Initiate a new record claim
   */
  async initiateClaim(params: InitiateClaimParams): Promise<VenueRecord> {
    const { venueId, recordTypeId, userId, value, latitude, longitude, notes, deviceFingerprint, ipAddress } = params;

    // 1. Get venue and record type
    const [venue, recordType] = await Promise.all([
      venueService.getVenueById(venueId),
      venueService.getRecordTypeById(recordTypeId),
    ]);

    if (!venue) throw new NotFoundError('Venue not found');
    if (!recordType) throw new NotFoundError('Record type not found');
    if (!venue.isActive) throw new ValidationError('This venue is currently inactive');
    if (!recordType.isActive) throw new ValidationError('This record type is not available');

    // 2. Check user is checked in at venue
    const isAtVenue = await checkinService.isUserAtVenue(userId, venueId);
    if (!isAtVenue) {
      throw new ValidationError('You must be checked in at the venue to claim a record');
    }

    // 3. Check equipment requirements
    if (recordType.requiredEquipment.length > 0) {
      const hasEquipment = recordType.requiredEquipment.every((eq) => venue.equipment.includes(eq));
      if (!hasEquipment) {
        throw new ValidationError('This venue does not have the required equipment for this record type');
      }
    }

    // 4. Check pending claim limits
    const pendingCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM venue_records
       WHERE user_id = $1 AND status IN ('pending_witness', 'pending_review')`,
      [userId]
    );

    if (parseInt(pendingCount?.count || '0') >= VENUE_CONSTANTS.MAX_PENDING_CLAIMS_PER_USER) {
      throw new ValidationError(
        `You can only have ${VENUE_CONSTANTS.MAX_PENDING_CLAIMS_PER_USER} pending claims at a time`
      );
    }

    // 5. Check if user already has a pending/verified claim for this record type at this venue
    const existingClaim = await queryOne(
      `SELECT id FROM venue_records
       WHERE venue_id = $1 AND record_type_id = $2 AND user_id = $3
         AND status IN ('pending_witness', 'pending_review', 'verified')`,
      [venueId, recordTypeId, userId]
    );

    if (existingClaim) {
      throw new ValidationError('You already have a pending or active record for this type at this venue');
    }

    // 6. Verify location
    const locationResult = await locationVerificationService.verifyUserAtVenue(userId, venueId, {
      latitude,
      longitude,
      timestamp: new Date(),
    });

    if (!locationResult.verified) {
      throw new ValidationError(locationResult.warning || 'Location verification failed');
    }

    // 7. Check for suspicious activity
    const hasSuspiciousActivity = await locationVerificationService.hasRecentSuspiciousActivity(userId);
    const suspiciousFlags = [...locationResult.suspiciousFlags];
    if (hasSuspiciousActivity) {
      suspiciousFlags.push('recent_rejected_claims');
    }

    // 8. Deduct claim fee from user credits
    const feeResult = await this.deductClaimFee(userId, VENUE_CONSTANTS.CLAIM_FEE_CREDITS);
    if (!feeResult.success) {
      throw new ValidationError(`Insufficient credits. You need ${VENUE_CONSTANTS.CLAIM_FEE_CREDITS} credits to submit a claim.`);
    }

    // 9. Get current record holder (if any)
    const currentRecord = await queryOne<{ value: string; user_id: string }>(
      `SELECT value, user_id FROM venue_records
       WHERE venue_id = $1 AND record_type_id = $2 AND status = 'verified'
       ORDER BY value DESC LIMIT 1`,
      [venueId, recordTypeId]
    );

    // 10. Create the claim
    const result = await queryOne<Record<string, unknown>>(
      `INSERT INTO venue_records (
        venue_id, record_type_id, user_id, value, claim_latitude, claim_longitude,
        distance_from_venue_meters, location_verified, location_verification_method,
        previous_record_value, previous_record_holder_id, notes, device_fingerprint,
        ip_address, suspicious_flags, claim_fee_credits, credit_ledger_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, 'gps', $8, $9, $10, $11, $12::inet, $13, $14, $15)
      RETURNING *`,
      [
        venueId,
        recordTypeId,
        userId,
        value,
        latitude,
        longitude,
        locationResult.distanceMeters,
        currentRecord?.value ? parseFloat(currentRecord.value) : null,
        currentRecord?.user_id || null,
        notes,
        deviceFingerprint,
        ipAddress,
        JSON.stringify(suspiciousFlags),
        VENUE_CONSTANTS.CLAIM_FEE_CREDITS,
        feeResult.ledgerId,
      ]
    );

    if (!result) {
      throw new Error('Failed to create claim');
    }

    // Update venue stats
    await query('UPDATE fitness_venues SET total_record_claims = total_record_claims + 1 WHERE id = $1', [venueId]);

    log.info({ recordId: result.id, userId, venueId, recordTypeId, value }, 'Record claim initiated');
    return rowToRecord(result);
  },

  /**
   * Upload video proof for a claim
   */
  async uploadVideo(params: UploadVideoParams): Promise<VenueRecord> {
    const { recordId, userId, videoBuffer, videoStream, originalFilename, fileSizeBytes } = params;

    // Get claim
    const claim = await this.getRecordById(recordId);
    if (!claim) throw new NotFoundError('Record claim not found');
    if (claim.userId !== userId) throw new ForbiddenError('Not authorized to upload video for this claim');
    if (claim.status !== 'pending_witness') {
      throw new ValidationError('Can only upload video for pending claims');
    }

    // Validate file size
    if (fileSizeBytes && fileSizeBytes > VENUE_CONSTANTS.MAX_VIDEO_SIZE_BYTES) {
      throw new ValidationError(
        `Video file too large. Maximum size is ${VENUE_CONSTANTS.MAX_VIDEO_SIZE_BYTES / 1024 / 1024}MB`
      );
    }

    // Create upload directory
    const uploadDir = path.join(UPLOAD_BASE_DIR, VENUE_RECORDS_DIR, userId, recordId);
    await fs.mkdir(uploadDir, { recursive: true });

    // Generate filename
    const ext = path.extname(originalFilename || '.mp4');
    const videoFilename = `video${ext}`;
    const videoPath = path.join(uploadDir, videoFilename);

    // Write video file
    if (videoBuffer) {
      await fs.writeFile(videoPath, videoBuffer);
    } else if (videoStream) {
      await pipeline(videoStream, createWriteStream(videoPath));
    } else {
      throw new ValidationError('No video data provided');
    }

    // Process video (get metadata, generate thumbnail)
    let duration: number | undefined;
    let thumbnailUrl: string | undefined;

    try {
      const metadata = await VideoProcessingService.getVideoMetadata(videoPath);
      duration = metadata?.duration ? Math.round(metadata.duration) : undefined;

      // Generate thumbnail
      const thumbnailPath = path.join(uploadDir, 'thumbnail.jpg');
      await VideoProcessingService.generateThumbnail(videoPath, thumbnailPath, { timestamp: 1 });
      thumbnailUrl = `/uploads/${VENUE_RECORDS_DIR}/${userId}/${recordId}/thumbnail.jpg`;
    } catch (err) {
      log.warn({ err, recordId }, 'Failed to process video metadata');
    }

    // Get record type for validation
    const recordType = await venueService.getRecordTypeById(claim.recordTypeId);
    if (recordType && duration) {
      if (duration < recordType.minVideoDurationSeconds) {
        throw new ValidationError(
          `Video must be at least ${recordType.minVideoDurationSeconds} seconds long`
        );
      }
      if (duration > recordType.maxVideoDurationSeconds) {
        throw new ValidationError(
          `Video must be no longer than ${recordType.maxVideoDurationSeconds} seconds`
        );
      }
    }

    // Update claim with video info
    const videoUrl = `/uploads/${VENUE_RECORDS_DIR}/${userId}/${recordId}/${videoFilename}`;
    const result = await queryOne<Record<string, unknown>>(
      `UPDATE venue_records SET
        video_url = $2,
        thumbnail_url = $3,
        video_duration_seconds = $4
       WHERE id = $1
       RETURNING *`,
      [recordId, videoUrl, thumbnailUrl, duration]
    );

    log.info({ recordId, userId, duration }, 'Video uploaded for record claim');
    return rowToRecord(result!);
  },

  /**
   * Assign a witness to a claim
   */
  async assignWitness(params: AssignWitnessParams): Promise<VenueRecord> {
    const { recordId, userId, witnessUserId } = params;

    // Get claim
    const claim = await this.getRecordById(recordId);
    if (!claim) throw new NotFoundError('Record claim not found');
    if (claim.userId !== userId) throw new ForbiddenError('Not authorized to assign witness for this claim');
    if (claim.status !== 'pending_witness') {
      throw new ValidationError('Can only assign witness for pending claims');
    }
    if (!claim.videoUrl) {
      throw new ValidationError('You must upload video proof before assigning a witness');
    }

    // Can't witness your own claim
    if (witnessUserId === userId) {
      throw new ValidationError('You cannot witness your own claim');
    }

    // Check witness account age
    const witness = await queryOne<{ created_at: string; email_verified: boolean }>(
      'SELECT created_at, email_verified FROM users WHERE id = $1',
      [witnessUserId]
    );

    if (!witness) throw new NotFoundError('Witness user not found');

    const accountAgeDays =
      (Date.now() - new Date(witness.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeDays < VENUE_CONSTANTS.MIN_WITNESS_ACCOUNT_AGE_DAYS) {
      throw new ValidationError(
        `Witness account must be at least ${VENUE_CONSTANTS.MIN_WITNESS_ACCOUNT_AGE_DAYS} days old`
      );
    }

    // Check witness is at the venue
    const isWitnessAtVenue = await checkinService.isUserAtVenue(witnessUserId, claim.venueId);
    if (!isWitnessAtVenue) {
      throw new ValidationError('Witness must be checked in at the venue');
    }

    // Check witness cooldown (can't witness same user twice in 24h)
    const recentWitness = await queryOne(
      `SELECT id FROM venue_records
       WHERE user_id = $1 AND witness_user_id = $2
         AND witness_verified_at > NOW() - INTERVAL '${VENUE_CONSTANTS.WITNESS_COOLDOWN_HOURS} hours'`,
      [userId, witnessUserId]
    );

    if (recentWitness) {
      throw new ValidationError(
        `This user witnessed your claim within the last ${VENUE_CONSTANTS.WITNESS_COOLDOWN_HOURS} hours`
      );
    }

    // Update claim with witness
    const result = await queryOne<Record<string, unknown>>(
      `UPDATE venue_records SET
        witness_user_id = $2,
        witness_requested_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [recordId, witnessUserId]
    );

    // Send notification to witness
    try {
      await NotificationService.create({
        userId: witnessUserId,
        type: 'VERIFICATION_WITNESS_REQUEST',
        category: 'verification',
        title: 'Witness Request',
        body: `You've been asked to witness a record claim`,
        relatedEntityType: 'venue_record',
        relatedEntityId: recordId,
        actionUrl: `/venues/${claim.venueId}/records/${recordId}/witness`,
        metadata: { venueId: claim.venueId },
      });
    } catch (err) {
      log.warn({ err, recordId, witnessUserId }, 'Failed to send witness notification');
    }

    log.info({ recordId, userId, witnessUserId }, 'Witness assigned to record claim');
    return rowToRecord(result!);
  },

  /**
   * Process witness attestation (confirm or decline)
   */
  async processWitnessAttestation(params: WitnessAttestationParams): Promise<VenueRecord> {
    const { recordId, witnessUserId, confirm, attestationText, latitude, longitude } = params;

    // Get claim
    const claim = await this.getRecordById(recordId);
    if (!claim) throw new NotFoundError('Record claim not found');
    if (claim.witnessUserId !== witnessUserId) {
      throw new ForbiddenError('You are not the assigned witness for this claim');
    }
    if (claim.status !== 'pending_witness') {
      throw new ValidationError('This claim is no longer pending witness attestation');
    }

    // Verify witness is at venue
    const locationResult = await locationVerificationService.verifyUserAtVenue(witnessUserId, claim.venueId, {
      latitude,
      longitude,
      timestamp: new Date(),
    });

    if (!locationResult.verified) {
      throw new ValidationError('You must be at the venue to attest to this claim');
    }

    // Check witness proximity to claimer (if claimer still at venue)
    const claimerAtVenue = await checkinService.isUserAtVenue(claim.userId, claim.venueId);
    if (claimerAtVenue) {
      const claimerCheckin = await checkinService.getActiveCheckin(claim.userId);
      if (claimerCheckin) {
        const proximityResult = await locationVerificationService.verifyWitnessProximity(
          { latitude: claimerCheckin.latitude, longitude: claimerCheckin.longitude },
          { latitude, longitude }
        );
        if (!proximityResult.verified) {
          log.warn({ recordId, witnessUserId, distance: proximityResult.distanceMeters }, 'Witness not near claimer');
          // Not a hard error, but log it
        }
      }
    }

    if (confirm) {
      // Require attestation text for confirmation
      if (!attestationText || attestationText.trim().length < 10) {
        throw new ValidationError('Please provide a brief description of what you witnessed (min 10 characters)');
      }

      return await this.verifyRecord(recordId, witnessUserId, attestationText, latitude, longitude);
    } else {
      // Decline the claim
      const result = await queryOne<Record<string, unknown>>(
        `UPDATE venue_records SET
          status = 'rejected',
          rejection_reason = 'Witness declined to verify',
          witness_location_latitude = $2,
          witness_location_longitude = $3,
          witness_distance_meters = $4
         WHERE id = $1
         RETURNING *`,
        [recordId, latitude, longitude, locationResult.distanceMeters]
      );

      // Forfeit claim fee (don't refund)
      log.info({ recordId, witnessUserId }, 'Record claim declined by witness');

      // Notify claimer
      try {
        await NotificationService.create({
          userId: claim.userId,
          type: 'VERIFICATION_REJECTED',
          category: 'verification',
          title: 'Record Claim Declined',
          body: 'Your record claim was not verified by the witness',
          relatedEntityType: 'venue_record',
          relatedEntityId: recordId,
          actionUrl: `/venues/${claim.venueId}/records/${recordId}`,
          metadata: { venueId: claim.venueId },
        });
      } catch (err) {
        log.warn({ err, recordId }, 'Failed to send decline notification');
      }

      return rowToRecord(result!);
    }
  },

  /**
   * Verify a record (called when witness confirms)
   */
  async verifyRecord(
    recordId: string,
    witnessUserId: string,
    attestationText: string,
    witnessLat: number,
    witnessLng: number
  ): Promise<VenueRecord> {
    return await transaction(async (trx) => {
      // Get claim with lock
      const claim = await trxQueryOne<Record<string, unknown>>(
        trx,
        'SELECT * FROM venue_records WHERE id = $1 FOR UPDATE',
        [recordId]
      );

      if (!claim) throw new NotFoundError('Record claim not found');
      if (claim.status !== 'pending_witness') {
        throw new ValidationError('This claim is no longer pending');
      }

      const record = rowToRecord(claim);

      // Calculate witness distance
      const witnessDistance = locationVerificationService.calculateDistance(
        record.claimLatitude,
        record.claimLongitude,
        witnessLat,
        witnessLng
      );

      // 1. Mark current record as superseded if this beats it
      if (record.previousRecordHolderId && record.value > (record.previousRecordValue || 0)) {
        await trxQuery(
          trx,
          `UPDATE venue_records SET
            status = 'superseded'
           WHERE venue_id = $1 AND record_type_id = $2 AND status = 'verified'
             AND value < $3`,
          [record.venueId, record.recordTypeId, record.value]
        );

        // Update history
        await trxQuery(
          trx,
          `UPDATE venue_record_history SET
            held_until = NOW(),
            superseded_by_record_id = $2
           WHERE venue_id = $1 AND record_type_id = $3 AND held_until IS NULL`,
          [record.venueId, recordId, record.recordTypeId]
        );
      }

      // 2. Update claim to verified
      const result = await trxQueryOne<Record<string, unknown>>(
        trx,
        `UPDATE venue_records SET
          status = 'verified',
          witness_verified = TRUE,
          witness_attestation = $2,
          witness_location_latitude = $3,
          witness_location_longitude = $4,
          witness_distance_meters = $5,
          witness_verified_at = NOW(),
          verified_at = NOW(),
          fee_refunded = TRUE
         WHERE id = $1
         RETURNING *`,
        [recordId, attestationText, witnessLat, witnessLng, witnessDistance]
      );

      // 3. Create history entry
      await trxQuery(
        trx,
        `INSERT INTO venue_record_history (
          venue_id, record_type_id, record_id, user_id, value, rank_at_time, held_from
        ) VALUES ($1, $2, $3, $4, $5, 1, NOW())`,
        [record.venueId, record.recordTypeId, recordId, record.userId, record.value]
      );

      // 4. Refund claim fee + award rewards
      await this.awardRecordRewards(
        record.userId,
        witnessUserId,
        record.previousRecordValue ? record.value > record.previousRecordValue : true,
        trx
      );

      // 5. Update venue active record count
      await trxQuery(
        trx,
        `UPDATE fitness_venues SET
          active_record_count = (
            SELECT COUNT(DISTINCT record_type_id) FROM venue_records
            WHERE venue_id = $1 AND status = 'verified'
          )
         WHERE id = $1`,
        [record.venueId]
      );

      // 6. Update membership stats
      await trxQuery(
        trx,
        `UPDATE venue_memberships SET
          record_count = record_count + 1,
          current_records_held = current_records_held + 1,
          last_record_claim_at = NOW()
         WHERE venue_id = $1 AND user_id = $2`,
        [record.venueId, record.userId]
      );

      // If broke someone else's record, decrement their current_records_held
      if (record.previousRecordHolderId && record.previousRecordHolderId !== record.userId) {
        await trxQuery(
          trx,
          `UPDATE venue_memberships SET
            current_records_held = GREATEST(0, current_records_held - 1)
           WHERE venue_id = $1 AND user_id = $2`,
          [record.venueId, record.previousRecordHolderId]
        );
      }

      log.info({ recordId, userId: record.userId, witnessUserId, value: record.value }, 'Record verified');

      // Send notifications
      try {
        // Notify claimer
        await NotificationService.create({
          userId: record.userId,
          type: 'VERIFICATION_CONFIRMED',
          category: 'verification',
          title: 'Record Verified!',
          body: 'Your record claim has been verified',
          relatedEntityType: 'venue_record',
          relatedEntityId: recordId,
          actionUrl: `/venues/${record.venueId}/records/${recordId}`,
          metadata: { venueId: record.venueId },
        });

        // Notify previous record holder if record was broken
        if (record.previousRecordHolderId && record.previousRecordHolderId !== record.userId) {
          await NotificationService.create({
            userId: record.previousRecordHolderId,
            type: 'COMPETITION_RANK_CHANGE',
            category: 'competition',
            title: 'Your Record Was Broken',
            body: 'Someone has beaten your venue record',
            relatedEntityType: 'venue_record',
            relatedEntityId: recordId,
            actionUrl: `/venues/${record.venueId}/records/${recordId}`,
            metadata: { venueId: record.venueId },
          });
        }
      } catch (err) {
        log.warn({ err, recordId }, 'Failed to send verification notifications');
      }

      // Check and grant achievements
      await this.checkAchievements(record.userId, record.venueId, witnessUserId);

      return rowToRecord(result!);
    });
  },

  /**
   * Cancel a pending claim
   */
  async cancelClaim(recordId: string, userId: string): Promise<void> {
    const claim = await this.getRecordById(recordId);
    if (!claim) throw new NotFoundError('Record claim not found');
    if (claim.userId !== userId) throw new ForbiddenError('Not authorized to cancel this claim');
    if (claim.status !== 'pending_witness') {
      throw new ValidationError('Can only cancel pending claims');
    }

    // Delete the claim
    await query('DELETE FROM venue_records WHERE id = $1', [recordId]);

    // Delete uploaded files
    const uploadDir = path.join(UPLOAD_BASE_DIR, VENUE_RECORDS_DIR, userId, recordId);
    try {
      await fs.rm(uploadDir, { recursive: true, force: true });
    } catch (err) {
      log.warn({ err, recordId }, 'Failed to delete claim files');
    }

    // Note: Claim fee is NOT refunded on cancellation
    log.info({ recordId, userId }, 'Record claim cancelled');
  },

  /**
   * Get record by ID
   */
  async getRecordById(recordId: string): Promise<VenueRecord | null> {
    const result = await queryOne<Record<string, unknown>>('SELECT * FROM venue_records WHERE id = $1', [recordId]);
    if (!result) return null;
    return rowToRecord(result);
  },

  /**
   * Get record with full details (user, venue, type info)
   */
  async getRecordWithDetails(recordId: string): Promise<VenueRecord | null> {
    const result = await queryOne<Record<string, unknown>>(
      `SELECT vr.*,
              u.username, u.display_name, u.avatar_url,
              w.username as witness_username, w.display_name as witness_display_name, w.avatar_url as witness_avatar_url,
              fv.name as venue_name, fv.slug as venue_slug,
              vrt.name as record_type_name, vrt.key as record_type_key, vrt.unit, vrt.icon
       FROM venue_records vr
       JOIN users u ON u.id = vr.user_id
       LEFT JOIN users w ON w.id = vr.witness_user_id
       JOIN fitness_venues fv ON fv.id = vr.venue_id
       JOIN venue_record_types vrt ON vrt.id = vr.record_type_id
       WHERE vr.id = $1`,
      [recordId]
    );

    if (!result) return null;

    const record = rowToRecord(result);
    record.user = {
      id: result.user_id as string,
      username: result.username as string,
      displayName: result.display_name as string | undefined,
      avatarUrl: result.avatar_url as string | undefined,
    };

    if (result.witness_username) {
      record.witness = {
        id: result.witness_user_id as string,
        username: result.witness_username as string,
        displayName: result.witness_display_name as string | undefined,
        avatarUrl: result.witness_avatar_url as string | undefined,
      };
    }

    return record;
  },

  /**
   * Get user's record claims
   */
  async getUserRecords(
    userId: string,
    options: { status?: VenueRecordStatus; limit?: number; cursor?: { claimedAt: Date; id: string } } = {}
  ): Promise<{ records: VenueRecord[]; hasMore: boolean }> {
    const { status, limit = 50, cursor } = options;

    const conditions = ['vr.user_id = $1'];
    const values: unknown[] = [userId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`vr.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (cursor) {
      conditions.push(`(vr.claimed_at, vr.id) < ($${paramIndex}, $${paramIndex + 1})`);
      values.push(cursor.claimedAt, cursor.id);
      paramIndex += 2;
    }

    values.push(limit + 1);

    const rows = await queryAll<Record<string, unknown>>(
      `SELECT vr.*, fv.name as venue_name, vrt.name as record_type_name, vrt.unit
       FROM venue_records vr
       JOIN fitness_venues fv ON fv.id = vr.venue_id
       JOIN venue_record_types vrt ON vrt.id = vr.record_type_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY vr.claimed_at DESC, vr.id DESC
       LIMIT $${paramIndex}`,
      values
    );

    const hasMore = rows.length > limit;
    const records = rows.slice(0, limit).map(rowToRecord);

    return { records, hasMore };
  },

  /**
   * Get user's current (verified) records
   */
  async getUserCurrentRecords(userId: string): Promise<VenueRecord[]> {
    const rows = await queryAll<Record<string, unknown>>(
      `SELECT vr.*, fv.name as venue_name, vrt.name as record_type_name, vrt.unit
       FROM venue_records vr
       JOIN fitness_venues fv ON fv.id = vr.venue_id
       JOIN venue_record_types vrt ON vrt.id = vr.record_type_id
       WHERE vr.user_id = $1 AND vr.status = 'verified'
       ORDER BY vr.verified_at DESC`,
      [userId]
    );

    return rows.map(rowToRecord);
  },

  /**
   * Get pending witness requests for a user
   */
  async getWitnessRequests(
    witnessUserId: string
  ): Promise<(VenueRecord & { claimerUsername: string; venueName: string; recordTypeName: string })[]> {
    const rows = await queryAll<Record<string, unknown>>(
      `SELECT vr.*, u.username as claimer_username, fv.name as venue_name, vrt.name as record_type_name
       FROM venue_records vr
       JOIN users u ON u.id = vr.user_id
       JOIN fitness_venues fv ON fv.id = vr.venue_id
       JOIN venue_record_types vrt ON vrt.id = vr.record_type_id
       WHERE vr.witness_user_id = $1 AND vr.status = 'pending_witness'
       ORDER BY vr.witness_requested_at DESC`,
      [witnessUserId]
    );

    return rows.map((row) => ({
      ...rowToRecord(row),
      claimerUsername: row.claimer_username as string,
      venueName: row.venue_name as string,
      recordTypeName: row.record_type_name as string,
    }));
  },

  /**
   * Expire old claims (run periodically)
   */
  async expireOldClaims(): Promise<number> {
    const result = await query(
      `UPDATE venue_records SET
        status = 'expired'
       WHERE status = 'pending_witness' AND expires_at < NOW()`
    );

    const count = result.rowCount || 0;
    if (count > 0) {
      log.info({ count }, 'Expired old record claims');
    }
    return count;
  },

  // ============================================
  // ECONOMY HELPERS
  // ============================================

  /**
   * Deduct claim fee from user
   */
  async deductClaimFee(
    userId: string,
    amount: number
  ): Promise<{ success: boolean; ledgerId?: string }> {
    try {
      // Check balance
      const balance = await queryOne<{ credit_balance: number }>(
        'SELECT credit_balance FROM users WHERE id = $1',
        [userId]
      );

      if (!balance || balance.credit_balance < amount) {
        return { success: false };
      }

      // Deduct credits
      await query('UPDATE users SET credit_balance = credit_balance - $2 WHERE id = $1', [userId, amount]);

      // Create ledger entry
      const ledger = await queryOne<{ id: string }>(
        `INSERT INTO credit_ledger (user_id, amount, balance_after, transaction_type, description)
         VALUES ($1, $2, (SELECT credit_balance FROM users WHERE id = $1), 'venue_record_claim_fee', 'Venue record claim fee')
         RETURNING id`,
        [userId, -amount]
      );

      return { success: true, ledgerId: ledger?.id };
    } catch (err) {
      log.error({ err, userId, amount }, 'Failed to deduct claim fee');
      return { success: false };
    }
  },

  /**
   * Award credits for verified record and witness
   */
  async awardRecordRewards(
    claimerId: string,
    witnessId: string,
    brokeRecord: boolean,
    trx?: { query: typeof query }
  ): Promise<void> {
    const db = trx || { query };

    // Refund claim fee + base reward
    const claimerReward = VENUE_CONSTANTS.CLAIM_FEE_CREDITS + VENUE_CONSTANTS.VERIFIED_RECORD_REWARD;
    const bonusReward = brokeRecord ? VENUE_CONSTANTS.RECORD_BREAKER_BONUS : 0;
    const totalClaimerReward = claimerReward + bonusReward;

    await db.query('UPDATE users SET credit_balance = credit_balance + $2 WHERE id = $1', [
      claimerId,
      totalClaimerReward,
    ]);

    await db.query(
      `INSERT INTO credit_ledger (user_id, amount, balance_after, transaction_type, description)
       VALUES ($1, $2, (SELECT credit_balance FROM users WHERE id = $1), 'venue_record_reward', $3)`,
      [
        claimerId,
        totalClaimerReward,
        brokeRecord ? 'Venue record verified + record broken bonus' : 'Venue record verified',
      ]
    );

    // Witness reward
    await db.query('UPDATE users SET credit_balance = credit_balance + $2 WHERE id = $1', [
      witnessId,
      VENUE_CONSTANTS.WITNESS_REWARD,
    ]);

    await db.query(
      `INSERT INTO credit_ledger (user_id, amount, balance_after, transaction_type, description)
       VALUES ($1, $2, (SELECT credit_balance FROM users WHERE id = $1), 'venue_record_witness', 'Venue record witness reward')`,
      [witnessId, VENUE_CONSTANTS.WITNESS_REWARD]
    );
  },

  /**
   * Check and grant achievements after record verification
   */
  async checkAchievements(userId: string, venueId: string, witnessUserId: string): Promise<void> {
    try {
      // Import achievement service dynamically to avoid circular deps
      const { achievementService } = await import('../achievements');

      // Check first_venue_record
      const totalRecords = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM venue_records WHERE user_id = $1 AND status = 'verified'`,
        [userId]
      );
      if (parseInt(totalRecords?.count || '0') === 1) {
        await achievementService.grant({ userId, achievementKey: 'first_venue_record' });
      }

      // Check local_legend (3+ records at same venue)
      const venueRecords = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM venue_records
         WHERE user_id = $1 AND venue_id = $2 AND status = 'verified'`,
        [userId, venueId]
      );
      if (parseInt(venueRecords?.count || '0') >= 3) {
        await achievementService.grant({ userId, achievementKey: 'local_legend' });
      }

      // Check venue_explorer (records at 5+ venues)
      const uniqueVenues = await queryOne<{ count: string }>(
        `SELECT COUNT(DISTINCT venue_id) as count FROM venue_records
         WHERE user_id = $1 AND status = 'verified'`,
        [userId]
      );
      if (parseInt(uniqueVenues?.count || '0') >= 5) {
        await achievementService.grant({ userId, achievementKey: 'venue_explorer' });
      }

      // Check trusted_witness for witness
      const witnessCount = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM venue_records
         WHERE witness_user_id = $1 AND status = 'verified'`,
        [witnessUserId]
      );
      if (parseInt(witnessCount?.count || '0') >= 10) {
        await achievementService.grant({ userId: witnessUserId, achievementKey: 'trusted_witness' });
      }
    } catch (err) {
      log.warn({ err, userId, venueId }, 'Failed to check venue record achievements');
    }
  },
};

export default recordClaimService;
