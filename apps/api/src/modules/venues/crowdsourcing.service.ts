/**
 * Crowdsourcing Service
 *
 * Handles user-contributed venue data:
 * - New venue submissions
 * - Venue verification ("I was here")
 * - Equipment condition updates
 * - Photo contributions
 * - Issue reports
 * - Credits/rewards for contributions
 */

import { query, queryOne, queryAll } from '../../db/client';
import { ValidationError, NotFoundError, ForbiddenError } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import cache from '../../lib/cache.service';
import { EquipmentType, VenueType, VENUE_CONSTANTS } from './types';
import { venueService } from './venue.service';

const log = loggers.core;

// Credit awards for contributions
const CONTRIBUTION_CREDITS = {
  SUBMIT_NEW_VENUE: 50,
  SUBMIT_WITH_PHOTO: 75,
  VERIFY_EXISTS: 10,
  VERIFY_EQUIPMENT: 15,
  ADD_PHOTO: 25,
  REPORT_VALID_ISSUE: 15,
  FIRST_VERIFICATION: 25,
  UPDATE_CONDITION: 10,
  WEEKLY_CONTRIBUTOR: 100,
  LOCAL_EXPERT: 200,
};

// Penalties for abuse
const CONTRIBUTION_PENALTIES = {
  REJECTED_SUBMISSION: -25,
  FALSE_REPORT: -20,
  SPAM_PHOTO: -15,
};

// Duplicate detection threshold (meters)
const DUPLICATE_DISTANCE_THRESHOLD = 50;

export interface VenueSubmission {
  id: string;
  userId: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'merged' | 'duplicate';
  proposedName: string;
  proposedVenueType: VenueType;
  latitude: number;
  longitude: number;
  proposedAddress?: string;
  proposedCity: string;
  proposedBorough?: string;
  proposedPostalCode?: string;
  proposedEquipment: EquipmentType[];
  proposedHours?: Record<string, string>;
  proposedIsFree: boolean;
  proposedIs24Hour: boolean;
  photoUrls: string[];
  notes?: string;
  howDiscovered?: string;
  locationAccuracyMeters?: number;
  reviewedBy?: string;
  reviewerNotes?: string;
  rejectionReason?: string;
  createdVenueId?: string;
  mergedIntoVenueId?: string;
  detectedDuplicateVenueId?: string;
  duplicateDistanceMeters?: number;
  creditsAwarded: number;
  submittedAt: Date;
  reviewedAt?: Date;
}

export interface VenueContribution {
  id: string;
  venueId: string;
  userId: string;
  contributionType: string;
  details: Record<string, unknown>;
  notes?: string;
  photoUrl?: string;
  verificationLatitude?: number;
  verificationLongitude?: number;
  distanceFromVenueMeters?: number;
  locationVerified: boolean;
  equipmentItemId?: string;
  oldCondition?: string;
  newCondition?: string;
  creditsAwarded: number;
  isFlagged: boolean;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  contributedAt: Date;
}

export interface VenuePhoto {
  id: string;
  venueId: string;
  userId?: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  photoType: 'general' | 'equipment' | 'entrance' | 'surroundings' | 'hours_sign' | 'accessibility' | 'condition_report';
  equipmentShown: EquipmentType[];
  isApproved: boolean;
  isPrimary: boolean;
  isFlagged: boolean;
  uploadedAt: Date;
}

export interface VenueReport {
  id: string;
  venueId: string;
  userId: string;
  reportType: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  photoUrls: string[];
  status: 'pending' | 'investigating' | 'resolved_fixed' | 'resolved_closed' | 'dismissed';
  resolutionNotes?: string;
  actionTaken?: string;
  creditsAwarded: number;
  reportedAt: Date;
  resolvedAt?: Date;
}

export interface ContributorStats {
  userId: string;
  venuesSubmitted: number;
  venuesApproved: number;
  verificationsCount: number;
  photosUploaded: number;
  reportsSubmitted: number;
  reportsResolved: number;
  equipmentUpdates: number;
  approvalRate: number;
  currentStreak: number;
  longestStreak: number;
  totalCreditsEarned: number;
  contributorLevel: number;
  contributorTitle: string;
  lastContributionAt?: Date;
}

