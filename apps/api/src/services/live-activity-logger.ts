/**
 * Live Activity Logger Service
 *
 * Logs anonymous activity events for real-time monitoring.
 *
 * Privacy-First Architecture:
 * - Privacy settings are checked BEFORE any logging (gate at collection)
 * - Events are completely anonymous (no user_id stored)
 * - Users who opt out are NEVER logged - not even aggregated
 * - Location data is only included if user explicitly allows it
 */

import { query, queryOne, queryAll } from '../db/client';
import { publish, PUBSUB_CHANNELS } from '../lib/pubsub';
import { loggers } from '../lib/logger';
import crypto from 'crypto';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

export interface ActivityEventInput {
  type: 'workout.completed' | 'exercise.completed' | 'achievement.earned';
  exerciseId?: string;
  exerciseName?: string;
  muscleGroup?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    countryCode?: string;
    region?: string;
    city?: string;
  };
}

export interface LiveActivityEvent {
  id: string;
  type: string;
  timestamp: string;
  exerciseName?: string;
  muscleGroup?: string;
  geoBucket?: string;
  city?: string;
  country?: string;
}

interface PrivacySettings {
  minimalist_mode: boolean;
  opt_out_community_feed: boolean;
  exclude_from_activity_feed: boolean;
  exclude_from_location_features: boolean;
}

// ============================================
// PRIVACY CHECK
// ============================================

/**
 * Check user's privacy settings to determine if activity should be logged.
 * Returns null if user has opted out (activity should NOT be logged).
 */
async function getPrivacySettings(userId: string): Promise<PrivacySettings | null> {
  const settings = await queryOne<PrivacySettings>(
    `SELECT
       COALESCE(minimalist_mode, FALSE) as minimalist_mode,
       COALESCE(opt_out_community_feed, FALSE) as opt_out_community_feed,
       COALESCE(exclude_from_activity_feed, FALSE) as exclude_from_activity_feed,
       COALESCE(exclude_from_location_features, FALSE) as exclude_from_location_features
     FROM user_privacy_mode
     WHERE user_id = $1`,
    [userId]
  );

  // If no privacy settings exist, user hasn't opted out (default is opted IN)
  if (!settings) {
    return {
      minimalist_mode: false,
      opt_out_community_feed: false,
      exclude_from_activity_feed: false,
      exclude_from_location_features: false,
    };
  }

  return settings;
}

/**
 * Check if user has opted out of activity logging.
 */
function isOptedOut(settings: PrivacySettings): boolean {
  return (
    settings.minimalist_mode ||
    settings.opt_out_community_feed ||
    settings.exclude_from_activity_feed
  );
}

// ============================================
// GEO HASHING
// ============================================

/**
 * Create a geo bucket hash from coordinates.
 * This provides approximate location for clustering without storing exact coordinates.
 * Resolution: ~10km grid cells
 */
function hashLocation(lat?: number, lng?: number): string | null {
  if (lat === undefined || lng === undefined) return null;

  // Round to ~10km resolution (0.1 degree ≈ 11km)
  const latBucket = Math.round(lat * 10) / 10;
  const lngBucket = Math.round(lng * 10) / 10;

  // Create a hash that doesn't reveal exact coordinates
  const input = `${latBucket},${lngBucket}`;
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 12);
}

/**
 * Get approximate center coordinates for a geo bucket.
 * This is used for map display - returns center of the ~10km cell.
 */
export function getGeoBucketCenter(geoBucket: string): { lat: number; lng: number } | null {
  // We can't reverse the hash, so this function needs a lookup table
  // For now, return null - the frontend will use city/country for display
  return null;
}

// ============================================
// ACTIVITY LOGGING
// ============================================

/**
 * Log an anonymous activity event.
 *
 * CRITICAL: This function respects privacy settings absolutely.
 * If the user has opted out, NO activity is logged - not even anonymized.
 *
 * @param userId - The user's ID (used ONLY to check privacy settings)
 * @param event - The activity event to log
 * @returns true if logged, false if user opted out
 */
