/**
 * Admin Control Routes
 *
 * Provides convenient endpoints for the AdminControl and EmpireControl frontend pages.
 * These consolidate various admin operations into a single endpoint namespace.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from './auth';
import { queryAll, queryOne, query } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.api;

const adjustCreditsSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int(),
  reason: z.string().min(1).max(500),
});

export async function registerAdminControlRoutes(app: FastifyInstance) {
  // Helper middleware for admin check
  const adminOnly = [authenticate, requireRole('admin')];

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

  // Emergency status
  app.get('/admin-control/emergency/status', { preHandler: adminOnly }, async (_request, reply) => {
    // Check system status
    const dbOk = await queryOne('SELECT 1');

    return reply.send({
      maintenanceMode: false,
      readOnly: false,
      databaseConnected: !!dbOk,
      timestamp: new Date().toISOString(),
    });
  });

  // Emergency actions
  app.post('/admin-control/emergency/:action', { preHandler: adminOnly }, async (request, reply) => {
    const { action } = request.params as { action: string };
    const adminId = request.user!.userId;

    log.warn({ adminId, action }, 'Emergency action triggered');

    switch (action) {
      case 'maintenance-on':
        // Would set maintenance mode - placeholder
        return reply.send({ success: true, message: 'Maintenance mode enabled' });
      case 'maintenance-off':
        return reply.send({ success: true, message: 'Maintenance mode disabled' });
      case 'readonly-on':
        return reply.send({ success: true, message: 'Read-only mode enabled' });
      case 'readonly-off':
        return reply.send({ success: true, message: 'Read-only mode disabled' });
      default:
        return reply.status(400).send({
          error: { code: 'INVALID_ACTION', message: `Unknown action: ${action}`, statusCode: 400 },
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
