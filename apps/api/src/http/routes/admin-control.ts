/**
 * Admin Control Routes
 *
 * Provides convenient endpoints for the AdminControl and EmpireControl frontend pages.
 * These consolidate various admin operations into a single endpoint namespace.
 *
 * Emergency Mode Features:
 * - Maintenance Mode: Returns 503 for all non-admin requests
 * - Read-Only Mode: Blocks POST/PUT/DELETE/PATCH for non-admin requests
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from './auth';
import { queryAll, queryOne, query } from '../../db/client';
import { loggers } from '../../lib/logger';
import { getRedis, isRedisAvailable } from '../../lib/redis';

const log = loggers.api;

// Redis keys for emergency modes
const REDIS_KEYS = {
  MAINTENANCE_MODE: 'system:maintenance_mode',
  READ_ONLY_MODE: 'system:read_only_mode',
  MAINTENANCE_MESSAGE: 'system:maintenance_message',
  MAINTENANCE_STARTED_BY: 'system:maintenance_started_by',
  MAINTENANCE_STARTED_AT: 'system:maintenance_started_at',
  READ_ONLY_STARTED_BY: 'system:read_only_started_by',
  READ_ONLY_STARTED_AT: 'system:read_only_started_at',
} as const;

// Database fallback for when Redis is not available
interface SystemSetting {
  key: string;
  value: string;
  updated_at: Date;
  updated_by: string | null;
}

/**
 * Get emergency mode status from Redis or database
 */
async function getEmergencyModeStatus(): Promise<{
  maintenanceMode: boolean;
  readOnlyMode: boolean;
  maintenanceMessage: string | null;
  maintenanceStartedBy: string | null;
  maintenanceStartedAt: string | null;
  readOnlyStartedBy: string | null;
  readOnlyStartedAt: string | null;
}> {
  const redis = getRedis();

  if (redis && isRedisAvailable()) {
    // Try Redis first (fast path)
    const [
      maintenanceMode,
      readOnlyMode,
      maintenanceMessage,
      maintenanceStartedBy,
      maintenanceStartedAt,
      readOnlyStartedBy,
      readOnlyStartedAt,
    ] = await Promise.all([
      redis.get(REDIS_KEYS.MAINTENANCE_MODE),
      redis.get(REDIS_KEYS.READ_ONLY_MODE),
      redis.get(REDIS_KEYS.MAINTENANCE_MESSAGE),
      redis.get(REDIS_KEYS.MAINTENANCE_STARTED_BY),
      redis.get(REDIS_KEYS.MAINTENANCE_STARTED_AT),
      redis.get(REDIS_KEYS.READ_ONLY_STARTED_BY),
      redis.get(REDIS_KEYS.READ_ONLY_STARTED_AT),
    ]);

    return {
      maintenanceMode: maintenanceMode === 'true',
      readOnlyMode: readOnlyMode === 'true',
      maintenanceMessage,
      maintenanceStartedBy,
      maintenanceStartedAt,
      readOnlyStartedBy,
      readOnlyStartedAt,
    };
  }

  // Fallback to database
  const settings = await queryAll<SystemSetting>(
    `SELECT key, value, updated_at, updated_by
     FROM system_settings
     WHERE key IN ($1, $2)`,
    ['maintenance_mode', 'read_only_mode']
  );

  const maintenanceSetting = settings.find((s) => s.key === 'maintenance_mode');
  const readOnlySetting = settings.find((s) => s.key === 'read_only_mode');

  return {
    maintenanceMode: maintenanceSetting?.value === 'true',
    readOnlyMode: readOnlySetting?.value === 'true',
    maintenanceMessage: null, // Not stored in DB fallback
    maintenanceStartedBy: maintenanceSetting?.updated_by || null,
    maintenanceStartedAt: maintenanceSetting?.updated_at?.toISOString() || null,
    readOnlyStartedBy: readOnlySetting?.updated_by || null,
    readOnlyStartedAt: readOnlySetting?.updated_at?.toISOString() || null,
  };
}

/**
 * Set maintenance mode status
 */