export async function logActivityEvent(
  userId: string,
  event: ActivityEventInput
): Promise<boolean> {
  try {
    // CRITICAL: Check privacy settings BEFORE any logging
    const privacySettings = await getPrivacySettings(userId);

    if (!privacySettings || isOptedOut(privacySettings)) {
      // User has opted out - DO NOT LOG ANYTHING
      log.debug({ userId: userId.substring(0, 8) + '...' }, 'Activity not logged - user opted out');
      return false;
    }

    // Build anonymous event (NO user ID stored)
    const eventId = `lae_${crypto.randomBytes(12).toString('hex')}`;
    const timestamp = new Date();

    // Only include location if user allows it
    let countryCode: string | null = null;
    let region: string | null = null;
    let city: string | null = null;
    let geoBucket: string | null = null;

    if (!privacySettings.exclude_from_location_features && event.location) {
      countryCode = event.location.countryCode || null;
      region = event.location.region || null;
      city = event.location.city || null;
      geoBucket = hashLocation(event.location.latitude, event.location.longitude);
    }

    // Insert anonymous event into database
    await query(
      `INSERT INTO live_activity_events
       (id, event_type, exercise_id, exercise_name, muscle_group, country_code, region, city, geo_bucket, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        eventId,
        event.type,
        event.exerciseId || null,
        event.exerciseName || null,
        event.muscleGroup || null,
        countryCode,
        region,
        city,
        geoBucket,
        timestamp,
      ]
    );

    // Publish to real-time channel (also anonymous)
    const liveEvent: LiveActivityEvent = {
      id: eventId,
      type: event.type,
      timestamp: timestamp.toISOString(),
      exerciseName: event.exerciseName,
      muscleGroup: event.muscleGroup,
      geoBucket: geoBucket || undefined,
      city: city || undefined,
      country: countryCode || undefined,
    };

    await publish(PUBSUB_CHANNELS.LIVE_ACTIVITY, liveEvent);

    log.debug({ eventType: event.type, muscleGroup: event.muscleGroup }, 'Anonymous activity logged');
    return true;
  } catch (error) {
    log.error({ error }, 'Failed to log activity event');
    return false;
  }
}

// ============================================
// CLEANUP (24-HOUR RETENTION)
// ============================================

/**
 * Delete activity events older than 24 hours.
 * This should be called by a scheduled job.
 */
export async function cleanupOldEvents(): Promise<number> {
  try {
    const result = await query(
      `DELETE FROM live_activity_events
       WHERE created_at < NOW() - INTERVAL '24 hours'
       RETURNING id`
    );

    const deletedCount = (result as any)?.rowCount || 0;

    if (deletedCount > 0) {
      log.info({ deletedCount }, 'Cleaned up old live activity events');
    }

    return deletedCount;
  } catch (error) {
    log.error({ error }, 'Failed to cleanup old activity events');
    return 0;
  }
}

// ============================================
// QUERY HELPERS
// ============================================

/**
 * Get activity stats for a time window.
 */
export async function getActivityStats(
  minutes: number = 60
): Promise<{
  total: number;
  byMuscle: Record<string, number>;
  byCountry: Record<string, number>;
  byType: Record<string, number>;
}> {
  const stats = {
    total: 0,
    byMuscle: {} as Record<string, number>,
    byCountry: {} as Record<string, number>,
    byType: {} as Record<string, number>,
  };

  try {
    // Total count
    const totalResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM live_activity_events
       WHERE created_at >= NOW() - INTERVAL '${minutes} minutes'`
    );
    stats.total = parseInt(totalResult?.count || '0');

    // By muscle group
    const muscleResults = await queryAll<{ muscle_group: string; count: string }>(
      `SELECT muscle_group, COUNT(*)::text as count
       FROM live_activity_events
       WHERE created_at >= NOW() - INTERVAL '${minutes} minutes'
         AND muscle_group IS NOT NULL
       GROUP BY muscle_group`
    );
    for (const row of muscleResults) {
      stats.byMuscle[row.muscle_group] = parseInt(row.count);
    }

    // By country
    const countryResults = await queryAll<{ country_code: string; count: string }>(
      `SELECT country_code, COUNT(*)::text as count
       FROM live_activity_events
       WHERE created_at >= NOW() - INTERVAL '${minutes} minutes'
         AND country_code IS NOT NULL
       GROUP BY country_code`
    );
    for (const row of countryResults) {
      stats.byCountry[row.country_code] = parseInt(row.count);
    }

    // By event type
    const typeResults = await queryAll<{ event_type: string; count: string }>(
      `SELECT event_type, COUNT(*)::text as count
       FROM live_activity_events
       WHERE created_at >= NOW() - INTERVAL '${minutes} minutes'
       GROUP BY event_type`
    );
    for (const row of typeResults) {
      stats.byType[row.event_type] = parseInt(row.count);
    }
  } catch (error) {
    log.error({ error }, 'Failed to get activity stats');
  }

  return stats;
}

/**
 * Get geo-clustered activity data for map display.
 */
