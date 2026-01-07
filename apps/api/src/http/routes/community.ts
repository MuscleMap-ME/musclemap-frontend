/**
 * Community Routes (Fastify)
 *
 * Handles community feed, presence, and real-time features.
 */

import { FastifyInstance } from 'fastify';
import { authenticate, optionalAuth } from './auth';
import { queryAll, queryOne, query } from '../../db/client';
import { getRedis, isRedisAvailable, REDIS_KEYS, TTL } from '../../lib/redis';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// In-memory presence fallback
const inMemoryPresence = new Map<string, { ts: number; geoBucket?: string; stageId?: string }>();

/**
 * Get active user count
 */
async function getActiveUserCount(windowSeconds = 120): Promise<number> {
  const redis = getRedis();

  if (!redis) {
    const cutoff = Date.now() - windowSeconds * 1000;
    let count = 0;
    for (const meta of inMemoryPresence.values()) {
      if (meta.ts > cutoff) count++;
    }
    return count;
  }

  const cutoff = Date.now() - windowSeconds * 1000;
  return await redis.zcount(REDIS_KEYS.PRESENCE_ZSET, cutoff, '+inf');
}

/**
 * Get presence stats by geo bucket
 */
async function getPresenceByGeoBucket(): Promise<Array<{ geoBucket: string; count: number }>> {
  const redis = getRedis();
  const buckets: Record<string, number> = {};

  if (!redis) {
    const cutoff = Date.now() - 120 * 1000;
    for (const meta of inMemoryPresence.values()) {
      if (meta.ts > cutoff && meta.geoBucket) {
        buckets[meta.geoBucket] = (buckets[meta.geoBucket] || 0) + 1;
      }
    }
  } else {
    const userIds = await redis.zrangebyscore(REDIS_KEYS.PRESENCE_ZSET, Date.now() - 120 * 1000, '+inf');
    const pipeline = redis.pipeline();
    for (const userId of userIds) {
      pipeline.get(REDIS_KEYS.PRESENCE_META(userId));
    }
    const responses = await pipeline.exec();
    if (responses) {
      for (const [err, data] of responses) {
        if (!err && data) {
          try {
            const meta = JSON.parse(data as string);
            if (meta.geoBucket) {
              buckets[meta.geoBucket] = (buckets[meta.geoBucket] || 0) + 1;
            }
          } catch {}
        }
      }
    }
  }

  return Object.entries(buckets)
    .map(([geoBucket, count]) => ({ geoBucket, count }))
    .sort((a, b) => b.count - a.count);
}

