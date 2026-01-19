/**
 * Community Routes (Fastify)
 *
 * Handles community feed, presence, and real-time features.
 */

import { FastifyInstance } from 'fastify';
import { authenticate, optionalAuth, verifyToken } from './auth';
import { queryAll, queryOne } from '../../db/client';
import { getRedis, isRedisAvailable, REDIS_KEYS, TTL } from '../../lib/redis';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// Threshold constants for public stats
const THRESHOLDS = {
  ACTIVE_NOW: 5,
  ACTIVE_WORKOUTS: 3,
};

// Milestone thresholds
const MILESTONES = [100, 500, 1000, 5000, 10000, 25000, 50000, 100000];

// Anonymous activity messages
const ACTIVITY_MESSAGES: Record<string, (payload: any) => string> = {
  'workout.completed': (p) => `Someone just completed ${p.exerciseName || 'a workout'}`,
  'workout.started': () => 'Someone just started a workout',
  'level.up': () => 'Someone just leveled up!',
  'milestone.reached': () => 'Someone hit a new milestone!',
};

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

/**
 * Get count of users currently working out (have an active workout session)
 */
async function getActiveWorkoutCount(): Promise<number> {
  // Check for workouts started in the last hour that haven't been completed
  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(DISTINCT user_id)::int as count
     FROM workouts
     WHERE date = CURRENT_DATE
     AND created_at > NOW() - INTERVAL '1 hour'`
  );
  return parseInt(result?.count || '0');
}

/**
 * Get total workout count for milestone calculations
 */
async function getTotalWorkoutCount(): Promise<number> {
  const result = await queryOne<{ count: string }>('SELECT COUNT(*)::int as count FROM workouts');
  return parseInt(result?.count || '0');
}

/**
 * Get recent anonymous activity events (last 30 minutes)
 */
async function getRecentAnonymousActivity(): Promise<Array<{ type: string; message: string; createdAt: Date }>> {
  const events = await queryAll<{
    event_type: string;
    payload: string;
    created_at: Date;
  }>(
    `SELECT event_type, payload, created_at
     FROM activity_events
     WHERE visibility_scope = 'public_anon'
       AND created_at > NOW() - INTERVAL '30 minutes'
     ORDER BY created_at DESC
     LIMIT 20`
  );

  return events
    .map((e) => {
      const messageGen = ACTIVITY_MESSAGES[e.event_type];
      if (!messageGen) return null;
      try {
        const payload = JSON.parse(e.payload || '{}');
        return {
          type: e.event_type,
          message: messageGen(payload),
          createdAt: e.created_at,
        };
      } catch {
        return null;
      }
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);
}

/**
 * Calculate current milestone (if any)
 */
function calculateMilestone(totalWorkouts: number): { reached: boolean; value: number; next: number } | null {
  // Find the highest milestone reached
  let reachedMilestone = 0;
  let nextMilestone = MILESTONES[0];

  for (const milestone of MILESTONES) {
    if (totalWorkouts >= milestone) {
      reachedMilestone = milestone;
    } else {
      nextMilestone = milestone;
      break;
    }
  }

  if (reachedMilestone === 0) {
    return null;
  }

  // Only show if we just hit the milestone (within 100 workouts)
  const justReached = totalWorkouts - reachedMilestone < 100;

  return {
    reached: justReached,
    value: reachedMilestone,
    next: nextMilestone,
  };
}

/**
 * Format stat with threshold logic
 */
function formatStatWithThreshold(value: number, threshold: number): { value: number; display: string; threshold: boolean } {
  if (value < threshold) {
    return { value, display: `${threshold}+`, threshold: true };
  }
  return { value, display: value.toString(), threshold: false };
}

// In-memory tracking of public WebSocket connections
const publicWsConnections = new Set<WebSocket>();

export async function registerCommunityRoutes(app: FastifyInstance) {
  // Get community feed
  // PERF-002: Optimized from ~800ms to <200ms using:
  // - Covering indexes with INCLUDE clause
  // - Two-phase query (events first, then batch load users)
  // - Partial index on privacy settings for fast filtering
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

    // Phase 1: Get activity events using index-only scan
    // The covering index includes user_id, event_type, payload, visibility_scope, geo_bucket
    let sql: string;
    let queryParams: unknown[];

    if (cursorTime && cursorId) {
      // Use keyset pagination for O(1) performance
      sql = `SELECT ae.id, ae.user_id, ae.event_type, ae.payload, ae.visibility_scope, ae.geo_bucket, ae.created_at
             FROM activity_events ae
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
      sql = `SELECT ae.id, ae.user_id, ae.event_type, ae.payload, ae.visibility_scope, ae.geo_bucket, ae.created_at
             FROM activity_events ae
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

    // Phase 2: Batch load users in a single query (avoids N+1)
    const userIds = [...new Set(events.filter(e => e.user_id).map(e => e.user_id))];
    let userMap: Map<string, { id: string; username: string; display_name: string | null; avatar_url: string | null }> = new Map();

    if (userIds.length > 0) {
      const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
      const users = await queryAll<{ id: string; username: string; display_name: string | null; avatar_url: string | null }>(
        `SELECT id, username, display_name, avatar_url FROM users WHERE id IN (${placeholders})`,
        userIds
      );
      userMap = new Map(users.map(u => [u.id, u]));
    }

    // Generate next cursor from last item
    const lastEvent = events[events.length - 1];
    const nextCursor = lastEvent
      ? `${new Date(lastEvent.created_at).toISOString()}:${lastEvent.id}`
      : null;

    return reply.send({
      data: events.map((e) => {
        const user = e.user_id ? userMap.get(e.user_id) : null;
        return {
          id: e.id,
          type: e.event_type,
          payload: JSON.parse(e.payload || '{}'),
          visibilityScope: e.visibility_scope,
          geoBucket: e.geo_bucket,
          createdAt: e.created_at,
          user: user
            ? {
                id: user.id,
                username: user.username,
                displayName: user.display_name,
                avatarUrl: user.avatar_url,
              }
            : null,
        };
      }),
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

  // Public stats endpoint (no auth required) - for landing page
  app.get('/community/stats/public', async (request, reply) => {
    const [activeNow, totalUsers, activeWorkouts, totalWorkouts, recentActivity] = await Promise.all([
      getActiveUserCount(),
      queryOne<{ count: string }>('SELECT COUNT(*)::int as count FROM users'),
      getActiveWorkoutCount(),
      getTotalWorkoutCount(),
      getRecentAnonymousActivity(),
    ]);

    const totalUsersCount = parseInt(totalUsers?.count || '0');
    const milestone = calculateMilestone(totalWorkouts);

    return reply.send({
      data: {
        activeNow: formatStatWithThreshold(activeNow, THRESHOLDS.ACTIVE_NOW),
        activeWorkouts: formatStatWithThreshold(activeWorkouts, THRESHOLDS.ACTIVE_WORKOUTS),
        totalUsers: { value: totalUsersCount, display: totalUsersCount.toString(), threshold: false },
        totalWorkouts: { value: totalWorkouts, display: totalWorkouts.toString(), threshold: false },
        recentActivity,
        milestone,
      },
    });
  });

  // Public WebSocket for real-time updates (no auth required)
  app.get('/community/ws/public', { websocket: true }, (socket, _request) => {
    log.info('Public WebSocket connected');
    publicWsConnections.add(socket as unknown as WebSocket);

    // Send initial snapshot
    Promise.all([
      getActiveUserCount(),
      queryOne<{ count: string }>('SELECT COUNT(*)::int as count FROM users'),
      getActiveWorkoutCount(),
      getTotalWorkoutCount(),
      getRecentAnonymousActivity(),
    ]).then(([activeNow, totalUsers, activeWorkouts, totalWorkouts, recentActivity]) => {
      const totalUsersCount = parseInt(totalUsers?.count || '0');
      const milestone = calculateMilestone(totalWorkouts);

      socket.send(
        JSON.stringify({
          type: 'snapshot',
          data: {
            activeNow: formatStatWithThreshold(activeNow, THRESHOLDS.ACTIVE_NOW),
            activeWorkouts: formatStatWithThreshold(activeWorkouts, THRESHOLDS.ACTIVE_WORKOUTS),
            totalUsers: { value: totalUsersCount, display: totalUsersCount.toString(), threshold: false },
            totalWorkouts: { value: totalWorkouts, display: totalWorkouts.toString(), threshold: false },
            recentActivity,
            milestone,
          },
        })
      );
    });

    // Handle messages (ping/pong for keepalive)
    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {}
    });

    socket.on('close', () => {
      log.info('Public WebSocket disconnected');
      publicWsConnections.delete(socket as unknown as WebSocket);
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

  // Community now stats endpoint (for CommunityDashboard)
  app.get('/community/now', async (request, reply) => {
    const [activeCount, topExercises] = await Promise.all([
      getActiveUserCount(),
      queryAll<{ exercise_id: string; name: string; count: string }>(
        `SELECT w.exercise_data::jsonb->>0 as exercise_id, e.name, COUNT(*) as count
         FROM workouts w
         LEFT JOIN exercises e ON (w.exercise_data::jsonb->>0) = e.id
         WHERE w.created_at > NOW() - INTERVAL '15 minutes'
         AND w.exercise_data IS NOT NULL
         GROUP BY w.exercise_data::jsonb->>0, e.name
         ORDER BY count DESC
         LIMIT 10`
      ),
    ]);

    return reply.send({
      data: {
        activeUsers: activeCount,
        topExercises: topExercises.map((ex) => ({
          exerciseId: ex.exercise_id,
          name: ex.name || 'Unknown',
          count: parseInt(ex.count || '0'),
        })),
      },
    });
  });

  // Community stats summary endpoint
  app.get('/community/stats/summary', async (request, reply) => {
    const params = request.query as { window?: string };
    const window = params.window || '24h';
    // Use parameterized interval to prevent SQL injection
    const intervalDays = window === '7d' ? 7 : 1;

    const [totalUsers, activeUsers, workoutsCount, totalWorkoutVolume] = await Promise.all([
      queryOne<{ count: string }>('SELECT COUNT(*)::int as count FROM users'),
      getActiveUserCount(),
      queryOne<{ count: string }>(
        `SELECT COUNT(*)::int as count FROM workouts
         WHERE created_at > NOW() - INTERVAL '1 day' * $1`,
        [intervalDays]
      ),
      queryOne<{ total: string }>(
        `SELECT COALESCE(SUM(total_tu), 0) as total FROM workouts
         WHERE created_at > NOW() - INTERVAL '1 day' * $1`,
        [intervalDays]
      ),
    ]);

    return reply.send({
      data: {
        totalUsers: parseInt(totalUsers?.count || '0'),
        activeUsers,
        workoutsCount: parseInt(workoutsCount?.count || '0'),
        totalWorkoutVolume: parseInt(totalWorkoutVolume?.total || '0'),
        window,
      },
    });
  });

  // Community stats archetypes endpoint
  app.get('/community/stats/archetypes', async (request, reply) => {
    const archetypes = await queryAll<{ archetype_id: string; name: string; count: string }>(
      `SELECT ua.archetype_id, a.name, COUNT(*)::int as count
       FROM user_archetypes ua
       JOIN archetypes a ON ua.archetype_id = a.id
       GROUP BY ua.archetype_id, a.name
       ORDER BY count DESC
       LIMIT 10`
    );

    return reply.send({
      data: archetypes.map((a) => ({
        id: a.archetype_id,
        name: a.name,
        count: parseInt(a.count || '0'),
      })),
    });
  });

  // Community stats exercises endpoint
  app.get('/community/stats/exercises', async (request, reply) => {
    const params = request.query as { window?: string; limit?: string };
    const window = params.window || '7d';
    const limit = Math.min(parseInt(params.limit || '20'), 50);
    // Use parameterized interval to prevent SQL injection
    const intervalDays = window === '30d' ? 30 : 7;

    const exercises = await queryAll<{ exercise_id: string; name: string; count: string }>(
      `SELECT ea.exercise_id, e.name, COUNT(*)::int as count
       FROM workout_exercises we
       JOIN exercise_activations ea ON we.exercise_id = ea.exercise_id
       JOIN exercises e ON ea.exercise_id = e.id
       WHERE we.created_at > NOW() - INTERVAL '1 day' * $2
       GROUP BY ea.exercise_id, e.name
       ORDER BY count DESC
       LIMIT $1`,
      [limit, intervalDays]
    );

    return reply.send({
      data: exercises.map((ex) => ({
        id: ex.exercise_id,
        name: ex.name,
        count: parseInt(ex.count || '0'),
      })),
    });
  });

  // Community stats funnel endpoint
  app.get('/community/stats/funnel', async (request, reply) => {
    const [registered, onboarded, firstWorkout, active] = await Promise.all([
      queryOne<{ count: string }>('SELECT COUNT(*)::int as count FROM users'),
      queryOne<{ count: string }>('SELECT COUNT(*)::int as count FROM users WHERE onboarding_completed = true'),
      queryOne<{ count: string }>(
        'SELECT COUNT(DISTINCT user_id)::int as count FROM workouts'
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(DISTINCT user_id)::int as count FROM workouts WHERE created_at > NOW() - INTERVAL '7 days'`
      ),
    ]);

    return reply.send({
      data: {
        registered: parseInt(registered?.count || '0'),
        onboarded: parseInt(onboarded?.count || '0'),
        firstWorkout: parseInt(firstWorkout?.count || '0'),
        activeLastWeek: parseInt(active?.count || '0'),
      },
    });
  });

  // Community stats credits endpoint
  app.get('/community/stats/credits', async (request, reply) => {
    const [totalCredits, totalSpent, avgBalance] = await Promise.all([
      queryOne<{ total: string }>('SELECT COALESCE(SUM(balance), 0) as total FROM wallets'),
      queryOne<{ total: string }>(
        `SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM wallet_transactions WHERE amount < 0`
      ),
      queryOne<{ avg: string }>('SELECT COALESCE(AVG(balance), 0) as avg FROM wallets'),
    ]);

    return reply.send({
      data: {
        totalCredits: parseInt(totalCredits?.total || '0'),
        totalSpent: parseInt(totalSpent?.total || '0'),
        avgBalance: parseFloat(avgBalance?.avg || '0'),
      },
    });
  });

  // Community stats geographic endpoint
  app.get('/community/stats/geographic', async (request, reply) => {
    const byGeoBucket = await getPresenceByGeoBucket();

    return reply.send({
      data: {
        byGeoBucket,
      },
    });
  });

  // Admin control users endpoint (for EmpireControl)
  app.get('/admin-control/users', { preHandler: authenticate }, async (request, reply) => {
    const roles = request.user!.roles || [];
    if (!roles.includes('admin') && !roles.includes('owner')) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Admin or owner role required', statusCode: 403 },
      });
    }

    const params = request.query as { limit?: string };
    const limit = Math.min(parseInt(params.limit || '50'), 100);

    const users = await queryAll<{
      id: string;
      username: string;
      email: string;
      display_name: string;
      avatar_url: string;
      roles: string[];
      created_at: Date;
      total_xp: number;
      current_rank: string;
    }>(
      `SELECT id, username, email, display_name, avatar_url, roles, created_at, total_xp, current_rank
       FROM users
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    return reply.send({
      data: users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
        roles: u.roles || [],
        createdAt: u.created_at,
        totalXp: u.total_xp || 0,
        currentRank: u.current_rank || 'novice',
      })),
      total: users.length,
    });
  });

  // Admin audit credits endpoint
  app.get('/admin-control/audit/credits', { preHandler: authenticate }, async (request, reply) => {
    const roles = request.user!.roles || [];
    if (!roles.includes('admin') && !roles.includes('owner')) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Admin or owner role required', statusCode: 403 },
      });
    }

    const [totalGifted, totalTransactions] = await Promise.all([
      queryOne<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM wallet_transactions WHERE action LIKE '%gift%' OR action LIKE '%grant%'`
      ),
      queryOne<{ count: string }>('SELECT COUNT(*)::int as count FROM wallet_transactions'),
    ]);

    return reply.send({
      totalGifted: parseInt(totalGifted?.total || '0'),
      totalTransactions: parseInt(totalTransactions?.count || '0'),
    });
  });

  // WebSocket for real-time updates
  app.get('/community/ws', { websocket: true }, (socket, request) => {
    const token = (request.query as { token?: string }).token;

    if (!token) {
      socket.close(1008, 'Missing token');
      return;
    }

    // Verify token
    try {
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