export async function getMapData(
  minutes: number = 60
): Promise<Array<{
  geoBucket: string;
  count: number;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
}>> {
  try {
    const results = await queryAll<{ geo_bucket: string; city: string | null; country: string | null; count: number }>(
      `SELECT
         geo_bucket,
         city,
         country_code as country,
         COUNT(*)::int as count
       FROM live_activity_events
       WHERE created_at >= NOW() - INTERVAL '${minutes} minutes'
         AND geo_bucket IS NOT NULL
       GROUP BY geo_bucket, city, country_code
       ORDER BY count DESC
       LIMIT 100`
    );

    return results.map((row) => ({
      geoBucket: row.geo_bucket,
      count: row.count,
      city: row.city || undefined,
      country: row.country || undefined,
    }));
  } catch (error) {
    log.error({ error }, 'Failed to get map data');
    return [];
  }
}

/**
 * Get hierarchy drill-down data.
 */
export async function getHierarchyData(
  level: 'global' | 'country' | 'region',
  parentCode?: string,
  minutes: number = 60
): Promise<Array<{ name: string; code: string; count: number }>> {
  try {
    let sql: string;
    let params: string[] = [];

    switch (level) {
      case 'global':
        // Get country-level aggregates
        sql = `
          SELECT
            country_code as code,
            country_code as name,
            COUNT(*)::int as count
          FROM live_activity_events
          WHERE created_at >= NOW() - INTERVAL '${minutes} minutes'
            AND country_code IS NOT NULL
          GROUP BY country_code
          ORDER BY count DESC
          LIMIT 50`;
        break;

      case 'country':
        // Get region-level aggregates for a country
        sql = `
          SELECT
            region as code,
            region as name,
            COUNT(*)::int as count
          FROM live_activity_events
          WHERE created_at >= NOW() - INTERVAL '${minutes} minutes'
            AND country_code = $1
            AND region IS NOT NULL
          GROUP BY region
          ORDER BY count DESC
          LIMIT 50`;
        params = [parentCode || ''];
        break;

      case 'region':
        // Get city-level aggregates for a region
        sql = `
          SELECT
            city as code,
            city as name,
            COUNT(*)::int as count
          FROM live_activity_events
          WHERE created_at >= NOW() - INTERVAL '${minutes} minutes'
            AND region = $1
            AND city IS NOT NULL
          GROUP BY city
          ORDER BY count DESC
          LIMIT 50`;
        params = [parentCode || ''];
        break;

      default:
        return [];
    }

    const results = await queryAll<{ name: string; code: string; count: number }>(sql, params);
    return results.map((row) => ({
      name: row.name,
      code: row.code,
      count: row.count,
    }));
  } catch (error) {
    log.error({ error, level }, 'Failed to get hierarchy data');
    return [];
  }
}

/**
 * Get trending exercises.
 */
export async function getTrendingExercises(
  minutes: number = 60,
  limit: number = 10
): Promise<Array<{
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  count: number;
}>> {
  try {
    const results = await queryAll<{ exercise_id: string; exercise_name: string; muscle_group: string; count: number }>(
      `SELECT
         exercise_id,
         exercise_name,
         muscle_group,
         COUNT(*)::int as count
       FROM live_activity_events
       WHERE created_at >= NOW() - INTERVAL '${minutes} minutes'
         AND exercise_id IS NOT NULL
         AND exercise_name IS NOT NULL
       GROUP BY exercise_id, exercise_name, muscle_group
       ORDER BY count DESC
       LIMIT $1`,
      [limit]
    );

    return results.map((row) => ({
      exerciseId: row.exercise_id,
      exerciseName: row.exercise_name,
      muscleGroup: row.muscle_group,
      count: row.count,
    }));
  } catch (error) {
    log.error({ error }, 'Failed to get trending exercises');
    return [];
  }
}

/**
 * Get recent activity events for the feed.
 */
export async function getRecentEvents(
  limit: number = 50
): Promise<LiveActivityEvent[]> {
  try {
    interface RecentEventRow {
      id: string;
      type: string;
      timestamp: string;
      exercise_name: string | null;
      muscle_group: string | null;
      geo_bucket: string | null;
      city: string | null;
      country: string | null;
    }

    const results = await queryAll<RecentEventRow>(
      `SELECT
         id,
         event_type as type,
         created_at as timestamp,
         exercise_name,
         muscle_group,
         geo_bucket,
         city,
         country_code as country
       FROM live_activity_events
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    return results.map((row) => ({
      id: row.id,
      type: row.type,
      timestamp: row.timestamp,
      exerciseName: row.exercise_name || undefined,
      muscleGroup: row.muscle_group || undefined,
      geoBucket: row.geo_bucket || undefined,
      city: row.city || undefined,
      country: row.country || undefined,
    }));
  } catch (error) {
    log.error({ error }, 'Failed to get recent events');
    return [];
  }
}
