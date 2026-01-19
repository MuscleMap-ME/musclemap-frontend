/**
 * Checkin Service
 *
 * Handles venue check-in/check-out operations and active presence tracking.
 */

import { queryOne, queryAll, query } from '../../db/client';
import { ValidationError, NotFoundError } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import cache from '../../lib/cache.service';
import { VenueCheckin, CheckinParams, VENUE_CONSTANTS } from './types';
import venueService from './venue.service';
import locationVerificationService from './location-verification.service';

const log = loggers.core;

// Helper to convert DB row to VenueCheckin
function rowToCheckin(row: Record<string, unknown>): VenueCheckin {
  return {
    id: row.id as string,
    venueId: row.venue_id as string,
    userId: row.user_id as string,
    latitude: parseFloat(row.latitude as string),
    longitude: parseFloat(row.longitude as string),
    distanceFromVenueMeters: row.distance_from_venue_meters
      ? parseFloat(row.distance_from_venue_meters as string)
      : undefined,
    locationAccuracyMeters: row.location_accuracy_meters
      ? parseFloat(row.location_accuracy_meters as string)
      : undefined,
    isActive: row.is_active as boolean,
    checkedInAt: new Date(row.checked_in_at as string),
    checkedOutAt: row.checked_out_at ? new Date(row.checked_out_at as string) : undefined,
    autoCheckout: row.auto_checkout as boolean,
    workoutId: row.workout_id as string | undefined,
    createdAt: new Date(row.created_at as string),
  };
}

