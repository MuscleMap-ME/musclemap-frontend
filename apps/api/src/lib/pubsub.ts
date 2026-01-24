/**
 * PubSub Service for GraphQL Subscriptions
 *
 * Uses Redis for distributed pub/sub across multiple server instances.
 * Falls back to in-memory EventEmitter when Redis is unavailable.
 */

import { EventEmitter } from 'events';
import { getPublisher, getSubscriber, isRedisAvailable } from './redis';
import { loggers } from './logger';

const log = loggers.core;

// Subscription channels
export const PUBSUB_CHANNELS = {
  COMMUNITY_STATS: 'pubsub:community:stats',
  COMMUNITY_ACTIVITY: 'pubsub:community:activity',
  MESSAGE_RECEIVED: 'pubsub:message:received',
  CONVERSATION_UPDATED: 'pubsub:conversation:updated',
  LIVE_ACTIVITY: 'pubsub:live:activity',  // Anonymous real-time activity events
  // Enhanced messaging channels
  TYPING: 'pubsub:typing',
  PRESENCE: 'pubsub:presence',
  DELIVERY: 'pubsub:delivery',
  READ: 'pubsub:read',
  REACTION: 'pubsub:reaction',
  // Community presence channels
  VENUE_PRESENCE: 'pubsub:presence:venue',         // Updates for a specific venue
  NEARBY_PRESENCE: 'pubsub:presence:nearby',       // Updates for nearby users
  TRAINING_INVITE: 'pubsub:training:invite',       // Training invite notifications
  TRAINING_SESSION: 'pubsub:training:session',     // Training session updates
} as const;

// Event types
export interface CommunityStatsEvent {
  activeNow: { value: number; display: string };
  activeWorkouts: { value: number; display: string };
  totalUsers: { value: number; display: string };
  totalWorkouts: { value: number; display: string };
  recentActivity?: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
  }>;
  milestone?: {
    type: string;
    value: number;
    reached: boolean;
  } | null;
}

export interface ActivityEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

