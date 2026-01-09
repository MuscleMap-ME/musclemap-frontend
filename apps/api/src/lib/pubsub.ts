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
  activeSubscriptions.get(channel)!.add(handler);

  return {
    next(): Promise<IteratorResult<T>> {
      if (done) {
        return Promise.resolve({ value: undefined as any, done: true });
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
      activeSubscriptions.get(channel)?.delete(handler);
      return Promise.resolve({ value: undefined as any, done: true });
    },
    throw(error: Error): Promise<IteratorResult<T>> {
      done = true;
      localEmitter.off(channel, handler);
      activeSubscriptions.get(channel)?.delete(handler);
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