export const checkinService = {
  /**
   * Check in to a venue
   */
  async checkin(params: CheckinParams): Promise<VenueCheckin> {
    const { venueId, userId, latitude, longitude, locationAccuracyMeters, workoutId } = params;

    // Get venue
    const venue = await venueService.getVenueById(venueId);
    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    if (!venue.isActive) {
      throw new ValidationError('This venue is currently inactive');
    }

    // Verify location
    const locationResult = await locationVerificationService.verifyUserAtVenue(userId, venueId, {
      latitude,
      longitude,
      accuracy: locationAccuracyMeters,
      timestamp: new Date(),
    });

    if (!locationResult.verified) {
      throw new ValidationError(
        locationResult.warning || `You must be within ${venue.radiusMeters}m of the venue to check in`
      );
    }

    // Check if user is already checked in somewhere
    const existingCheckin = await queryOne<Record<string, unknown>>(
      `SELECT * FROM venue_checkins WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    // If checked in elsewhere, auto-checkout first
    if (existingCheckin && existingCheckin.venue_id !== venueId) {
      await this.checkout(existingCheckin.venue_id as string, userId, true);
    }

    // If already checked in to this venue, return existing
    if (existingCheckin && existingCheckin.venue_id === venueId) {
      return rowToCheckin(existingCheckin);
    }

    // Create new checkin
    const result = await queryOne<Record<string, unknown>>(
      `INSERT INTO venue_checkins (
        venue_id, user_id, latitude, longitude, distance_from_venue_meters,
        location_accuracy_meters, workout_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [venueId, userId, latitude, longitude, locationResult.distanceMeters, locationAccuracyMeters, workoutId]
    );

    if (!result) {
      throw new Error('Failed to create checkin');
    }

    // Update venue stats
    await query(
      `UPDATE fitness_venues SET
        checkin_count_today = checkin_count_today + 1,
        checkin_count_total = checkin_count_total + 1
       WHERE id = $1`,
      [venueId]
    );

    // Update membership stats if member
    await query(
      `UPDATE venue_memberships SET
        checkin_count = checkin_count + 1,
        last_checkin_at = NOW()
       WHERE venue_id = $1 AND user_id = $2`,
      [venueId, userId]
    );

    // Auto-join venue if not a member
    const isMember = await venueService.isMember(venueId, userId);
    if (!isMember) {
      await venueService.joinVenue(venueId, userId);
    }

    // Invalidate cache
    await cache.del(`cache:venue:${venueId}`);

    log.info({ userId, venueId, distance: locationResult.distanceMeters }, 'User checked in to venue');
    return rowToCheckin(result);
  },

  /**
   * Check out from a venue
   */
  async checkout(venueId: string, userId: string, autoCheckout = false): Promise<void> {
    const result = await query(
      `UPDATE venue_checkins SET
        is_active = FALSE,
        checked_out_at = NOW(),
        auto_checkout = $3
       WHERE venue_id = $1 AND user_id = $2 AND is_active = TRUE`,
      [venueId, userId, autoCheckout]
    );

    if (result.rowCount && result.rowCount > 0) {
      log.info({ userId, venueId, autoCheckout }, 'User checked out from venue');
    }
  },

  /**
   * Get user's active checkin (if any)
   */
  async getActiveCheckin(userId: string): Promise<VenueCheckin | null> {
    const result = await queryOne<Record<string, unknown>>(
      `SELECT * FROM venue_checkins WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    if (!result) return null;
    return rowToCheckin(result);
  },

  /**
   * Get users currently checked in at a venue
   */
  async getUsersAtVenue(
    venueId: string,
    excludeUserId?: string
  ): Promise<
    {
      checkin: VenueCheckin;
      user: { id: string; username: string; displayName?: string; avatarUrl?: string };
    }[]
  > {
    const conditions = ['vc.venue_id = $1', 'vc.is_active = TRUE'];
    const values: unknown[] = [venueId];

    if (excludeUserId) {
      conditions.push('vc.user_id != $2');
      values.push(excludeUserId);
    }

    const rows = await queryAll<Record<string, unknown>>(
      `SELECT vc.*, u.id as user_id, u.username, u.display_name, u.avatar_url
       FROM venue_checkins vc
       JOIN users u ON u.id = vc.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY vc.checked_in_at DESC`,
      values
    );

    return rows.map((row) => ({
      checkin: rowToCheckin(row),
      user: {
        id: row.user_id as string,
        username: row.username as string,
        displayName: row.display_name as string | undefined,
        avatarUrl: row.avatar_url as string | undefined,
      },
    }));
  },

  /**
   * Check if user is currently at a specific venue
   */
  async isUserAtVenue(userId: string, venueId: string): Promise<boolean> {
    const result = await queryOne(
      `SELECT 1 FROM venue_checkins WHERE user_id = $1 AND venue_id = $2 AND is_active = TRUE`,
      [userId, venueId]
    );
    return !!result;
  },

  /**
   * Get user's checkin history
   */
  async getUserCheckinHistory(
    userId: string,
    options: { limit?: number; venueId?: string; cursor?: { checkedInAt: Date; id: string } } = {}
  ): Promise<{ checkins: (VenueCheckin & { venueName: string })[]; hasMore: boolean }> {
    const { limit = 50, venueId, cursor } = options;

    const conditions = ['vc.user_id = $1'];
    const values: unknown[] = [userId];
    let paramIndex = 2;

    if (venueId) {
      conditions.push(`vc.venue_id = $${paramIndex}`);
      values.push(venueId);
      paramIndex++;
    }

    if (cursor) {
      conditions.push(`(vc.checked_in_at, vc.id) < ($${paramIndex}, $${paramIndex + 1})`);
      values.push(cursor.checkedInAt, cursor.id);
      paramIndex += 2;
    }

    values.push(limit + 1);

    const rows = await queryAll<Record<string, unknown>>(
      `SELECT vc.*, fv.name as venue_name
       FROM venue_checkins vc
       JOIN fitness_venues fv ON fv.id = vc.venue_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY vc.checked_in_at DESC, vc.id DESC
       LIMIT $${paramIndex}`,
      values
    );

    const hasMore = rows.length > limit;
    const checkins = rows.slice(0, limit).map((row) => ({
      ...rowToCheckin(row),
      venueName: row.venue_name as string,
    }));

    return { checkins, hasMore };
  },

  /**
   * Auto-checkout stale checkins (run periodically)
   */
  async autoCheckoutStale(): Promise<number> {
    const result = await query(
      `UPDATE venue_checkins SET
        is_active = FALSE,
        checked_out_at = NOW(),
        auto_checkout = TRUE
       WHERE is_active = TRUE
         AND checked_in_at < NOW() - INTERVAL '1 minute' * $1`,
      [VENUE_CONSTANTS.AUTO_CHECKOUT_MINUTES]
    );

    const count = result.rowCount || 0;
    if (count > 0) {
      log.info({ count }, 'Auto-checked out stale checkins');
    }
    return count;
  },

  /**
   * Get venue checkin count for today
   */
  async getVenueCheckinCountToday(venueId: string): Promise<number> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM venue_checkins
       WHERE venue_id = $1 AND DATE(checked_in_at) = CURRENT_DATE`,
      [venueId]
    );
    return parseInt(result?.count || '0');
  },

  /**
   * Update checkin with workout ID (when user starts workout at venue)
   */
  async linkWorkout(userId: string, workoutId: string): Promise<void> {
    await query(
      `UPDATE venue_checkins SET workout_id = $2
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId, workoutId]
    );
  },
};

export default checkinService;