// Helper to calculate distance between two points (Haversine)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Generate slug from name
function generateSlug(name: string, borough?: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 40);

  if (borough) {
    return `${base}-${borough.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export const crowdsourcingService = {
  // ============================================
  // VENUE SUBMISSIONS
  // ============================================

  /**
   * Submit a new venue location
   */
  async submitVenue(
    userId: string,
    data: {
      name: string;
      venueType: VenueType;
      latitude: number;
      longitude: number;
      address?: string;
      borough?: string;
      postalCode?: string;
      equipment: EquipmentType[];
      hours?: Record<string, string>;
      isFree?: boolean;
      is24Hour?: boolean;
      photos?: string[];
      notes?: string;
      howDiscovered?: string;
      locationAccuracyMeters?: number;
    }
  ): Promise<VenueSubmission> {
    // Validate coordinates
    if (data.latitude < 40.4 || data.latitude > 41.0 || data.longitude < -74.3 || data.longitude > -73.6) {
      throw new ValidationError('Location must be within New York City area');
    }

    if (!data.name || data.name.trim().length < 3) {
      throw new ValidationError('Venue name must be at least 3 characters');
    }

    if (data.equipment.length === 0) {
      throw new ValidationError('At least one equipment type must be specified');
    }

    // Check for nearby duplicates
    const nearbyVenues = await queryAll<{ id: string; name: string; latitude: string; longitude: string }>(
      `SELECT id, name, latitude::text, longitude::text FROM fitness_venues
       WHERE is_active = TRUE
       AND (6371000 * acos(
         cos(radians($1)) * cos(radians(latitude)) *
         cos(radians(longitude) - radians($2)) +
         sin(radians($1)) * sin(radians(latitude))
       )) < $3
       LIMIT 10`,
      [data.latitude, data.longitude, DUPLICATE_DISTANCE_THRESHOLD]
    );

    let detectedDuplicate: { id: string; distance: number } | null = null;

    if (nearbyVenues.length > 0) {
      // Find closest venue
      for (const venue of nearbyVenues) {
        const distance = calculateDistance(
          data.latitude,
          data.longitude,
          parseFloat(venue.latitude),
          parseFloat(venue.longitude)
        );
        if (!detectedDuplicate || distance < detectedDuplicate.distance) {
          detectedDuplicate = { id: venue.id, distance };
        }
      }
    }

    // Check user's daily submission limit
    const todaySubmissions = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM venue_submissions
       WHERE user_id = $1 AND DATE(submitted_at) = CURRENT_DATE`,
      [userId]
    );

    if (parseInt(todaySubmissions?.count || '0') >= 5) {
      throw new ForbiddenError('You have reached the daily limit of 5 venue submissions');
    }

    // Create submission
    const result = await queryOne<Record<string, unknown>>(
      `INSERT INTO venue_submissions (
        user_id, proposed_name, proposed_venue_type, latitude, longitude,
        proposed_address, proposed_city, proposed_borough, proposed_postal_code,
        proposed_equipment, proposed_hours, proposed_is_free, proposed_is_24_hour,
        photo_urls, notes, how_discovered, location_accuracy_meters,
        detected_duplicate_venue_id, duplicate_distance_meters
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13, $14::jsonb, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        userId,
        data.name.trim(),
        data.venueType,
        data.latitude,
        data.longitude,
        data.address,
        data.borough ? 'New York' : 'New York',
        data.borough,
        data.postalCode,
        JSON.stringify(data.equipment),
        data.hours ? JSON.stringify(data.hours) : null,
        data.isFree ?? true,
        data.is24Hour ?? false,
        JSON.stringify(data.photos || []),
        data.notes,
        data.howDiscovered,
        data.locationAccuracyMeters,
        detectedDuplicate?.id,
        detectedDuplicate?.distance,
      ]
    );

    log.info({ submissionId: result!.id, userId, name: data.name }, 'Venue submission created');

    return this.rowToSubmission(result!);
  },

  /**
   * Get submission by ID
   */
  async getSubmission(submissionId: string): Promise<VenueSubmission | null> {
    const result = await queryOne<Record<string, unknown>>('SELECT * FROM venue_submissions WHERE id = $1', [
      submissionId,
    ]);

    if (!result) return null;
    return this.rowToSubmission(result);
  },

  /**
   * Get user's submissions
   */
  async getUserSubmissions(
    userId: string,
    options: { status?: string; limit?: number } = {}
  ): Promise<VenueSubmission[]> {
    const { status, limit = 50 } = options;

    const conditions = ['user_id = $1'];
    const values: unknown[] = [userId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    values.push(limit);

    const rows = await queryAll<Record<string, unknown>>(
      `SELECT * FROM venue_submissions
       WHERE ${conditions.join(' AND ')}
       ORDER BY submitted_at DESC
       LIMIT $${paramIndex}`,
      values
    );

    return rows.map((r) => this.rowToSubmission(r));
  },

  /**
   * Get pending submissions for admin review
   */
  async getPendingSubmissions(limit = 50): Promise<VenueSubmission[]> {
    const rows = await queryAll<Record<string, unknown>>(
      `SELECT * FROM venue_submissions
       WHERE status IN ('pending', 'under_review')
       ORDER BY submitted_at ASC
       LIMIT $1`,
      [limit]
    );

    return rows.map((r) => this.rowToSubmission(r));
  },

  /**
   * Approve a venue submission (admin only)
   */
  async approveSubmission(
    submissionId: string,
    reviewerId: string,
    options: { notes?: string } = {}
  ): Promise<{ submission: VenueSubmission; venue: Record<string, unknown> }> {
    const submission = await this.getSubmission(submissionId);
    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    if (submission.status !== 'pending' && submission.status !== 'under_review') {
      throw new ValidationError('Submission is not pending review');
    }

    // Create the venue
    const slug = generateSlug(submission.proposedName, submission.proposedBorough || undefined);

    const venueResult = await queryOne<Record<string, unknown>>(
      `INSERT INTO fitness_venues (
        name, slug, venue_type, latitude, longitude, address, city, borough,
        postal_code, equipment, is_free, is_24_hour, is_verified, data_source,
        created_by, photos
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, FALSE, 'crowdsourced', $13, $14::jsonb)
      RETURNING *`,
      [
        submission.proposedName,
        slug,
        submission.proposedVenueType,
        submission.latitude,
        submission.longitude,
        submission.proposedAddress,
        'New York',
        submission.proposedBorough,
        submission.proposedPostalCode,
        JSON.stringify(submission.proposedEquipment),
        submission.proposedIsFree,
        submission.proposedIs24Hour,
        submission.userId,
        JSON.stringify(submission.photoUrls),
      ]
    );

    // Update submission status
    const creditsAwarded = submission.photoUrls.length > 0 ? CONTRIBUTION_CREDITS.SUBMIT_WITH_PHOTO : CONTRIBUTION_CREDITS.SUBMIT_NEW_VENUE;

    await query(
      `UPDATE venue_submissions SET
        status = 'approved',
        reviewed_by = $2,
        reviewer_notes = $3,
        created_venue_id = $4,
        credits_awarded = $5,
        reviewed_at = NOW(),
        updated_at = NOW()
       WHERE id = $1`,
      [submissionId, reviewerId, options.notes, venueResult!.id, creditsAwarded]
    );

    // Award credits to submitter
    await this.awardCredits(submission.userId, creditsAwarded, 'venue_submit_new', {
      submissionId,
      venueId: venueResult!.id,
    });

    // Update contributor stats
    await this.updateContributorStats(submission.userId, {
      venuesSubmitted: 1,
      venuesApproved: 1,
    });

    log.info({ submissionId, venueId: venueResult!.id, reviewerId }, 'Submission approved');

    return {
      submission: { ...submission, status: 'approved', createdVenueId: venueResult!.id as string, creditsAwarded },
      venue: venueResult!,
    };
  },

  /**
   * Reject a venue submission
   */
  async rejectSubmission(
    submissionId: string,
    reviewerId: string,
    reason: string
  ): Promise<VenueSubmission> {
    const submission = await this.getSubmission(submissionId);
    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    await query(
      `UPDATE venue_submissions SET
        status = 'rejected',
        reviewed_by = $2,
        rejection_reason = $3,
        reviewed_at = NOW(),
        updated_at = NOW()
       WHERE id = $1`,
      [submissionId, reviewerId, reason]
    );

    // Apply penalty if clearly spam/false
    if (reason.toLowerCase().includes('spam') || reason.toLowerCase().includes('false')) {
      await this.awardCredits(submission.userId, CONTRIBUTION_PENALTIES.REJECTED_SUBMISSION, 'penalty', {
        reason: 'Rejected submission',
        submissionId,
      });
    }

    return { ...submission, status: 'rejected', rejectionReason: reason };
  },

  // ============================================
  // VENUE VERIFICATION ("I Was Here")
  // ============================================

  /**
   * Verify a venue exists (user confirms they visited)
   */
  async verifyVenueExists(
    venueId: string,
    userId: string,
    data: {
      latitude: number;
      longitude: number;
      notes?: string;
    }
  ): Promise<VenueContribution> {
    const venue = await venueService.getVenueById(venueId);
    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    // Calculate distance from venue
    const distance = calculateDistance(data.latitude, data.longitude, venue.latitude, venue.longitude);

    // Check if within reasonable distance (500 meters)
    const locationVerified = distance <= 500;

    // Check if user already verified today
    const existingVerification = await queryOne(
      `SELECT id FROM venue_contributions
       WHERE venue_id = $1 AND user_id = $2 AND contribution_type = 'verify_exists'
       AND DATE(contributed_at) = CURRENT_DATE`,
      [venueId, userId]
    );

    if (existingVerification) {
      throw new ValidationError('You have already verified this venue today');
    }

    // Check if this is the first verification for this venue
    const verificationCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM venue_contributions
       WHERE venue_id = $1 AND contribution_type = 'verify_exists'`,
      [venueId]
    );
    const isFirstVerification = parseInt(verificationCount?.count || '0') === 0;

    // Determine credits
    let credits = CONTRIBUTION_CREDITS.VERIFY_EXISTS;
    if (isFirstVerification) {
      credits += CONTRIBUTION_CREDITS.FIRST_VERIFICATION;
    }

    // Create contribution
    const result = await queryOne<Record<string, unknown>>(
      `INSERT INTO venue_contributions (
        venue_id, user_id, contribution_type, notes,
        verification_latitude, verification_longitude, distance_from_venue_meters,
        location_verified, credits_awarded
      ) VALUES ($1, $2, 'verify_exists', $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [venueId, userId, data.notes, data.latitude, data.longitude, distance, locationVerified, credits]
    );

    // Update venue verification count
    await query(
      `UPDATE fitness_venues SET verification_count = verification_count + 1, updated_at = NOW() WHERE id = $1`,
      [venueId]
    );

    // Award credits
    await this.awardCredits(userId, credits, 'venue_verify_exists', { venueId, distance, isFirstVerification });

    // Update contributor stats
    await this.updateContributorStats(userId, { verificationsCount: 1 });

    log.info({ venueId, userId, distance, credits }, 'Venue verification recorded');

    return this.rowToContribution(result!);
  },

  /**
   * Verify equipment at a venue
   */
  async verifyEquipment(
    venueId: string,
    userId: string,
    data: {
      equipment: EquipmentType[];
      accurate: boolean;
      notes?: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<VenueContribution> {
    const venue = await venueService.getVenueById(venueId);
    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    // Check daily limit
    const todayVerifications = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM venue_contributions
       WHERE venue_id = $1 AND user_id = $2 AND contribution_type = 'verify_equipment'
       AND DATE(contributed_at) = CURRENT_DATE`,
      [venueId, userId]
    );

    if (parseInt(todayVerifications?.count || '0') >= 3) {
      throw new ValidationError('You have reached the daily limit for equipment verifications');
    }

    let distance: number | undefined;
    let locationVerified = false;

    if (data.latitude && data.longitude) {
      distance = calculateDistance(data.latitude, data.longitude, venue.latitude, venue.longitude);
      locationVerified = distance <= 500;
    }

    // Create contribution
    const result = await queryOne<Record<string, unknown>>(
      `INSERT INTO venue_contributions (
        venue_id, user_id, contribution_type, details, notes,
        verification_latitude, verification_longitude, distance_from_venue_meters,
        location_verified, credits_awarded
      ) VALUES ($1, $2, 'verify_equipment', $3::jsonb, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        venueId,
        userId,
        JSON.stringify({ equipment: data.equipment, accurate: data.accurate }),
        data.notes,
        data.latitude,
        data.longitude,
        distance,
        locationVerified,
        CONTRIBUTION_CREDITS.VERIFY_EQUIPMENT,
      ]
    );

    // Update venue equipment if confirmed accurate
    if (data.accurate && locationVerified) {
      await query(
        `UPDATE fitness_venues SET equipment = $2::jsonb, updated_at = NOW() WHERE id = $1`,
        [venueId, JSON.stringify(data.equipment)]
      );
    }

    // Award credits
    await this.awardCredits(userId, CONTRIBUTION_CREDITS.VERIFY_EQUIPMENT, 'venue_verify_equipment', {
      venueId,
      accurate: data.accurate,
    });

    // Update contributor stats
    await this.updateContributorStats(userId, { verificationsCount: 1 });

    return this.rowToContribution(result!);
  },

  // ============================================
  // PHOTO CONTRIBUTIONS
  // ============================================

  /**
   * Add a photo to a venue
   */
  async addPhoto(
    venueId: string,
    userId: string,
    data: {
      url: string;
      thumbnailUrl?: string;
      caption?: string;
      photoType?: VenuePhoto['photoType'];
      equipmentShown?: EquipmentType[];
      latitude?: number;
      longitude?: number;
    }
  ): Promise<VenuePhoto> {
    const venue = await venueService.getVenueById(venueId);
    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    // Check daily photo limit
    const todayPhotos = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM venue_photos
       WHERE venue_id = $1 AND user_id = $2 AND DATE(uploaded_at) = CURRENT_DATE`,
      [venueId, userId]
    );

    if (parseInt(todayPhotos?.count || '0') >= 5) {
      throw new ValidationError('You have reached the daily limit for photo uploads');
    }

    const result = await queryOne<Record<string, unknown>>(
      `INSERT INTO venue_photos (
        venue_id, user_id, url, thumbnail_url, caption, photo_type, equipment_shown,
        photo_latitude, photo_longitude
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
      RETURNING *`,
      [
        venueId,
        userId,
        data.url,
        data.thumbnailUrl,
        data.caption,
        data.photoType || 'general',
        JSON.stringify(data.equipmentShown || []),
        data.latitude,
        data.longitude,
      ]
    );

    // Update venue photo count
    await query(`UPDATE fitness_venues SET photo_count = photo_count + 1, updated_at = NOW() WHERE id = $1`, [venueId]);

    // Create contribution record
    await query(
      `INSERT INTO venue_contributions (venue_id, user_id, contribution_type, photo_url, credits_awarded)
       VALUES ($1, $2, 'add_photo', $3, $4)`,
      [venueId, userId, data.url, CONTRIBUTION_CREDITS.ADD_PHOTO]
    );

    // Award credits
    await this.awardCredits(userId, CONTRIBUTION_CREDITS.ADD_PHOTO, 'venue_add_photo', { venueId, photoId: result!.id });

    // Update contributor stats
    await this.updateContributorStats(userId, { photosUploaded: 1 });

    return this.rowToPhoto(result!);
  },

  /**
   * Get photos for a venue
   */
  async getVenuePhotos(venueId: string, limit = 50): Promise<VenuePhoto[]> {
    const rows = await queryAll<Record<string, unknown>>(
      `SELECT * FROM venue_photos
       WHERE venue_id = $1 AND is_approved = TRUE AND is_flagged = FALSE
       ORDER BY is_primary DESC, uploaded_at DESC
       LIMIT $2`,
      [venueId, limit]
    );

    return rows.map((r) => this.rowToPhoto(r));
  },

  // ============================================
  // ISSUE REPORTS
  // ============================================

  /**
   * Report an issue with a venue
   */
  async reportIssue(
    venueId: string,
    userId: string,
    data: {
      reportType: string;
      description: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      photoUrls?: string[];
      duplicateVenueId?: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<VenueReport> {
    const venue = await venueService.getVenueById(venueId);
    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    // Check if user already reported this venue today
    const existingReport = await queryOne(
      `SELECT id FROM venue_reports
       WHERE venue_id = $1 AND user_id = $2 AND DATE(reported_at) = CURRENT_DATE`,
      [venueId, userId]
    );

    if (existingReport) {
      throw new ValidationError('You have already reported this venue today');
    }

    const result = await queryOne<Record<string, unknown>>(
      `INSERT INTO venue_reports (
        venue_id, user_id, report_type, description, severity, photo_urls,
        duplicate_venue_id, report_latitude, report_longitude
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
      RETURNING *`,
      [
        venueId,
        userId,
        data.reportType,
        data.description,
        data.severity || 'medium',
        JSON.stringify(data.photoUrls || []),
        data.duplicateVenueId,
        data.latitude,
        data.longitude,
      ]
    );

    // Update venue report count
    await query(`UPDATE fitness_venues SET report_count = report_count + 1, updated_at = NOW() WHERE id = $1`, [venueId]);

    // Update contributor stats
    await this.updateContributorStats(userId, { reportsSubmitted: 1 });

    log.info({ venueId, userId, reportType: data.reportType }, 'Issue report created');

    return this.rowToReport(result!);
  },

  /**
   * Resolve an issue report (admin)
   */
  async resolveReport(
    reportId: string,
    resolverId: string,
    data: {
      status: 'resolved_fixed' | 'resolved_closed' | 'dismissed';
      resolutionNotes: string;
      actionTaken?: string;
    }
  ): Promise<VenueReport> {
    const report = await queryOne<Record<string, unknown>>('SELECT * FROM venue_reports WHERE id = $1', [reportId]);
    if (!report) {
      throw new NotFoundError('Report not found');
    }

    // Determine credits
    let credits = 0;
    if (data.status === 'resolved_fixed') {
      credits = CONTRIBUTION_CREDITS.REPORT_VALID_ISSUE;
    } else if (data.status === 'dismissed' && data.resolutionNotes.toLowerCase().includes('false')) {
      credits = CONTRIBUTION_PENALTIES.FALSE_REPORT;
    }

    await query(
      `UPDATE venue_reports SET
        status = $2,
        resolution_notes = $3,
        action_taken = $4,
        resolved_by = $5,
        credits_awarded = $6,
        resolved_at = NOW()
       WHERE id = $1`,
      [reportId, data.status, data.resolutionNotes, data.actionTaken, resolverId, credits]
    );

    // Award/deduct credits
    if (credits !== 0) {
      await this.awardCredits(report.user_id as string, credits, 'venue_report', {
        reportId,
        status: data.status,
      });
    }

    // Update contributor stats
    if (data.status === 'resolved_fixed') {
      await this.updateContributorStats(report.user_id as string, { reportsResolved: 1 });
    }

    return this.rowToReport({ ...report, status: data.status, resolution_notes: data.resolutionNotes });
  },

  // ============================================
  // CONTRIBUTOR STATS & CREDITS
  // ============================================

  /**
   * Get contributor stats for a user
   */
  async getContributorStats(userId: string): Promise<ContributorStats | null> {
    const result = await queryOne<Record<string, unknown>>(
      'SELECT * FROM user_venue_contribution_stats WHERE user_id = $1',
      [userId]
    );

    if (!result) {
      // Create default stats
      await query(
        `INSERT INTO user_venue_contribution_stats (user_id) VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
      return {
        userId,
        venuesSubmitted: 0,
        venuesApproved: 0,
        verificationsCount: 0,
        photosUploaded: 0,
        reportsSubmitted: 0,
        reportsResolved: 0,
        equipmentUpdates: 0,
        approvalRate: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalCreditsEarned: 0,
        contributorLevel: 1,
        contributorTitle: 'Explorer',
      };
    }

    return {
      userId: result.user_id as string,
      venuesSubmitted: result.venues_submitted as number,
      venuesApproved: result.venues_approved as number,
      verificationsCount: result.verifications_count as number,
      photosUploaded: result.photos_uploaded as number,
      reportsSubmitted: result.reports_submitted as number,
      reportsResolved: result.reports_resolved as number,
      equipmentUpdates: result.equipment_updates as number,
      approvalRate: parseFloat(result.approval_rate as string) || 0,
      currentStreak: result.current_contribution_streak as number,
      longestStreak: result.longest_contribution_streak as number,
      totalCreditsEarned: result.total_credits_earned as number,
      contributorLevel: result.contributor_level as number,
      contributorTitle: result.contributor_title as string,
      lastContributionAt: result.last_contribution_at ? new Date(result.last_contribution_at as string) : undefined,
    };
  },

  /**
   * Update contributor stats
   */
  async updateContributorStats(
    userId: string,
    updates: Partial<{
      venuesSubmitted: number;
      venuesApproved: number;
      verificationsCount: number;
      photosUploaded: number;
      reportsSubmitted: number;
      reportsResolved: number;
      equipmentUpdates: number;
    }>
  ): Promise<void> {
    const increments: string[] = [];
    const values: unknown[] = [userId];
    let paramIndex = 2;

    const fieldMap: Record<string, string> = {
      venuesSubmitted: 'venues_submitted',
      venuesApproved: 'venues_approved',
      verificationsCount: 'verifications_count',
      photosUploaded: 'photos_uploaded',
      reportsSubmitted: 'reports_submitted',
      reportsResolved: 'reports_resolved',
      equipmentUpdates: 'equipment_updates',
    };

    for (const [key, field] of Object.entries(fieldMap)) {
      if (updates[key as keyof typeof updates]) {
        increments.push(`${field} = ${field} + $${paramIndex}`);
        values.push(updates[key as keyof typeof updates]);
        paramIndex++;
      }
    }

    if (increments.length === 0) return;

    // Update streak
    await query(
      `INSERT INTO user_venue_contribution_stats (user_id, last_contribution_date, current_contribution_streak)
       VALUES ($1, CURRENT_DATE, 1)
       ON CONFLICT (user_id) DO UPDATE SET
         ${increments.join(', ')},
         current_contribution_streak = CASE
           WHEN user_venue_contribution_stats.last_contribution_date = CURRENT_DATE - 1
             THEN user_venue_contribution_stats.current_contribution_streak + 1
           WHEN user_venue_contribution_stats.last_contribution_date = CURRENT_DATE
             THEN user_venue_contribution_stats.current_contribution_streak
           ELSE 1
         END,
         longest_contribution_streak = GREATEST(
           user_venue_contribution_stats.longest_contribution_streak,
           CASE
             WHEN user_venue_contribution_stats.last_contribution_date = CURRENT_DATE - 1
               THEN user_venue_contribution_stats.current_contribution_streak + 1
             ELSE user_venue_contribution_stats.current_contribution_streak
           END
         ),
         last_contribution_date = CURRENT_DATE,
         last_contribution_at = NOW(),
         updated_at = NOW()`,
      values
    );

    // Check for level up
    await this.checkContributorLevelUp(userId);
  },

  /**
   * Check and update contributor level
   */
  async checkContributorLevelUp(userId: string): Promise<void> {
    const stats = await this.getContributorStats(userId);
    if (!stats) return;

    const totalActivity =
      stats.venuesApproved * 10 +
      stats.verificationsCount * 2 +
      stats.photosUploaded * 3 +
      stats.reportsResolved * 5;

    let newLevel = 1;
    let newTitle = 'Explorer';

    if (totalActivity >= 1000) {
      newLevel = 10;
      newTitle = 'Legend';
    } else if (totalActivity >= 500) {
      newLevel = 9;
      newTitle = 'Elite Contributor';
    } else if (totalActivity >= 300) {
      newLevel = 8;
      newTitle = 'Master Mapper';
    } else if (totalActivity >= 200) {
      newLevel = 7;
      newTitle = 'Expert';
    } else if (totalActivity >= 120) {
      newLevel = 6;
      newTitle = 'Veteran';
    } else if (totalActivity >= 80) {
      newLevel = 5;
      newTitle = 'Established';
    } else if (totalActivity >= 50) {
      newLevel = 4;
      newTitle = 'Regular';
    } else if (totalActivity >= 25) {
      newLevel = 3;
      newTitle = 'Active';
    } else if (totalActivity >= 10) {
      newLevel = 2;
      newTitle = 'Contributor';
    }

    if (newLevel !== stats.contributorLevel) {
      await query(
        `UPDATE user_venue_contribution_stats SET contributor_level = $2, contributor_title = $3 WHERE user_id = $1`,
        [userId, newLevel, newTitle]
      );
    }
  },

  /**
   * Award credits to user (integrates with economy system)
   */
  async awardCredits(
    userId: string,
    amount: number,
    reason: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    // This would integrate with the existing wallet/credits system
    // For now, we track in the contribution stats
    await query(
      `UPDATE user_venue_contribution_stats
       SET total_credits_earned = total_credits_earned + $2, updated_at = NOW()
       WHERE user_id = $1`,
      [userId, Math.abs(amount)]
    );

    // TODO: Integrate with actual credit_ledger via earningService
    log.info({ userId, amount, reason, metadata }, 'Credits awarded for contribution');
  },

  // ============================================
  // HELPERS
  // ============================================

  rowToSubmission(row: Record<string, unknown>): VenueSubmission {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      status: row.status as VenueSubmission['status'],
      proposedName: row.proposed_name as string,
      proposedVenueType: row.proposed_venue_type as VenueType,
      latitude: parseFloat(row.latitude as string),
      longitude: parseFloat(row.longitude as string),
      proposedAddress: row.proposed_address as string | undefined,
      proposedCity: row.proposed_city as string,
      proposedBorough: row.proposed_borough as string | undefined,
      proposedPostalCode: row.proposed_postal_code as string | undefined,
      proposedEquipment: (row.proposed_equipment as EquipmentType[]) || [],
      proposedHours: row.proposed_hours as Record<string, string> | undefined,
      proposedIsFree: row.proposed_is_free as boolean,
      proposedIs24Hour: row.proposed_is_24_hour as boolean,
      photoUrls: (row.photo_urls as string[]) || [],
      notes: row.notes as string | undefined,
      howDiscovered: row.how_discovered as string | undefined,
      locationAccuracyMeters: row.location_accuracy_meters
        ? parseFloat(row.location_accuracy_meters as string)
        : undefined,
      reviewedBy: row.reviewed_by as string | undefined,
      reviewerNotes: row.reviewer_notes as string | undefined,
      rejectionReason: row.rejection_reason as string | undefined,
      createdVenueId: row.created_venue_id as string | undefined,
      mergedIntoVenueId: row.merged_into_venue_id as string | undefined,
      detectedDuplicateVenueId: row.detected_duplicate_venue_id as string | undefined,
      duplicateDistanceMeters: row.duplicate_distance_meters
        ? parseFloat(row.duplicate_distance_meters as string)
        : undefined,
      creditsAwarded: row.credits_awarded as number,
      submittedAt: new Date(row.submitted_at as string),
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at as string) : undefined,
    };
  },

  rowToContribution(row: Record<string, unknown>): VenueContribution {
    return {
      id: row.id as string,
      venueId: row.venue_id as string,
      userId: row.user_id as string,
      contributionType: row.contribution_type as string,
      details: (row.details as Record<string, unknown>) || {},
      notes: row.notes as string | undefined,
      photoUrl: row.photo_url as string | undefined,
      verificationLatitude: row.verification_latitude ? parseFloat(row.verification_latitude as string) : undefined,
      verificationLongitude: row.verification_longitude ? parseFloat(row.verification_longitude as string) : undefined,
      distanceFromVenueMeters: row.distance_from_venue_meters
        ? parseFloat(row.distance_from_venue_meters as string)
        : undefined,
      locationVerified: row.location_verified as boolean,
      equipmentItemId: row.equipment_item_id as string | undefined,
      oldCondition: row.old_condition as string | undefined,
      newCondition: row.new_condition as string | undefined,
      creditsAwarded: row.credits_awarded as number,
      isFlagged: row.is_flagged as boolean,
      reviewStatus: row.review_status as 'pending' | 'approved' | 'rejected',
      contributedAt: new Date(row.contributed_at as string),
    };
  },

  rowToPhoto(row: Record<string, unknown>): VenuePhoto {
    return {
      id: row.id as string,
      venueId: row.venue_id as string,
      userId: row.user_id as string | undefined,
      url: row.url as string,
      thumbnailUrl: row.thumbnail_url as string | undefined,
      caption: row.caption as string | undefined,
      photoType: row.photo_type as VenuePhoto['photoType'],
      equipmentShown: (row.equipment_shown as EquipmentType[]) || [],
      isApproved: row.is_approved as boolean,
      isPrimary: row.is_primary as boolean,
      isFlagged: row.is_flagged as boolean,
      uploadedAt: new Date(row.uploaded_at as string),
    };
  },

  rowToReport(row: Record<string, unknown>): VenueReport {
    return {
      id: row.id as string,
      venueId: row.venue_id as string,
      userId: row.user_id as string,
      reportType: row.report_type as string,
      description: row.description as string,
      severity: row.severity as VenueReport['severity'],
      photoUrls: (row.photo_urls as string[]) || [],
      status: row.status as VenueReport['status'],
      resolutionNotes: row.resolution_notes as string | undefined,
      actionTaken: row.action_taken as string | undefined,
      creditsAwarded: row.credits_awarded as number,
      reportedAt: new Date(row.reported_at as string),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at as string) : undefined,
    };
  },
};

export default crowdsourcingService;
