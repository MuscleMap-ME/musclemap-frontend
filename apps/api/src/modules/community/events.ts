/**
 * Event Pipeline
 *
 * Central event emission system for community features.
 * - Writes to SQLite for persistence
 * - Updates Redis presence
 * - Publishes to Redis channels for realtime
 */

import crypto from 'crypto';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import {
  getRedis,
  getPublisher,
  isRedisAvailable,
  REDIS_KEYS,
  TTL,
  getMinuteKey,
} from '../../lib/redis';
import { getPrivacySettings } from './privacy.service';
import type {
  EventType,
  VisibilityScope,
  ActivityEvent,
  PublicEvent,
  PrivacySettings,
  PresenceMeta,
} from './types';

const log = loggers.core;

export interface EmitEventOptions {
  geoBucket?: string;
  stageId?: string;
  journeyId?: string;
  skipPersist?: boolean;
  skipRedis?: boolean;
}

/**
 * Generate a stable anonymous identifier for a user
 * (consistent per user so the feed shows "Community Member #1234" consistently)
 */
function generateAnonId(userId: string): string {
  const hash = crypto.createHash('sha256').update(userId).digest('hex');
  return hash.substring(0, 8).toUpperCase();
}

/**
 * Transform an internal event to a public-safe event
 */
export function toPublicEvent(
  event: ActivityEvent,
  privacy: PrivacySettings
): PublicEvent {
  const publicEvent: PublicEvent = {
    id: event.id,
    ts: event.createdAt,
    type: event.eventType,
    payload: {},
  };

  // Only include geoBucket if user shares location
  if (privacy.shareLocation && event.geoBucket) {
    publicEvent.geoBucket = event.geoBucket;
  }

  // Determine display identity
  if (privacy.publicProfile) {
    publicEvent.displayName =
      privacy.publicDisplayName || `Member #${generateAnonId(event.userId)}`;
  } else {
    publicEvent.displayName = `Member #${generateAnonId(event.userId)}`;
  }

  // Sanitize payload - only include safe fields
  const safePayloadFields: Record<EventType, string[]> = {
    'session.start': [],
    'session.end': ['duration'],
    'workout.started': [],
    'workout.completed': ['totalTu', 'exerciseCount'],
    'exercise.selected': ['exerciseId', 'exerciseName'],
    'exercise.completed': ['exerciseId', 'exerciseName', 'tu'],
    'stage.entered': ['stageId', 'stageName'],
    'stage.completed': ['stageId', 'stageName'],
    'level.up': ['newLevel', 'archetypeName'],
    'archetype.switched': ['archetypeName'],
    'achievement.unlocked': ['achievementName'],
    'competition.joined': ['competitionName'],
    'competition.completed': ['competitionName', 'rank'],
    'privacy.location_toggled': [],
    heartbeat: [],
  };

  const allowedFields = safePayloadFields[event.eventType] || [];
  for (const field of allowedFields) {
    if (event.payload[field] !== undefined) {
      publicEvent.payload[field] = event.payload[field];
    }
  }

  // Optionally include workout details if user allows
  if (privacy.showWorkoutDetails && event.eventType.startsWith('workout.')) {
    if (event.payload.muscleGroups) {
      publicEvent.payload.muscleGroups = event.payload.muscleGroups;
    }
  }

  return publicEvent;
}

/**
 * Determine visibility scope based on event type and privacy
 */
function determineVisibility(
  eventType: EventType,
  privacy: PrivacySettings
): VisibilityScope {
  // Privacy toggle events are always admin-only
  if (eventType === 'privacy.location_toggled') {
    return 'admin';
  }

  // Heartbeats are moderator-only (for monitoring)
  if (eventType === 'heartbeat') {
    return 'moderator';
  }

  // If user opts out of feed, only show to moderators
  if (!privacy.showInFeed) {
    return 'moderator';
  }

  // Public events
  return privacy.publicProfile ? 'public_profile' : 'public_anon';
}

/**
 * Update Redis presence for a user
 */
