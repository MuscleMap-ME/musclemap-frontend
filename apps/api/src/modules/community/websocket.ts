/**
 * WebSocket Handler for Community
 *
 * Provides real-time updates via WebSocket connections:
 * - /ws/community - Public community feed (anonymized events)
 * - /ws/monitor - Moderator/admin monitoring feed
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from 'ws';
import { verifyToken, getEffectiveRole, hasMinRole, type JwtPayload } from '../auth';
import { getSubscriber, REDIS_KEYS, isRedisAvailable } from '../../lib/redis';
import { getActiveNowStats, getTopExercisesNow } from './presence.service';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import type { PublicEvent } from './types';

const log = loggers.core;

// Track connected clients
const communityClients = new Set<WebSocket>();
const monitorClients = new Map<WebSocket, { userId: string; role: string }>();

/**
 * Extract JWT from WebSocket request
 */
function extractJwtFromRequest(request: FastifyRequest): JwtPayload | null {
  // Try query parameter first
  const queryToken = (request.query as any)?.token;
  if (queryToken) {
    try {
      return verifyToken(queryToken);
    } catch {
      // Invalid token
    }
  }

  // Try Sec-WebSocket-Protocol header
  const protocols = request.headers['sec-websocket-protocol'];
  if (protocols) {
    const protocolList = protocols.split(',').map((p) => p.trim());
    for (const proto of protocolList) {
      if (proto.startsWith('Bearer.')) {
        const token = proto.substring(7);
        try {
          return verifyToken(token);
        } catch {
          // Invalid token
        }
      }
    }
  }

  // Try Authorization header (some WS clients support this)
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      return verifyToken(authHeader.substring(7));
    } catch {
      // Invalid token
    }
  }

  return null;
}

/**
 * Send initial snapshot to a community client
 */
async function sendCommunitySnapshot(socket: WebSocket): Promise<void> {
  try {
    // Get recent public events from PostgreSQL
    const recentEvents = await db.queryAll<{
      id: string;
      event_type: string;
      payload: string;
      geo_bucket: string | null;
      created_at: string;
    }>(`
      SELECT id, event_type, payload, geo_bucket, created_at
      FROM activity_events
      WHERE visibility_scope IN ('public_anon', 'public_profile')
      ORDER BY created_at DESC
      LIMIT 50
    `);

    const events: PublicEvent[] = recentEvents.map((row) => ({
      id: row.id,
      ts: row.created_at,
      type: row.event_type as PublicEvent['type'],
      geoBucket: row.geo_bucket || undefined,
      payload: JSON.parse(row.payload || '{}'),
    }));

    // Get active now stats
    const activeNow = await getActiveNowStats();
    const topExercises = await getTopExercisesNow(15, 10);

    socket.send(
      JSON.stringify({
        type: 'snapshot',
        data: {
          recentEvents: events,
          activeNow,
          topExercises,
          serverTime: new Date().toISOString(),
        },
      })
    );
  } catch (err) {
    log.error({ error: err }, 'Failed to send community snapshot');
  }
}

/**
 * Send initial snapshot to a monitor client
 */
async function sendMonitorSnapshot(socket: WebSocket): Promise<void> {
  try {
    // Get recent events (including non-public)
    const recentEvents = await db.queryAll(`
      SELECT id, user_id, event_type, payload, geo_bucket, visibility_scope, created_at
      FROM activity_events
      ORDER BY created_at DESC
      LIMIT 100
    `);

    const activeNow = await getActiveNowStats();

    socket.send(
      JSON.stringify({
        type: 'snapshot',
        data: {
          recentEvents,
          activeNow,
          serverTime: new Date().toISOString(),
        },
      })
    );
  } catch (err) {
    log.error({ error: err }, 'Failed to send monitor snapshot');
  }
}

/**
 * Broadcast to all community clients
 */
export function broadcastToCommunity(event: PublicEvent): void {
  const message = JSON.stringify({ type: 'event', data: event });
  for (const client of communityClients) {
    if (client.readyState === 1) {
      // OPEN
      client.send(message);
    }
  }
}

/**
 * Broadcast to all monitor clients
 */
