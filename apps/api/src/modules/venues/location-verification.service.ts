/**
 * Location Verification Service
 *
 * Handles GPS verification, distance calculations, and anti-spoofing measures.
 */

import { queryOne, queryAll } from '../../db/client';
import { loggers } from '../../lib/logger';
import {
  LocationCoordinates,
  LocationVerificationResult,
  GpsSpoofingCheckResult,
  VENUE_CONSTANTS,
} from './types';
import venueService from './venue.service';

const log = loggers.core;

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export const locationVerificationService = {
  /**
   * Verify user is at a specific venue
   */
  async verifyUserAtVenue(
    userId: string,
    venueId: string,
    coordinates: LocationCoordinates
  ): Promise<LocationVerificationResult> {
    const venue = await venueService.getVenueById(venueId);
    if (!venue) {
      return {
        verified: false,
        distanceMeters: 0,
        confidence: 'low',
        method: 'gps',
        warning: 'Venue not found',
        suspiciousFlags: [],
      };
    }

    const distanceMeters = haversineDistance(
      coordinates.latitude,
      coordinates.longitude,
      venue.latitude,
      venue.longitude
    );

    const suspiciousFlags: string[] = [];

    // Check if within venue radius
    const isWithinRadius = distanceMeters <= venue.radiusMeters;

    // Determine confidence based on GPS accuracy
    let confidence: 'high' | 'medium' | 'low' = 'high';
    if (coordinates.accuracy) {
      if (coordinates.accuracy > VENUE_CONSTANTS.MIN_LOCATION_CONFIDENCE_METERS) {
        confidence = 'low';
        suspiciousFlags.push('low_gps_accuracy');
      } else if (coordinates.accuracy > 50) {
        confidence = 'medium';
      }
    }

    // Check for GPS spoofing indicators
    const spoofCheck = await this.checkGpsSpoofing(userId, coordinates);
    if (spoofCheck.isSuspicious) {
      confidence = 'low';
      suspiciousFlags.push(...spoofCheck.reasons);
    }

    const result: LocationVerificationResult = {
      verified: isWithinRadius && confidence !== 'low',
      distanceMeters,
      confidence,
      method: 'gps',
      suspiciousFlags,
    };

    if (!isWithinRadius) {
      result.warning = `User is ${Math.round(distanceMeters)}m from venue (max: ${venue.radiusMeters}m)`;
    }

    log.debug({ userId, venueId, distanceMeters, verified: result.verified }, 'Location verification');
    return result;
  },

  /**
   * Check for GPS spoofing indicators
   */
  async checkGpsSpoofing(userId: string, coordinates: LocationCoordinates): Promise<GpsSpoofingCheckResult> {
    const reasons: string[] = [];
    let suspicionScore = 0;

    // 1. Check for impossible location jumps
    const recentCheckins = await queryAll<{
      latitude: string;
      longitude: string;
      checked_in_at: string;
    }>(
      `SELECT latitude, longitude, checked_in_at
       FROM venue_checkins
       WHERE user_id = $1 AND checked_in_at > NOW() - INTERVAL '1 hour'
       ORDER BY checked_in_at DESC
       LIMIT 5`,
      [userId]
    );

    if (recentCheckins.length > 0) {
      const lastCheckin = recentCheckins[0];
      const lastLat = parseFloat(lastCheckin.latitude);
      const lastLng = parseFloat(lastCheckin.longitude);
      const lastTime = new Date(lastCheckin.checked_in_at);
      const now = coordinates.timestamp || new Date();

      const distance = haversineDistance(coordinates.latitude, coordinates.longitude, lastLat, lastLng);
      const timeDiffSeconds = (now.getTime() - lastTime.getTime()) / 1000;

      if (timeDiffSeconds > 0) {
        const speed = distance / timeDiffSeconds; // meters per second
        if (speed > VENUE_CONSTANTS.MAX_LOCATION_JUMP_METERS_PER_SECOND) {
          reasons.push('impossible_speed');
          suspicionScore += 50;
        }
      }
    }

    // 2. Check for suspiciously round coordinates (common in spoofing)
    const latDecimals = (coordinates.latitude.toString().split('.')[1] || '').length;
    const lngDecimals = (coordinates.longitude.toString().split('.')[1] || '').length;
    if (latDecimals < 4 || lngDecimals < 4) {
      reasons.push('low_precision_coordinates');
      suspicionScore += 20;
    }

    // 3. Check for exact duplicate coordinates from different times
    const exactMatches = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM venue_checkins
       WHERE user_id = $1
         AND latitude = $2
         AND longitude = $3
         AND checked_in_at > NOW() - INTERVAL '24 hours'`,
      [userId, coordinates.latitude, coordinates.longitude]
    );

    if (parseInt(exactMatches?.count || '0') > 5) {
      reasons.push('repeated_exact_coordinates');
      suspicionScore += 30;
    }

    // 4. Check user's device fingerprint history for known spoofing devices
    // (This would require integration with device attestation - simplified here)

    return {
      isSuspicious: suspicionScore >= 50,
      reasons,
      confidence: Math.max(0, 100 - suspicionScore),
    };
  },

  /**
   * Verify witness is near claimer (within MAX_WITNESS_DISTANCE_METERS)
   */
  async verifyWitnessProximity(
    claimerCoordinates: LocationCoordinates,
    witnessCoordinates: LocationCoordinates
  ): Promise<{
    verified: boolean;
    distanceMeters: number;
    warning?: string;
  }> {
    const distance = haversineDistance(
      claimerCoordinates.latitude,
      claimerCoordinates.longitude,
      witnessCoordinates.latitude,
      witnessCoordinates.longitude
    );

    const verified = distance <= VENUE_CONSTANTS.MAX_WITNESS_DISTANCE_METERS;

    return {
      verified,
      distanceMeters: distance,
      warning: verified
        ? undefined
        : `Witness is ${Math.round(distance)}m from claimer (max: ${VENUE_CONSTANTS.MAX_WITNESS_DISTANCE_METERS}m)`,
    };
  },

  /**
   * Calculate distance between two coordinates
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return haversineDistance(lat1, lng1, lat2, lng2);
  },

  /**
   * Get users currently checked in at a venue
   */
  async getUsersAtVenue(venueId: string, excludeUserId?: string): Promise<
    {
      userId: string;
      username: string;
      displayName?: string;
      avatarUrl?: string;
      checkedInAt: Date;
    }[]
  > {
    const conditions = ['vc.venue_id = $1', 'vc.is_active = TRUE'];
    const values: unknown[] = [venueId];

    if (excludeUserId) {
      conditions.push('vc.user_id != $2');
      values.push(excludeUserId);
    }

    const rows = await queryAll<Record<string, unknown>>(
      `SELECT vc.user_id, vc.checked_in_at, u.username, u.display_name, u.avatar_url
       FROM venue_checkins vc
       JOIN users u ON u.id = vc.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY vc.checked_in_at DESC
       LIMIT 50`,
      values
    );

    return rows.map((row) => ({
      userId: row.user_id as string,
      username: row.username as string,
      displayName: row.display_name as string | undefined,
      avatarUrl: row.avatar_url as string | undefined,
      checkedInAt: new Date(row.checked_in_at as string),
    }));
  },

  /**
   * Check if user has had suspicious activity recently
   */
  async hasRecentSuspiciousActivity(userId: string): Promise<boolean> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM venue_records
       WHERE user_id = $1
         AND status IN ('rejected', 'disputed')
         AND created_at > NOW() - INTERVAL '24 hours'`,
      [userId]
    );

    return parseInt(result?.count || '0') >= 2;
  },

  /**
   * Log location verification attempt for auditing
   */
  async logVerificationAttempt(
    userId: string,
    venueId: string,
    coordinates: LocationCoordinates,
    result: LocationVerificationResult
  ): Promise<void> {
    // This could be expanded to write to an audit table
    log.info(
      {
        userId,
        venueId,
        latitude: coordinates.latitude.toFixed(5), // Reduce precision for logging
        longitude: coordinates.longitude.toFixed(5),
        verified: result.verified,
        distanceMeters: result.distanceMeters,
        confidence: result.confidence,
        suspiciousFlags: result.suspiciousFlags,
      },
      'Location verification attempt'
    );
  },
};

export default locationVerificationService;
