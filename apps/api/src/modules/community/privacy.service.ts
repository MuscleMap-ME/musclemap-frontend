/**
 * Privacy Service
 *
 * Handles user privacy settings for community features
 */

import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import type { PrivacySettings } from './types';

const log = loggers.core;

// In-memory cache for privacy settings (simple LRU-like)
const privacyCache = new Map<string, { settings: PrivacySettings; cachedAt: number }>();
const CACHE_TTL_MS = 60000; // 1 minute

/**
 * Get privacy settings for a user
 */
export async function getPrivacySettings(userId: string): Promise<PrivacySettings> {
  // Check cache first
  const cached = privacyCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.settings;
  }

  const row = await db.queryOne<any>(`
    SELECT user_id, share_location, show_in_feed, show_on_map,
           show_workout_details, public_profile, public_display_name, updated_at
    FROM user_privacy_settings
    WHERE user_id = $1
  `, [userId]);

  const settings: PrivacySettings = row
    ? {
        userId: row.user_id,
        shareLocation: Boolean(row.share_location),
        showInFeed: Boolean(row.show_in_feed),
        showOnMap: Boolean(row.show_on_map),
        showWorkoutDetails: Boolean(row.show_workout_details),
        publicProfile: Boolean(row.public_profile),
        publicDisplayName: row.public_display_name || undefined,
        updatedAt: row.updated_at,
      }
    : {
        // Default settings for new users
        userId,
        shareLocation: false,
        showInFeed: true,
        showOnMap: true,
        showWorkoutDetails: false,
        publicProfile: true,
        updatedAt: new Date().toISOString(),
      };

  // Cache the settings
  privacyCache.set(userId, { settings, cachedAt: Date.now() });

  return settings;
}

/**
 * Update privacy settings for a user
 */
export async function updatePrivacySettings(
  userId: string,
  updates: Partial<Omit<PrivacySettings, 'userId' | 'updatedAt'>>
): Promise<PrivacySettings> {
  const current = await getPrivacySettings(userId);

  const merged = {
    shareLocation: updates.shareLocation ?? current.shareLocation,
    showInFeed: updates.showInFeed ?? current.showInFeed,
    showOnMap: updates.showOnMap ?? current.showOnMap,
    showWorkoutDetails: updates.showWorkoutDetails ?? current.showWorkoutDetails,
    publicProfile: updates.publicProfile ?? current.publicProfile,
    publicDisplayName: updates.publicDisplayName ?? current.publicDisplayName,
  };

  await db.query(`
    INSERT INTO user_privacy_settings (
      user_id, share_location, show_in_feed, show_on_map,
      show_workout_details, public_profile, public_display_name, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    ON CONFLICT(user_id) DO UPDATE SET
      share_location = EXCLUDED.share_location,
      show_in_feed = EXCLUDED.show_in_feed,
      show_on_map = EXCLUDED.show_on_map,
      show_workout_details = EXCLUDED.show_workout_details,
      public_profile = EXCLUDED.public_profile,
      public_display_name = EXCLUDED.public_display_name,
      updated_at = EXCLUDED.updated_at
  `, [
    userId,
    merged.shareLocation,
    merged.showInFeed,
    merged.showOnMap,
    merged.showWorkoutDetails,
    merged.publicProfile,
    merged.publicDisplayName || null
  ]);

  // Invalidate cache
  privacyCache.delete(userId);

  log.info({ userId }, 'Privacy settings updated');

  return getPrivacySettings(userId);
}

/**
 * Clear privacy cache for a user (useful after updates)
 */
export function invalidatePrivacyCache(userId: string): void {
  privacyCache.delete(userId);
}

/**
 * Clear entire privacy cache (useful for testing)
 */
export function clearPrivacyCache(): void {
  privacyCache.clear();
}
