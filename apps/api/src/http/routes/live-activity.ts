/**
 * Live Activity Routes
 *
 * API endpoints for real-time activity monitoring.
 *
 * All data is aggregated and anonymous - no individual user data is exposed.
 * Privacy is enforced at the collection layer (live-activity-logger.ts),
 * so all data returned by these endpoints is already privacy-safe.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  getActivityStats,
  getMapData,
  getHierarchyData,
  getTrendingExercises,
  getRecentEvents,
  cleanupOldEvents,
} from '../../services/live-activity-logger';
import { subscribe, PUBSUB_CHANNELS } from '../../lib/pubsub';
import { optionalAuth } from './auth';
import { loggers } from '../../lib/logger';

const log = loggers.http;

// Time window options (in minutes)
const TIME_WINDOWS = {
  '5m': 5,
  '15m': 15,
  '1h': 60,
  '24h': 1440,
} as const;

type TimeWindow = keyof typeof TIME_WINDOWS;

const timeWindowSchema = z.enum(['5m', '15m', '1h', '24h']).default('1h');
const levelSchema = z.enum(['global', 'country', 'region']).default('global');

export async function registerLiveActivityRoutes(app: FastifyInstance) {
  // ============================================
  // GET /live/stats - Global aggregate statistics
  // ============================================
  app.get('/live/stats', { preHandler: optionalAuth }, async (request, reply) => {
    const query = request.query as { window?: string };
    const window = timeWindowSchema.parse(query.window || '1h') as TimeWindow;
    const minutes = TIME_WINDOWS[window];

    const stats = await getActivityStats(minutes);

    return reply.send({
      data: stats,
      meta: {
        window,
        minutes,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // ============================================
  // GET /live/map - Geo-clustered data for map display
  // ============================================
  app.get('/live/map', { preHandler: optionalAuth }, async (request, reply) => {
    const query = request.query as { window?: string };
    const window = timeWindowSchema.parse(query.window || '1h') as TimeWindow;
    const minutes = TIME_WINDOWS[window];

    const mapData = await getMapData(minutes);

    return reply.send({
      data: mapData,
      meta: {
        window,
        minutes,
        markerCount: mapData.length,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // ============================================
  // GET /live/hierarchy/:level - Drill-down data
  // ============================================
  app.get('/live/hierarchy/:level', { preHandler: optionalAuth }, async (request, reply) => {
    const params = request.params as { level: string };
    const query = request.query as { parent?: string; window?: string };

    const level = levelSchema.parse(params.level);
    const window = timeWindowSchema.parse(query.window || '1h') as TimeWindow;
    const minutes = TIME_WINDOWS[window];

    const hierarchyData = await getHierarchyData(level, query.parent, minutes);

    return reply.send({
      data: hierarchyData,
      meta: {
        level,
        parent: query.parent || null,
        window,
        minutes,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // ============================================
  // GET /live/trending - Trending exercises
  // ============================================
  app.get('/live/trending', { preHandler: optionalAuth }, async (request, reply) => {
    const query = request.query as { window?: string; limit?: string };
    const window = timeWindowSchema.parse(query.window || '1h') as TimeWindow;
    const minutes = TIME_WINDOWS[window];
    const limit = Math.min(parseInt(query.limit || '10'), 50);

    const trending = await getTrendingExercises(minutes, limit);

    return reply.send({
      data: trending,
      meta: {
        window,
        minutes,
        limit,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // ============================================
  // GET /live/feed - Recent activity events
  // ============================================
  app.get('/live/feed', { preHandler: optionalAuth }, async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(parseInt(query.limit || '50'), 100);

    const events = await getRecentEvents(limit);

    return reply.send({
      data: events,
      meta: {
        limit,
        count: events.length,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // ============================================
  // WebSocket /live/stream - Real-time event stream
  // ============================================
  app.get('/live/stream', { websocket: true }, async (socket, request) => {
    log.info('Live activity stream connected');

    // Subscribe to live activity events
    const subscription = subscribe(PUBSUB_CHANNELS.LIVE_ACTIVITY);

    // Send events to WebSocket client
    const sendEvents = async () => {
      try {
        for await (const event of subscription) {
          if (socket.readyState === 1) { // OPEN
            socket.send(JSON.stringify(event));
          } else {
            break;
          }
        }
      } catch (error) {
        log.error({ error }, 'Error in live activity stream');
      }
    };

    sendEvents();

    // Handle client messages (none expected, but handle gracefully)
    socket.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        // Could support filter commands here in the future
        log.debug({ data }, 'Received message from live stream client');
      } catch {
        // Ignore invalid messages
      }
    });

    // Cleanup on close
    socket.on('close', () => {
      log.info('Live activity stream disconnected');
      subscription.return?.();
    });

    socket.on('error', (error) => {
      log.error({ error }, 'Live activity stream error');
      subscription.return?.();
    });
  });

  // ============================================
  // POST /live/cleanup - Trigger cleanup (admin only)
  // ============================================
  app.post('/live/cleanup', { preHandler: optionalAuth }, async (request, reply) => {
    // Check if user is admin
    const user = request.user;
    if (!user || !user.roles?.includes('admin') && !user.roles?.includes('owner')) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Admin access required', statusCode: 403 },
      });
    }

    const deletedCount = await cleanupOldEvents();

    return reply.send({
      data: { deletedCount },
      meta: { timestamp: new Date().toISOString() },
    });
  });

  // ============================================
  // GET /live/filters - Available filter options
  // ============================================
  app.get('/live/filters', { preHandler: optionalAuth }, async (request, reply) => {
    // Return available filter options for the UI
    return reply.send({
      data: {
        timeWindows: [
          { value: '5m', label: 'Last 5 minutes' },
          { value: '15m', label: 'Last 15 minutes' },
          { value: '1h', label: 'Last hour' },
          { value: '24h', label: 'Last 24 hours' },
        ],
        muscleGroups: [
          { value: 'chest', label: 'Chest' },
          { value: 'back', label: 'Back' },
          { value: 'shoulders', label: 'Shoulders' },
          { value: 'arms', label: 'Arms' },
          { value: 'core', label: 'Core' },
          { value: 'legs', label: 'Legs' },
        ],
        eventTypes: [
          { value: 'workout.completed', label: 'Workout Completed' },
          { value: 'exercise.completed', label: 'Exercise Completed' },
          { value: 'achievement.earned', label: 'Achievement Earned' },
        ],
      },
    });
  });
}