async function updatePresence(
  userId: string,
  meta: PresenceMeta
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const now = Date.now();

  try {
    // Update sorted set with timestamp as score
    await redis.zadd(REDIS_KEYS.PRESENCE_ZSET, now, userId);

    // Update presence metadata
    await redis.set(
      REDIS_KEYS.PRESENCE_META(userId),
      JSON.stringify({ ...meta, ts: now }),
      'EX',
      TTL.PRESENCE
    );
  } catch (err) {
    log.error({ error: err, userId }, 'Failed to update presence');
  }
}

/**
 * Update "now" stats buckets in Redis
 */
async function updateNowStats(
  eventType: EventType,
  payload: Record<string, unknown>
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const minuteKey = getMinuteKey();

  try {
    if (eventType === 'exercise.selected' && payload.exerciseId) {
      const key = REDIS_KEYS.NOW_EXERCISE(minuteKey);
      await redis.hincrby(key, payload.exerciseId as string, 1);
      await redis.expire(key, TTL.NOW_BUCKET);
    }

    if (eventType === 'stage.entered' && payload.stageId) {
      const key = REDIS_KEYS.NOW_STAGE(minuteKey);
      await redis.hincrby(key, payload.stageId as string, 1);
      await redis.expire(key, TTL.NOW_BUCKET);
    }
  } catch (err) {
    log.error({ error: err, eventType }, 'Failed to update now stats');
  }
}

/**
 * Publish event to Redis channels
 */
async function publishEvent(
  event: ActivityEvent,
  publicEvent: PublicEvent
): Promise<void> {
  const publisher = getPublisher();
  if (!publisher) return;

  try {
    // Always publish to community channel (public transform)
    if (
      event.visibilityScope === 'public_anon' ||
      event.visibilityScope === 'public_profile'
    ) {
      await publisher.publish(
        REDIS_KEYS.CHANNEL_COMMUNITY,
        JSON.stringify(publicEvent)
      );
    }

    // Publish to monitor channel with full event (for mods/admins)
    await publisher.publish(REDIS_KEYS.CHANNEL_MONITOR, JSON.stringify(event));
  } catch (err) {
    log.error({ error: err, eventId: event.id }, 'Failed to publish event');
  }
}

/**
 * Emit an activity event
 *
 * This is the main entry point for all activity tracking.
 */
export async function emitEvent(
  userId: string,
  eventType: EventType,
  payload: Record<string, unknown> = {},
  options: EmitEventOptions = {}
): Promise<ActivityEvent> {
  const privacy = await getPrivacySettings(userId);
  const visibilityScope = determineVisibility(eventType, privacy);

  // Compute geoBucket only if user shares location
  const geoBucket =
    privacy.shareLocation && options.geoBucket ? options.geoBucket : undefined;

  const event: ActivityEvent = {
    id: `evt_${crypto.randomBytes(12).toString('hex')}`,
    userId,
    eventType,
    payload,
    geoBucket,
    visibilityScope,
    createdAt: new Date().toISOString(),
  };

  // Persist to PostgreSQL (unless skipped)
  if (!options.skipPersist) {
    try {
      await db.query(`
        INSERT INTO activity_events (id, user_id, event_type, payload, geo_bucket, visibility_scope, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        event.id,
        event.userId,
        event.eventType,
        JSON.stringify(event.payload),
        event.geoBucket || null,
        event.visibilityScope,
        event.createdAt
      ]);
    } catch (err) {
      log.error({ error: err, eventId: event.id }, 'Failed to persist event');
    }
  }

  // Redis operations (unless skipped)
  if (!options.skipRedis && isRedisAvailable()) {
    // Update presence if this is an activity event
    if (eventType !== 'privacy.location_toggled') {
      await updatePresence(userId, {
        geoBucket,
        stageId: options.stageId,
        journeyId: options.journeyId,
        ts: Date.now(),
      });
    }

    // Update "now" stats
    await updateNowStats(eventType, payload);

    // Publish to channels
    const publicEvent = toPublicEvent(event, privacy);
    await publishEvent(event, publicEvent);
  }

  log.debug(
    { eventId: event.id, eventType, userId },
    'Event emitted'
  );

  return event;
}

/**
 * Emit a heartbeat event (lightweight presence update)
 */
export async function emitHeartbeat(
  userId: string,
  options: EmitEventOptions = {}
): Promise<void> {
  await emitEvent(userId, 'heartbeat', {}, {
    ...options,
    skipPersist: true, // Don't persist heartbeats
  });
}