async function setMaintenanceMode(
  enabled: boolean,
  adminId: string,
  message?: string
): Promise<void> {
  const redis = getRedis();
  const now = new Date().toISOString();

  if (redis && isRedisAvailable()) {
    if (enabled) {
      await Promise.all([
        redis.set(REDIS_KEYS.MAINTENANCE_MODE, 'true'),
        redis.set(REDIS_KEYS.MAINTENANCE_STARTED_BY, adminId),
        redis.set(REDIS_KEYS.MAINTENANCE_STARTED_AT, now),
        message
          ? redis.set(REDIS_KEYS.MAINTENANCE_MESSAGE, message)
          : redis.del(REDIS_KEYS.MAINTENANCE_MESSAGE),
      ]);
    } else {
      await Promise.all([
        redis.del(REDIS_KEYS.MAINTENANCE_MODE),
        redis.del(REDIS_KEYS.MAINTENANCE_STARTED_BY),
        redis.del(REDIS_KEYS.MAINTENANCE_STARTED_AT),
        redis.del(REDIS_KEYS.MAINTENANCE_MESSAGE),
      ]);
    }
  }

  // Also persist to database for durability
  await query(
    `INSERT INTO system_settings (key, value, updated_by, updated_at)
     VALUES ('maintenance_mode', $1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_by = $2, updated_at = NOW()`,
    [enabled ? 'true' : 'false', adminId]
  );
}

/**
 * Set read-only mode status
 */
async function setReadOnlyMode(enabled: boolean, adminId: string): Promise<void> {
  const redis = getRedis();
  const now = new Date().toISOString();

  if (redis && isRedisAvailable()) {
    if (enabled) {
      await Promise.all([
        redis.set(REDIS_KEYS.READ_ONLY_MODE, 'true'),
        redis.set(REDIS_KEYS.READ_ONLY_STARTED_BY, adminId),
        redis.set(REDIS_KEYS.READ_ONLY_STARTED_AT, now),
      ]);
    } else {
      await Promise.all([
        redis.del(REDIS_KEYS.READ_ONLY_MODE),
        redis.del(REDIS_KEYS.READ_ONLY_STARTED_BY),
        redis.del(REDIS_KEYS.READ_ONLY_STARTED_AT),
      ]);
    }
  }

  // Also persist to database for durability
  await query(
    `INSERT INTO system_settings (key, value, updated_by, updated_at)
     VALUES ('read_only_mode', $1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_by = $2, updated_at = NOW()`,
    [enabled ? 'true' : 'false', adminId]
  );
}

/**
 * Check if user is admin
 */
function isAdmin(request: FastifyRequest): boolean {
  return request.user?.roles?.includes('admin') ?? false;
}

/**
 * Emergency mode middleware - checks maintenance and read-only modes
 * This should be registered early in the request lifecycle
 */
export async function emergencyModeMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Skip for health check endpoints
  if (request.url === '/health' || request.url === '/ready' || request.url === '/metrics') {
    return;
  }

  // Skip for admin control endpoints (so admins can disable emergency modes)
  if (request.url.startsWith('/api/admin-control/emergency')) {
    return;
  }

  const status = await getEmergencyModeStatus();

  // Check maintenance mode first (more restrictive)
  if (status.maintenanceMode) {
    // Allow admins through
    if (isAdmin(request)) {
      return;
    }

    log.info({ url: request.url, ip: request.ip }, 'Request blocked by maintenance mode');

    return reply.status(503).send({
      error: {
        code: 'MAINTENANCE_MODE',
        message: status.maintenanceMessage || 'The system is currently under maintenance. Please try again later.',
        statusCode: 503,
      },
    });
  }

  // Check read-only mode for mutating requests
  if (status.readOnlyMode) {
    const mutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

    if (mutatingMethods.includes(request.method)) {
      // Allow admins through
      if (isAdmin(request)) {
        return;
      }

      log.info({ url: request.url, method: request.method, ip: request.ip }, 'Request blocked by read-only mode');

      return reply.status(503).send({
        error: {
          code: 'READ_ONLY_MODE',
          message: 'The system is currently in read-only mode. Write operations are temporarily disabled.',
          statusCode: 503,
        },
      });
    }
  }
}

const adjustCreditsSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int(),
  reason: z.string().min(1).max(500),
});