export async function registerCommunityRoutes(app: FastifyInstance) {
  // Get community feed
  app.get('/community/feed', { preHandler: optionalAuth }, async (request, reply) => {
    const params = request.query as { limit?: string; cursor?: string };
    const limit = Math.min(parseInt(params.limit || '50'), 100);

    // Parse cursor (format: "timestamp:id" or empty for first page)
    let cursorTime: string | null = null;
    let cursorId: string | null = null;
    if (params.cursor) {
      const [time, id] = params.cursor.split(':');
      cursorTime = time;
      cursorId = id;
    }

    // Use keyset pagination for scale
    // Exclude users who have opted out of community feed via privacy settings
    let sql: string;
    let queryParams: unknown[];

    if (cursorTime && cursorId) {
      sql = `SELECT ae.*, u.username, u.display_name, u.avatar_url
             FROM activity_events ae
             LEFT JOIN users u ON ae.user_id = u.id
             WHERE ae.visibility_scope IN ('public_anon', 'public_profile')
               AND (ae.created_at, ae.id) < ($1::timestamptz, $2)
               AND NOT EXISTS (
                 SELECT 1 FROM user_privacy_mode pm
                 WHERE pm.user_id = ae.user_id
                 AND (pm.minimalist_mode = true OR pm.opt_out_community_feed = true OR pm.exclude_from_activity_feed = true)
               )
             ORDER BY ae.created_at DESC, ae.id DESC
             LIMIT $3`;
      queryParams = [cursorTime, cursorId, limit];
    } else {
      sql = `SELECT ae.*, u.username, u.display_name, u.avatar_url
             FROM activity_events ae
             LEFT JOIN users u ON ae.user_id = u.id
             WHERE ae.visibility_scope IN ('public_anon', 'public_profile')
               AND NOT EXISTS (
                 SELECT 1 FROM user_privacy_mode pm
                 WHERE pm.user_id = ae.user_id
                 AND (pm.minimalist_mode = true OR pm.opt_out_community_feed = true OR pm.exclude_from_activity_feed = true)
               )
             ORDER BY ae.created_at DESC, ae.id DESC
             LIMIT $1`;
      queryParams = [limit];
    }

    const events = await queryAll<{
      id: string;
      user_id: string;
      event_type: string;
      payload: string;
      visibility_scope: string;
      geo_bucket: string;
      created_at: Date;
    }>(sql, queryParams);

    // Generate next cursor from last item
    const lastEvent = events[events.length - 1];
    const nextCursor = lastEvent
      ? `${new Date(lastEvent.created_at).toISOString()}:${lastEvent.id}`
      : null;

    return reply.send({
      data: events.map((e: any) => ({
        id: e.id,
        type: e.event_type,
        payload: JSON.parse(e.payload || '{}'),
        visibilityScope: e.visibility_scope,
        geoBucket: e.geo_bucket,
        createdAt: e.created_at,
        user: e.user_id
          ? {
              id: e.user_id,
              username: e.username,
              displayName: e.display_name,
              avatarUrl: e.avatar_url,
            }
          : null,
      })),
      meta: {
        limit,
        cursor: params.cursor || null,
        nextCursor,
        hasMore: events.length === limit,
      },
    });
  });

  // Get community stats
  app.get('/community/stats', async (request, reply) => {
    const [activeCount, totalUsers, workoutsToday] = await Promise.all([
      getActiveUserCount(),
      queryOne<{ count: string }>('SELECT COUNT(*)::int as count FROM users'),
      queryOne<{ count: string }>(
        "SELECT COUNT(*)::int as count FROM workouts WHERE date = CURRENT_DATE"
      ),
    ]);

    return reply.send({
      data: {
        activeNow: activeCount,
        totalUsers: parseInt(totalUsers?.count || '0'),
        workoutsToday: parseInt(workoutsToday?.count || '0'),
      },
    });
  });

  // Get presence data
  app.get('/community/presence', async (request, reply) => {
    const [activeCount, byGeoBucket] = await Promise.all([
      getActiveUserCount(),
      getPresenceByGeoBucket(),
    ]);

    return reply.send({
      data: {
        total: activeCount,
        byGeoBucket,
        redisEnabled: isRedisAvailable(),
      },
    });
  });

  // Update presence (heartbeat)
  app.post('/community/presence', { preHandler: authenticate }, async (request, reply) => {
    const body = request.body as { geoBucket?: string; stageId?: string };
    const userId = request.user!.userId;
    const now = Date.now();

    const meta = {
      ts: now,
      geoBucket: body.geoBucket,
      stageId: body.stageId,
    };

    const redis = getRedis();

    if (redis) {
      await redis
        .pipeline()
        .zadd(REDIS_KEYS.PRESENCE_ZSET, now, userId)
        .setex(REDIS_KEYS.PRESENCE_META(userId), TTL.PRESENCE, JSON.stringify(meta))
        .exec();
    } else {
      inMemoryPresence.set(userId, meta);
      // Prune old entries
      const cutoff = now - TTL.PRESENCE * 1000;
      for (const [id, m] of inMemoryPresence.entries()) {
        if (m.ts < cutoff) inMemoryPresence.delete(id);
      }
    }

    return reply.send({ data: { acknowledged: true } });
  });

  // Monitor endpoint (role-gated)
  app.get('/community/monitor', { preHandler: authenticate }, async (request, reply) => {
    const roles = request.user!.roles || [];
    if (!roles.includes('admin') && !roles.includes('moderator')) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Admin or moderator role required', statusCode: 403 },
      });
    }

    const [activeCount, byGeoBucket, recentEvents] = await Promise.all([
      getActiveUserCount(),
      getPresenceByGeoBucket(),
      queryAll(
        `SELECT * FROM activity_events ORDER BY created_at DESC LIMIT 100`
      ),
    ]);

    return reply.send({
      data: {
        presence: {
          total: activeCount,
          byGeoBucket,
        },
        recentEvents: recentEvents.map((e: any) => ({
          ...e,
          payload: JSON.parse(e.payload || '{}'),
        })),
        redisEnabled: isRedisAvailable(),
      },
    });
  });

  // Legacy percentile endpoint
  app.get('/community/percentile', { preHandler: authenticate }, async (request, reply) => {
    return reply.send({ data: { percentile: 50 } });
  });

  // WebSocket for real-time updates
  app.get('/community/ws', { websocket: true }, (socket, request) => {
    const token = (request.query as { token?: string }).token;

    if (!token) {
      socket.close(1008, 'Missing token');
      return;
    }

    // Verify token (simplified - in production use proper auth)
    try {
      const { verifyToken } = require('./auth');
      const user = verifyToken(token);

      log.info({ userId: user.userId }, 'WebSocket connected');

      // Send initial snapshot
      Promise.all([getActiveUserCount(), getPresenceByGeoBucket()]).then(
        ([activeCount, byGeoBucket]) => {
          socket.send(
            JSON.stringify({
              type: 'snapshot',
              data: { activeNow: activeCount, byGeoBucket },
            })
          );
        }
      );

      // Handle messages
      socket.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong' }));
          }
        } catch {}
      });

      socket.on('close', () => {
        log.info({ userId: user.userId }, 'WebSocket disconnected');
      });
    } catch {
      socket.close(1008, 'Invalid token');
    }
  });
}
