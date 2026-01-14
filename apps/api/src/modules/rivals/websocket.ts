/**
 * Rivals WebSocket
 *
 * Real-time updates for active rivalries with Redis pub/sub
 * for cross-node messaging in PM2 cluster mode.
 */
import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import { verifyToken } from '../../http/routes/auth';
import { rivalsService } from './service';
import { getSubscriber, getPublisher, isRedisAvailable } from '../../lib/redis';
import { loggers } from '../../lib/logger';
import type { RivalEvent, RivalWorkoutEvent, RivalMilestoneEvent } from './types';

const log = loggers.core;

// ============================================
// LOCAL STATE (per-instance)
// ============================================

// Store connections by user ID (local to this instance)
const userConnections = new Map<string, Set<WebSocket>>();

// Store connection to user mapping for cleanup
const connectionToUser = new WeakMap<WebSocket, string>();

// Redis pub/sub channels
const RIVAL_EVENTS_CHANNEL = 'rivals:events';
const _RIVAL_USER_CHANNEL_PREFIX = 'rivals:user:';

// Track if Redis subscription is set up
let redisSubscribed = false;

// ============================================
// REDIS PUB/SUB FOR CROSS-NODE MESSAGING
// ============================================

interface CrossNodeMessage {
  type: 'broadcast' | 'user';
  targetUserId?: string;
  event: RivalEvent;
}

/**
 * Set up Redis subscription for cross-node messaging
 */
async function setupRedisSubscription(): Promise<void> {
  if (redisSubscribed || !isRedisAvailable()) return;

  try {
    const subscriber = getSubscriber();
    if (!subscriber) return;

    // Subscribe to the main channel
    await subscriber.subscribe(RIVAL_EVENTS_CHANNEL);

    // Handle messages from other nodes
    subscriber.on('message', (channel: string, message: string) => {
      try {
        if (channel === RIVAL_EVENTS_CHANNEL) {
          const data: CrossNodeMessage = JSON.parse(message);
          handleCrossNodeMessage(data);
        }
      } catch (err) {
        log.error({ err, channel, message }, 'Failed to process cross-node message');
      }
    });

    redisSubscribed = true;
    log.info('Redis pub/sub initialized for rivals WebSocket');
  } catch (err) {
    log.error({ err }, 'Failed to set up Redis subscription');
  }
}

/**
 * Handle a message from another node
 */
function handleCrossNodeMessage(data: CrossNodeMessage): void {
  if (data.type === 'user' && data.targetUserId) {
    // Deliver to local connections for this user
    deliverToLocalConnections(data.targetUserId, data.event);
  } else if (data.type === 'broadcast') {
    // Broadcast to all local connections
    for (const [userId] of userConnections) {
      deliverToLocalConnections(userId, data.event);
    }
  }
}

/**
 * Deliver an event to connections on THIS node only
 */
function deliverToLocalConnections(userId: string, event: RivalEvent): void {
  const connections = userConnections.get(userId);
  if (!connections || connections.size === 0) return;

  const message = JSON.stringify({ type: 'event', event });
  let delivered = 0;

  for (const socket of connections) {
    if (socket.readyState === socket.OPEN) {
      socket.send(message);
      delivered++;
    }
  }

  log.debug({ userId, eventType: event.type, delivered }, 'Event delivered to local connections');
}

/**
 * Publish an event to Redis for cross-node delivery
 */
async function publishToRedis(message: CrossNodeMessage): Promise<void> {
  if (!isRedisAvailable()) return;

  try {
    const publisher = getPublisher();
    if (!publisher) return;

    await publisher.publish(RIVAL_EVENTS_CHANNEL, JSON.stringify(message));
  } catch (err) {
    log.error({ err, message }, 'Failed to publish to Redis');
  }
}

// ============================================
// WEBSOCKET REGISTRATION
// ============================================

export function registerRivalsWebSocket(fastify: FastifyInstance): void {
  // Initialize Redis pub/sub
  setupRedisSubscription();

  fastify.get('/ws/rivals', { websocket: true }, (socket, req) => {
    let userId: string | null = null;

    // Authenticate
    const token =
      (req.query as Record<string, string>)?.token ||
      req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      socket.close(4001, 'Authentication required');
      return;
    }

    try {
      const payload = verifyToken(token);
      userId = payload.userId;
    } catch {
      socket.close(4001, 'Invalid token');
      return;
    }

    // Add to user connections
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId)!.add(socket);
    connectionToUser.set(socket, userId);

    log.debug({ userId, connectionCount: userConnections.get(userId)!.size }, 'WebSocket connected');

    // Send initial data
    sendInitialData(socket, userId);

    // Handle messages
    socket.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleMessage(socket, userId!, message);
      } catch (_err) {
        socket.send(
          JSON.stringify({ type: 'error', message: 'Invalid message format' })
        );
      }
    });

    // Handle close
    socket.on('close', () => {
      if (userId) {
        const connections = userConnections.get(userId);
        if (connections) {
          connections.delete(socket);
          if (connections.size === 0) {
            userConnections.delete(userId);
          }
        }
        log.debug({ userId, remainingConnections: userConnections.get(userId)?.size ?? 0 }, 'WebSocket disconnected');
      }
    });

    // Heartbeat
    const heartbeat = setInterval(() => {
      if (socket.readyState === socket.OPEN) {
        socket.ping();
      }
    }, 30000);

    socket.on('close', () => clearInterval(heartbeat));
  });
}