export interface MessageEvent {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface ConversationEvent {
  id: string;
  participantIds: string[];
  lastMessageId?: string;
  updatedAt: string;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface PresenceEvent {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: string;
}

export interface DeliveryEvent {
  messageId: string;
  conversationId: string;
  senderId: string;
  userId: string;
  deliveredAt: string;
}

export interface ReadEvent {
  conversationId: string;
  userId: string;
  readAt: string;
}

export interface ReactionEvent {
  messageId: string;
  conversationId: string;
  userId: string;
  emoji: string;
  action: 'add' | 'remove';
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

// ============================================
// COMMUNITY PRESENCE EVENT TYPES
// ============================================

export type PresenceState = 'invisible' | 'location_only' | 'visible' | 'training_now' | 'open_to_train';

export interface VenuePresenceEvent {
  venueId: string;
  userId: string;
  state: PresenceState;
  latitude?: number;
  longitude?: number;
  sessionOpenToJoin?: boolean;
  sessionWorkoutType?: string;
  sessionTargetMuscles?: string[];
  action: 'joined' | 'left' | 'updated';
  timestamp: string;
}

export interface NearbyPresenceEvent {
  userId: string;
  state: PresenceState;
  venueId?: string;
  venueName?: string;
  latitude?: number;
  longitude?: number;
  locationPrecision?: 'exact' | 'approximate' | 'venue_only';
  sessionOpenToJoin?: boolean;
  sessionWorkoutType?: string;
  distanceMeters?: number;
  timestamp: string;
}

export interface TrainingInviteEvent {
  inviteId: string;
  fromUserId: string;
  fromUsername?: string;
  toUserId: string;
  venueId: string;
  venueName?: string;
  proposedTime?: string;
  workoutType?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  timestamp: string;
}

export interface TrainingSessionEvent {
  sessionId: string;
  venueId: string;
  venueName?: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  participantCount: number;
  maxParticipants: number;
  workoutType?: string;
  action: 'created' | 'participant_joined' | 'participant_left' | 'started' | 'ended';
  timestamp: string;
}

// In-memory fallback emitter
const localEmitter = new EventEmitter();
localEmitter.setMaxListeners(1000); // Allow many subscribers

// Track active subscriptions for cleanup
const activeSubscriptions = new Map<string, Set<(data: unknown) => void>>();

/**
 * Initialize PubSub - call on server startup
 */
export async function initializePubSub(): Promise<void> {
  const subscriber = getSubscriber();

  if (!subscriber) {
    log.info('PubSub initialized with in-memory fallback (Redis not available)');
    return;
  }

  // Subscribe to all channels
  const channels = Object.values(PUBSUB_CHANNELS);

  for (const channel of channels) {
    await subscriber.subscribe(channel);
  }

  // Handle incoming messages
  subscriber.on('message', (channel: string, message: string) => {
    try {
      const data = JSON.parse(message);
      // Emit to local listeners
      localEmitter.emit(channel, data);
    } catch (err) {
      log.error({ channel, error: err }, 'Failed to parse PubSub message');
    }
  });

  log.info({ channels }, 'PubSub initialized with Redis');
}

/**
 * Publish an event to a channel
 */
export async function publish<T>(channel: string, data: T): Promise<void> {
  const publisher = getPublisher();

  if (publisher && isRedisAvailable()) {
    try {
      await publisher.publish(channel, JSON.stringify(data));
    } catch (err) {
      log.error({ channel, error: err }, 'Failed to publish to Redis, using local fallback');
      localEmitter.emit(channel, data);
    }
  } else {
    // Local fallback
    localEmitter.emit(channel, data);
  }
}

/**
 * Subscribe to a channel - returns an async iterator for GraphQL subscriptions
 */
export function subscribe<T>(channel: string, filter?: (data: T) => boolean): AsyncIterableIterator<T> {
  const queue: T[] = [];
  let resolveNext: ((value: IteratorResult<T>) => void) | null = null;
  let done = false;

  const handler = (data: T) => {
    // Apply filter if provided
    if (filter && !filter(data)) {
      return;
    }

    if (resolveNext) {
      resolveNext({ value: data, done: false });
      resolveNext = null;
    } else {
      queue.push(data);
    }
  };

  // Add listener
  localEmitter.on(channel, handler);

  // Track for cleanup
  if (!activeSubscriptions.has(channel)) {
    activeSubscriptions.set(channel, new Set());
  }
  activeSubscriptions.get(channel)!.add(handler as (data: unknown) => void);

  return {
    next(): Promise<IteratorResult<T>> {
      if (done) {
        return Promise.resolve({ value: undefined, done: true } as IteratorReturnResult<undefined>);
      }

      if (queue.length > 0) {
        return Promise.resolve({ value: queue.shift()!, done: false });
      }

      return new Promise((resolve) => {
        resolveNext = resolve;
      });
    },
    return(): Promise<IteratorResult<T>> {
      done = true;
      localEmitter.off(channel, handler);
      activeSubscriptions.get(channel)?.delete(handler as (data: unknown) => void);
      return Promise.resolve({ value: undefined, done: true } as IteratorReturnResult<undefined>);
    },
    throw(error: Error): Promise<IteratorResult<T>> {
      done = true;
      localEmitter.off(channel, handler);
      activeSubscriptions.get(channel)?.delete(handler as (data: unknown) => void);
      return Promise.reject(error);
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}

/**
 * Helper to create a filtered subscription for user-specific events
 */
export function subscribeForUser<T extends { participantIds?: string[]; senderId?: string }>(
  channel: string,
  userId: string
): AsyncIterableIterator<T> {
  return subscribe<T>(channel, (data) => {
    // Check if user is a participant or sender
    if (data.participantIds && data.participantIds.includes(userId)) {
      return true;
    }
    if (data.senderId === userId) {
      return true;
    }
    return false;
  });
}

/**
 * Helper to create a filtered subscription for conversation-specific events
 */
export function subscribeForConversation<T extends { conversationId?: string }>(
  channel: string,
  conversationId?: string
): AsyncIterableIterator<T> {
  if (!conversationId) {
    return subscribe<T>(channel);
  }

  return subscribe<T>(channel, (data) => {
    return data.conversationId === conversationId;
  });
}

// ============================================
// PUBLISH HELPERS
// ============================================

/**
 * Publish community stats update
 */
export async function publishCommunityStats(stats: CommunityStatsEvent): Promise<void> {
  await publish(PUBSUB_CHANNELS.COMMUNITY_STATS, stats);
}

/**
 * Publish community activity event
 */
export async function publishCommunityActivity(event: ActivityEvent): Promise<void> {
  await publish(PUBSUB_CHANNELS.COMMUNITY_ACTIVITY, event);
}

/**
 * Publish new message event
 */
export async function publishMessage(message: MessageEvent): Promise<void> {
  await publish(PUBSUB_CHANNELS.MESSAGE_RECEIVED, message);
}

/**
 * Publish conversation update event
 */
export async function publishConversationUpdate(conversation: ConversationEvent): Promise<void> {
  await publish(PUBSUB_CHANNELS.CONVERSATION_UPDATED, conversation);
}

/**
 * Publish live activity event (anonymous)
 */
export async function publishLiveActivity(event: LiveActivityEvent): Promise<void> {
  await publish(PUBSUB_CHANNELS.LIVE_ACTIVITY, event);
}

// ============================================
// COMMUNITY PRESENCE PUBLISH HELPERS
// ============================================

/**
 * Publish venue presence update
 */
export async function publishVenuePresence(event: VenuePresenceEvent): Promise<void> {
  await publish(PUBSUB_CHANNELS.VENUE_PRESENCE, event);
}

/**
 * Publish nearby presence update
 */
export async function publishNearbyPresence(event: NearbyPresenceEvent): Promise<void> {
  await publish(PUBSUB_CHANNELS.NEARBY_PRESENCE, event);
}

/**
 * Publish training invite notification
 */
export async function publishTrainingInvite(event: TrainingInviteEvent): Promise<void> {
  await publish(PUBSUB_CHANNELS.TRAINING_INVITE, event);
}

/**
 * Publish training session update
 */
export async function publishTrainingSession(event: TrainingSessionEvent): Promise<void> {
  await publish(PUBSUB_CHANNELS.TRAINING_SESSION, event);
}

// ============================================
// COMMUNITY PRESENCE SUBSCRIPTION HELPERS
// ============================================

/**
 * Subscribe to venue-specific presence updates
 */
export function subscribeForVenue<T extends { venueId?: string }>(
  channel: string,
  venueId: string
): AsyncIterableIterator<T> {
  return subscribe<T>(channel, (data) => {
    return data.venueId === venueId;
  });
}

/**
 * Subscribe to training invites for a specific user
 */
export function subscribeForTrainingInvites<T extends { toUserId?: string }>(
  channel: string,
  userId: string
): AsyncIterableIterator<T> {
  return subscribe<T>(channel, (data) => {
    return data.toUserId === userId;
  });
}

/**
 * Cleanup all subscriptions
 */
export function cleanupPubSub(): void {
  for (const [channel, handlers] of activeSubscriptions) {
    for (const handler of handlers) {
      localEmitter.off(channel, handler);
    }
  }
  activeSubscriptions.clear();
  log.info('PubSub cleanup complete');
}