// Export getEmergencyModeStatus for use in other parts of the application
export { getEmergencyModeStatus };

export async function registerAdminControlRoutes(app: FastifyInstance) {
  // Helper middleware for admin check
  const adminOnly = [authenticate, requireRole('admin')];

  // Public endpoint for checking system status (no auth required)
  // This allows the frontend to show maintenance/read-only banners to users
  app.get('/admin-control/system-status', async (_request, reply) => {
    try {
      const status = await getEmergencyModeStatus();

      return reply.send({
        maintenanceMode: status.maintenanceMode,
        maintenanceMessage: status.maintenanceMessage,
        readOnlyMode: status.readOnlyMode,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      log.error({ err }, 'Failed to get system status');
      // Return safe defaults if status check fails
      return reply.send({
        maintenanceMode: false,
        maintenanceMessage: null,
        readOnlyMode: false,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get all users (paginated)
  app.get('/admin-control/users', { preHandler: adminOnly }, async (request, reply) => {
    const params = request.query as { limit?: string; offset?: string; search?: string };
    const limit = Math.min(parseInt(params.limit || '50'), 100);
    const offset = parseInt(params.offset || '0');
    const search = params.search || '';

    let whereClause = '1=1';
    const queryParams: unknown[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause = `(username ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    queryParams.push(limit, offset);

    const users = await queryAll<{
      id: string;
      username: string;
      email: string;
      display_name: string;
      avatar_url: string;
      roles: string[];
      created_at: Date;
      total_xp: number;
      credit_balance: number;
      status: string;
    }>(
      `SELECT id, username, email, display_name, avatar_url, roles, created_at, total_xp, credit_balance,
              COALESCE(status, 'active') as status
       FROM users
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      queryParams
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM users WHERE ${whereClause}`,
      search ? [`%${search}%`] : []
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
        creditBalance: u.credit_balance || 0,
        status: u.status,
      })),
      total: parseInt(countResult?.count || '0'),
    });
  });

  // Get groups/communities
  app.get('/admin-control/groups', { preHandler: adminOnly }, async (request, reply) => {
    const groups = await queryAll<{
      id: string;
      name: string;
      description: string;
      member_count: number;
      created_at: Date;
    }>(
      `SELECT c.id, c.name, c.description,
              (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as member_count,
              c.created_at
       FROM communities c
       ORDER BY member_count DESC
       LIMIT 50`
    );

    return reply.send({
      data: groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        memberCount: g.member_count,
        createdAt: g.created_at,
      })),
    });
  });

  // Get audit log
  app.get('/admin-control/audit', { preHandler: adminOnly }, async (request, reply) => {
    const params = request.query as { limit?: string };
    const limit = Math.min(parseInt(params.limit || '50'), 100);

    const logs = await queryAll<{
      id: string;
      user_id: string;
      action: string;
      details: unknown;
      created_at: Date;
    }>(
      `SELECT id, user_id, action, details, created_at
       FROM audit_log
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    return reply.send({
      data: logs.map((l) => ({
        id: l.id,
        userId: l.user_id,
        action: l.action,
        details: l.details,
        createdAt: l.created_at,
      })),
    });
  });

  // Get credit audit
  app.get('/admin-control/audit/credits', { preHandler: adminOnly }, async (request, reply) => {
    const [totalGifted, totalTransactions, recentTransactions] = await Promise.all([
      queryOne<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0)::text as total
         FROM wallet_transactions
         WHERE action LIKE '%gift%' OR action LIKE '%grant%'`
      ),
      queryOne<{ count: string }>('SELECT COUNT(*)::text as count FROM wallet_transactions'),
      queryAll<{
        id: string;
        user_id: string;
        action: string;
        amount: number;
        created_at: Date;
      }>(
        `SELECT id, user_id, action, amount, created_at
         FROM wallet_transactions
         ORDER BY created_at DESC
         LIMIT 20`
      ),
    ]);

    return reply.send({
      totalGifted: parseInt(totalGifted?.total || '0'),
      totalTransactions: parseInt(totalTransactions?.count || '0'),
      recentTransactions: recentTransactions.map((t) => ({
        id: t.id,
        userId: t.user_id,
        action: t.action,
        amount: t.amount,
        createdAt: t.created_at,
      })),
    });
  });

  // Adjust user credits
  app.post('/admin-control/credits/adjust', { preHandler: adminOnly }, async (request, reply) => {
    const data = adjustCreditsSchema.parse(request.body);
    const adminId = request.user!.userId;

    try {
      // Update user's credit balance
      await query(
        `UPDATE users SET credit_balance = credit_balance + $1 WHERE id = $2`,
        [data.amount, data.userId]
      );

      // Log the transaction
      await query(
        `INSERT INTO wallet_transactions (user_id, action, amount, balance_before, balance_after, metadata)
         SELECT $1, 'admin_adjustment', $2, credit_balance - $2, credit_balance, $3
         FROM users WHERE id = $1`,
        [data.userId, data.amount, JSON.stringify({ adminId, reason: data.reason })]
      );

      // Log to audit
      await query(
        `INSERT INTO audit_log (user_id, action, details)
         VALUES ($1, 'admin_credit_adjustment', $2)`,
        [adminId, JSON.stringify({ targetUserId: data.userId, amount: data.amount, reason: data.reason })]
      );

      log.info({ adminId, userId: data.userId, amount: data.amount }, 'Admin credit adjustment');

      return reply.send({ success: true });
    } catch (err) {
      log.error({ err }, 'Failed to adjust credits');
      return reply.status(500).send({
        error: { code: 'ADJUSTMENT_FAILED', message: 'Failed to adjust credits', statusCode: 500 },
      });
    }
  });

  // Get pipelines (deployment/CI info)
  app.get('/admin-control/pipelines', { preHandler: adminOnly }, async (request, reply) => {
    // Return deployment pipeline info
    const logs = await queryAll<{
      id: string;
      sequence_key: string;
      status: string;
      started_at: Date;
      completed_at: Date | null;
    }>(
      `SELECT id, sequence_key, status, started_at, completed_at
       FROM deployment_logs
       ORDER BY started_at DESC
       LIMIT 20`
    );

    return reply.send({
      data: logs.map((l) => ({
        id: l.id,
        name: l.sequence_key || 'manual',
        status: l.status,
        startedAt: l.started_at,
        completedAt: l.completed_at,
      })),
    });
  });

  // Get available scripts
  app.get('/admin-control/scripts', { preHandler: adminOnly }, async (_request, reply) => {
    // Return list of available admin scripts
    const scripts = [
      { id: 'db-vacuum', name: 'Database Vacuum', description: 'Run VACUUM ANALYZE' },
      { id: 'cache-clear', name: 'Clear Cache', description: 'Clear Redis cache' },
      { id: 'reindex', name: 'Reindex Database', description: 'Rebuild indexes' },
      { id: 'backup', name: 'Create Backup', description: 'Create database backup' },
    ];

    return reply.send({ data: scripts });
  });

  // Emergency status - returns current maintenance and read-only mode status
  app.get('/admin-control/emergency/status', { preHandler: adminOnly }, async (_request, reply) => {
    try {
      // Get emergency mode status
      const status = await getEmergencyModeStatus();

      // Check database connectivity
      const dbOk = await queryOne('SELECT 1');

      // Check Redis connectivity
      const redis = getRedis();
      const redisOk = redis && isRedisAvailable();

      return reply.send({
        maintenanceMode: status.maintenanceMode,
        maintenanceMessage: status.maintenanceMessage,
        maintenanceStartedBy: status.maintenanceStartedBy,
        maintenanceStartedAt: status.maintenanceStartedAt,
        readOnlyMode: status.readOnlyMode,
        readOnlyStartedBy: status.readOnlyStartedBy,
        readOnlyStartedAt: status.readOnlyStartedAt,
        databaseConnected: !!dbOk,
        redisConnected: !!redisOk,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      log.error({ err }, 'Failed to get emergency status');
      return reply.status(500).send({
        error: { code: 'STATUS_CHECK_FAILED', message: 'Failed to check emergency status', statusCode: 500 },
      });
    }
  });

  // Emergency actions - enable/disable maintenance and read-only modes
  app.post('/admin-control/emergency/:action', { preHandler: adminOnly }, async (request, reply) => {
    const { action } = request.params as { action: string };
    const body = request.body as { message?: string } | undefined;
    const adminId = request.user!.userId;

    log.warn({ adminId, action }, 'Emergency action triggered');

    try {
      switch (action) {
        case 'maintenance-on': {
          await setMaintenanceMode(true, adminId, body?.message);

          // Log to audit
          await query(
            `INSERT INTO audit_log (user_id, action, details)
             VALUES ($1, 'emergency_maintenance_on', $2)`,
            [adminId, JSON.stringify({ message: body?.message })]
          );

          log.warn({ adminId, message: body?.message }, 'MAINTENANCE MODE ENABLED');

          return reply.send({
            success: true,
            message: 'Maintenance mode enabled',
            maintenanceMode: true,
          });
        }
        case 'maintenance-off': {
          await setMaintenanceMode(false, adminId);

          // Log to audit
          await query(
            `INSERT INTO audit_log (user_id, action, details)
             VALUES ($1, 'emergency_maintenance_off', $2)`,
            [adminId, JSON.stringify({})]
          );

          log.info({ adminId }, 'Maintenance mode disabled');

          return reply.send({
            success: true,
            message: 'Maintenance mode disabled',
            maintenanceMode: false,
          });
        }
        case 'readonly-on': {
          await setReadOnlyMode(true, adminId);

          // Log to audit
          await query(
            `INSERT INTO audit_log (user_id, action, details)
             VALUES ($1, 'emergency_readonly_on', $2)`,
            [adminId, JSON.stringify({})]
          );

          log.warn({ adminId }, 'READ-ONLY MODE ENABLED');

          return reply.send({
            success: true,
            message: 'Read-only mode enabled',
            readOnlyMode: true,
          });
        }
        case 'readonly-off': {
          await setReadOnlyMode(false, adminId);

          // Log to audit
          await query(
            `INSERT INTO audit_log (user_id, action, details)
             VALUES ($1, 'emergency_readonly_off', $2)`,
            [adminId, JSON.stringify({})]
          );

          log.info({ adminId }, 'Read-only mode disabled');

          return reply.send({
            success: true,
            message: 'Read-only mode disabled',
            readOnlyMode: false,
          });
        }
        default:
          return reply.status(400).send({
            error: { code: 'INVALID_ACTION', message: `Unknown action: ${action}`, statusCode: 400 },
          });
      }
    } catch (err) {
      log.error({ err, action, adminId }, 'Failed to execute emergency action');
      return reply.status(500).send({
        error: { code: 'ACTION_FAILED', message: 'Failed to execute emergency action', statusCode: 500 },
      });
    }
  });

  // User actions (ban, unban, reset, etc.)
  app.post('/admin-control/users/:userId/:action', { preHandler: adminOnly }, async (request, reply) => {
    const { userId, action } = request.params as { userId: string; action: string };
    const adminId = request.user!.userId;

    log.info({ adminId, userId, action }, 'Admin user action');

    try {
      switch (action) {
        case 'ban':
          await query(`UPDATE users SET status = 'banned', updated_at = NOW() WHERE id = $1`, [userId]);
          break;
        case 'unban':
          await query(`UPDATE users SET status = 'active', updated_at = NOW() WHERE id = $1`, [userId]);
          break;
        case 'reset-password':
          // Would trigger password reset email - placeholder
          break;
        case 'verify':
          await query(`UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1`, [userId]);
          break;
        default:
          return reply.status(400).send({
            error: { code: 'INVALID_ACTION', message: `Unknown action: ${action}`, statusCode: 400 },
          });
      }

      // Log to audit
      await query(
        `INSERT INTO audit_log (user_id, action, details)
         VALUES ($1, $2, $3)`,
        [adminId, `admin_user_${action}`, JSON.stringify({ targetUserId: userId })]
      );

      return reply.send({ success: true });
    } catch (err) {
      log.error({ err }, 'Failed to execute user action');
      return reply.status(500).send({
        error: { code: 'ACTION_FAILED', message: 'Failed to execute action', statusCode: 500 },
      });
    }
  });
}