async function sendInitialData(socket: WebSocket, userId: string): Promise<void> {
  try {
    const [rivals, stats, pending] = await Promise.all([
      rivalsService.getUserRivalries(userId, 'active'),
      rivalsService.getUserStats(userId),
      rivalsService.getPendingRequests(userId),
    ]);

    socket.send(
      JSON.stringify({
        type: 'snapshot',
        data: {
          rivals,
          stats,
          pendingRequests: pending,
        },
      })
    );
  } catch (_err) {
    socket.send(
      JSON.stringify({
        type: 'error',
        message: 'Failed to load rivalry data',
      })
    );
  }
}

async function handleMessage(
  socket: WebSocket,
  userId: string,
  message: { type: string; data?: Record<string, unknown> }
): Promise<void> {
  switch (message.type) {
    case 'heartbeat':
      socket.send(JSON.stringify({ type: 'heartbeat', timestamp: new Date() }));
      break;

    case 'refresh':
      await sendInitialData(socket, userId);
      break;

    default:
      socket.send(
        JSON.stringify({ type: 'error', message: 'Unknown message type' })
      );
  }
}

// ============================================
// EVENT DELIVERY FUNCTIONS
// ============================================

/**
 * Send event to a specific user (cross-node aware)
 */
export function sendToUser(userId: string, event: RivalEvent): void {
  // First, deliver to local connections
  deliverToLocalConnections(userId, event);

  // Then publish to Redis for other nodes
  publishToRedis({
    type: 'user',
    targetUserId: userId,
    event,
  });
}

/**
 * Broadcast workout update to all rivalry opponents
 */
export async function broadcastRivalWorkout(
  userId: string,
  username: string,
  workoutId: string,
  tuEarned: number,
  topMuscles: string[]
): Promise<void> {
  // Get updated rivalries
  const rivalries = await rivalsService.getUserRivalries(userId, 'active');

  for (const rivalry of rivalries) {
    const opponentId = rivalry.opponent.id;
    const totalTU = rivalry.myTU;

    const event: RivalWorkoutEvent = {
      type: 'rival.workout',
      rivalryId: rivalry.id,
      timestamp: new Date(),
      data: {
        userId,
        username,
        tuEarned,
        totalTU,
        workoutId,
        topMuscles,
      },
    };

    // Send to opponent
    sendToUser(opponentId, event);

    // Check for milestones
    checkMilestones(rivalry, userId, username, opponentId);
  }
}

/**
 * Check and broadcast milestone events
 */
function checkMilestones(
  rivalry: Awaited<ReturnType<typeof rivalsService.getUserRivalries>>[0],
  userId: string,
  username: string,
  opponentId: string
): void {
  const myTU = rivalry.myTU;
  const opponentTU = rivalry.opponentTU;
  const previousMyTU = myTU; // This would need to track previous state

  // Check overtake
  if (myTU > opponentTU && previousMyTU <= opponentTU) {
    const event: RivalMilestoneEvent = {
      type: 'rival.milestone',
      rivalryId: rivalry.id,
      timestamp: new Date(),
      data: {
        userId,
        username,
        milestone: 'overtake',
        value: myTU - opponentTU,
      },
    };
    sendToUser(opponentId, event);
    sendToUser(userId, event);
  }

  // Check TU milestones
  const tuMilestones = [100, 500] as const;
  for (const milestone of tuMilestones) {
    if (myTU >= milestone && previousMyTU < milestone) {
      const event: RivalMilestoneEvent = {
        type: 'rival.milestone',
        rivalryId: rivalry.id,
        timestamp: new Date(),
        data: {
          userId,
          username,
          milestone: `tu_${milestone}` as 'tu_100' | 'tu_500',
          value: myTU,
        },
      };
      sendToUser(opponentId, event);
      sendToUser(userId, event);
    }
  }
}

/**
 * Broadcast rivalry status change
 */
export function broadcastRivalryStatusChange(
  rivalryId: string,
  type: 'rival.request' | 'rival.accepted' | 'rival.declined' | 'rival.ended',
  challengerId: string,
  challengedId: string,
  data: Record<string, unknown> = {}
): void {
  const event: RivalEvent = {
    type,
    rivalryId,
    timestamp: new Date(),
    data,
  };

  sendToUser(challengerId, event);
  sendToUser(challengedId, event);
}

// ============================================
// STATS AND UTILITIES
// ============================================

/**
 * Get connection stats (local instance only)
 */
export function getConnectionStats(): { users: number; connections: number; instanceId: string } {
  let connections = 0;
  for (const sockets of userConnections.values()) {
    connections += sockets.size;
  }
  return {
    users: userConnections.size,
    connections,
    instanceId: process.env.pm_id || process.pid.toString(),
  };
}

/**
 * Check if a user has active connections on this node
 */
export function hasLocalConnection(userId: string): boolean {
  const connections = userConnections.get(userId);
  return !!connections && connections.size > 0;
}

/**
 * Force disconnect a user from this node
 */
export function disconnectUser(userId: string, reason: string = 'Forced disconnect'): void {
  const connections = userConnections.get(userId);
  if (connections) {
    for (const socket of connections) {
      socket.close(4000, reason);
    }
    userConnections.delete(userId);
  }
}