export function broadcastToMonitor(event: unknown): void {
  const message = JSON.stringify({ type: 'event', data: event });
  for (const [client] of monitorClients) {
    if (client.readyState === 1) {
      // OPEN
      client.send(message);
    }
  }
}

/**
 * Set up Redis subscription for realtime fanout
 */
async function setupRedisSubscription(): Promise<void> {
  if (!isRedisAvailable()) {
    log.info('Redis not available, WebSocket will work without realtime fanout');
    return;
  }

  const subscriber = getSubscriber();
  if (!subscriber) return;

  try {
    await subscriber.subscribe(
      REDIS_KEYS.CHANNEL_COMMUNITY,
      REDIS_KEYS.CHANNEL_MONITOR
    );

    subscriber.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);

        if (channel === REDIS_KEYS.CHANNEL_COMMUNITY) {
          broadcastToCommunity(data);
        } else if (channel === REDIS_KEYS.CHANNEL_MONITOR) {
          broadcastToMonitor(data);
        }
      } catch (err) {
        log.error({ error: err, channel }, 'Failed to process Redis message');
      }
    });

    log.info('Redis subscription established for WebSocket fanout');
  } catch (err) {
    log.error({ error: err }, 'Failed to set up Redis subscription');
  }
}

/**
 * Register WebSocket routes on Fastify
 */
export async function registerWebSocketRoutes(
  app: FastifyInstance
): Promise<void> {
  // Import websocket plugin dynamically to avoid issues if not installed
  const websocket = await import('@fastify/websocket');
  await app.register(websocket.default);

  // Set up Redis subscription
  await setupRedisSubscription();

  // Community WebSocket endpoint (public)
  app.get(
    '/ws/community',
    { websocket: true },
    (socket: WebSocket, request: FastifyRequest) => {
      const user = extractJwtFromRequest(request);
      log.info({ userId: user?.userId }, 'Community WebSocket connected');

      communityClients.add(socket);

      // Send initial snapshot
      sendCommunitySnapshot(socket);

      // Handle heartbeats
      const heartbeatInterval = setInterval(() => {
        if (socket.readyState === 1) {
          socket.ping();
        }
      }, 30000);

      socket.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'heartbeat' && user) {
            // Could update presence here
          }
        } catch {}
      });

      socket.on('close', () => {
        clearInterval(heartbeatInterval);
        communityClients.delete(socket);
        log.info({ userId: user?.userId }, 'Community WebSocket disconnected');
      });

      socket.on('error', (err) => {
        log.error({ error: err }, 'Community WebSocket error');
        communityClients.delete(socket);
      });
    }
  );

  // Monitor WebSocket endpoint (requires moderator role)
  app.get(
    '/ws/monitor',
    { websocket: true },
    (socket: WebSocket, request: FastifyRequest) => {
      const user = extractJwtFromRequest(request);

      if (!user) {
        socket.close(4001, 'Authentication required');
        return;
      }

      const role = getEffectiveRole(user);
      if (!hasMinRole(role, 'moderator')) {
        socket.close(4003, 'Moderator role required');
        return;
      }

      log.info({ userId: user.userId, role }, 'Monitor WebSocket connected');

      monitorClients.set(socket, { userId: user.userId, role });

      // Send initial snapshot
      sendMonitorSnapshot(socket);

      // Handle heartbeats
      const heartbeatInterval = setInterval(() => {
        if (socket.readyState === 1) {
          socket.ping();
        }
      }, 30000);

      socket.on('close', () => {
        clearInterval(heartbeatInterval);
        monitorClients.delete(socket);
        log.info({ userId: user.userId }, 'Monitor WebSocket disconnected');
      });

      socket.on('error', (err) => {
        log.error({ error: err, userId: user.userId }, 'Monitor WebSocket error');
        monitorClients.delete(socket);
      });
    }
  );

  log.info('WebSocket routes registered: /ws/community, /ws/monitor');
}

/**
 * Get connection stats
 */
export function getConnectionStats(): {
  communityConnections: number;
  monitorConnections: number;
} {
  return {
    communityConnections: communityClients.size,
    monitorConnections: monitorClients.size,
  };
}
