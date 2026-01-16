/**
 * Admin Security Routes
 *
 * Handles security audit and management:
 * - Failed login attempts monitoring
 * - Session management
 * - IP blocklist management
 * - Rate limit configuration
 * - Security audit logs
 * - Security scans
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { query, queryOne, queryAll } from '../../db/client';
import { authenticate, requireAdmin } from './auth';
import { loggers } from '../../lib/logger';

const log = loggers.api;

// ============================================
// Zod Schemas
// ============================================

const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

const ipBlocklistSchema = z.object({
  ip: z.string().ip(),
  reason: z.string().min(1).max(500),
});

const rateLimitUpdateSchema = z.object({
  endpoint: z.string().min(1),
  requests_per_minute: z.number().int().min(1).max(10000),
  requests_per_hour: z.number().int().min(1).max(100000).optional(),
  burst_limit: z.number().int().min(1).max(1000).optional(),
});

const auditLogFilterSchema = z.object({
  event_type: z.string().optional(),
  user_id: z.string().optional(),
  ip: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// ============================================
// TypeScript Interfaces
// ============================================

interface LoginAttemptRow {
  id: string;
  email: string;
  ip_address: string;
  user_agent: string | null;
  failure_reason: string;
  created_at: Date;
}

interface SessionRow {
  id: string;
  user_id: string;
  ip_address: string;
  user_agent: string | null;
  created_at: Date;
  last_active_at: Date;
  expires_at: Date;
  username: string;
  email: string;
}

interface BlocklistRow {
  ip: string;
  reason: string;
  blocked_at: Date;
  blocked_by: string;
  blocked_by_username: string;
}

interface RateLimitRow {
  id: string;
  endpoint: string;
  requests_per_minute: number;
  requests_per_hour: number | null;
  burst_limit: number | null;
  updated_at: Date;
  updated_by: string | null;
}

interface AuditLogRow {
  id: string;
  event_type: string;
  details: Record<string, unknown>;
  ip: string | null;
  user_id: string | null;
  created_at: Date;
  username: string | null;
}

interface SecurityScanResult {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  details?: Record<string, unknown>;
}

// ============================================
// Helper Functions
// ============================================

async function logSecurityEvent(
  eventType: string,
  details: Record<string, unknown>,
  ip: string | null,
  userId: string | null
): Promise<void> {
  await query(
    `INSERT INTO security_audit_log (event_type, details, ip, user_id)
     VALUES ($1, $2, $3, $4)`,
    [eventType, JSON.stringify(details), ip, userId]
  );
}

// ============================================
// Route Handler
// ============================================

export default async function adminSecurityRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /admin/security/login-attempts
   * Get failed login attempts in the last 24 hours
   */
  app.get(
    '/admin/security/login-attempts',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = paginationSchema.parse(request.query);

      let sql = `
        SELECT
          id, email, ip_address, user_agent, failure_reason, created_at
        FROM failed_login_attempts
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `;
      const queryParams: unknown[] = [];
      let paramIndex = 1;

      if (params.cursor) {
        const [cursorDate, cursorId] = params.cursor.split('|');
        sql += ` AND (created_at < $${paramIndex++} OR (created_at = $${paramIndex - 1} AND id < $${paramIndex++}))`;
        queryParams.push(cursorDate, cursorId);
      }

      sql += ` ORDER BY created_at DESC, id DESC LIMIT $${paramIndex}`;
      queryParams.push(params.limit + 1);

      const rows = await queryAll<LoginAttemptRow>(sql, queryParams);
      const hasMore = rows.length > params.limit;
      const items = hasMore ? rows.slice(0, -1) : rows;

      const nextCursor = hasMore && items.length > 0
        ? `${items[items.length - 1].created_at.toISOString()}|${items[items.length - 1].id}`
        : null;

      // Get summary stats
      const stats = await queryOne<{
        total_24h: string;
        unique_ips: string;
        unique_emails: string;
      }>(`
        SELECT
          COUNT(*) as total_24h,
          COUNT(DISTINCT ip_address) as unique_ips,
          COUNT(DISTINCT email) as unique_emails
        FROM failed_login_attempts
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);

      return reply.send({
        items: items.map((row) => ({
          id: row.id,
          email: row.email,
          ipAddress: row.ip_address,
          userAgent: row.user_agent,
          failureReason: row.failure_reason,
          createdAt: row.created_at,
        })),
        nextCursor,
        hasMore,
        stats: {
          total24h: parseInt(stats?.total_24h || '0'),
          uniqueIps: parseInt(stats?.unique_ips || '0'),
          uniqueEmails: parseInt(stats?.unique_emails || '0'),
        },
      });
    }
  );

  /**
   * GET /admin/security/sessions
   * Get all active user sessions
   */
  app.get(
    '/admin/security/sessions',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = paginationSchema.parse(request.query);

      let sql = `
        SELECT
          s.id, s.user_id, s.ip_address, s.user_agent,
          s.created_at, s.last_active_at, s.expires_at,
          u.username, u.email
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.expires_at > NOW()
      `;
      const queryParams: unknown[] = [];
      let paramIndex = 1;

      if (params.cursor) {
        const [cursorDate, cursorId] = params.cursor.split('|');
        sql += ` AND (s.last_active_at < $${paramIndex++} OR (s.last_active_at = $${paramIndex - 1} AND s.id < $${paramIndex++}))`;
        queryParams.push(cursorDate, cursorId);
      }

      sql += ` ORDER BY s.last_active_at DESC, s.id DESC LIMIT $${paramIndex}`;
      queryParams.push(params.limit + 1);

      const rows = await queryAll<SessionRow>(sql, queryParams);
      const hasMore = rows.length > params.limit;
      const items = hasMore ? rows.slice(0, -1) : rows;

      const nextCursor = hasMore && items.length > 0
        ? `${items[items.length - 1].last_active_at.toISOString()}|${items[items.length - 1].id}`
        : null;

      // Get total active sessions
      const totalCount = await queryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM user_sessions WHERE expires_at > NOW()
      `);

      return reply.send({
        items: items.map((row) => ({
          id: row.id,
          userId: row.user_id,
          username: row.username,
          email: row.email,
          ipAddress: row.ip_address,
          userAgent: row.user_agent,
          createdAt: row.created_at,
          lastActiveAt: row.last_active_at,
          expiresAt: row.expires_at,
        })),
        nextCursor,
        hasMore,
        totalCount: parseInt(totalCount?.count || '0'),
      });
    }
  );

  /**
   * DELETE /admin/security/sessions/:id
   * Terminate a specific session
   */
  app.delete(
    '/admin/security/sessions/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const user = request.user as { userId: string };

      const session = await queryOne<{ id: string; user_id: string }>(`
        SELECT id, user_id FROM user_sessions WHERE id = $1
      `, [id]);

      if (!session) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Session not found', statusCode: 404 },
        });
      }

      await query(`DELETE FROM user_sessions WHERE id = $1`, [id]);

      await logSecurityEvent(
        'SESSION_TERMINATED',
        { sessionId: id, targetUserId: session.user_id, terminatedBy: user.userId },
        request.ip,
        user.userId
      );

      log.info({ sessionId: id, adminId: user.userId }, 'Session terminated by admin');

      return reply.send({ success: true });
    }
  );

  /**
   * GET /admin/security/blocklist
   * Get the IP blocklist
   */
  app.get(
    '/admin/security/blocklist',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = paginationSchema.parse(request.query);

      let sql = `
        SELECT
          b.ip, b.reason, b.blocked_at, b.blocked_by,
          u.username as blocked_by_username
        FROM ip_blocklist b
        LEFT JOIN users u ON b.blocked_by = u.id
        WHERE 1=1
      `;
      const queryParams: unknown[] = [];
      let paramIndex = 1;

      if (params.cursor) {
        const [cursorDate, cursorIp] = params.cursor.split('|');
        sql += ` AND (b.blocked_at < $${paramIndex++} OR (b.blocked_at = $${paramIndex - 1} AND b.ip < $${paramIndex++}))`;
        queryParams.push(cursorDate, cursorIp);
      }

      sql += ` ORDER BY b.blocked_at DESC, b.ip DESC LIMIT $${paramIndex}`;
      queryParams.push(params.limit + 1);

      const rows = await queryAll<BlocklistRow>(sql, queryParams);
      const hasMore = rows.length > params.limit;
      const items = hasMore ? rows.slice(0, -1) : rows;

      const nextCursor = hasMore && items.length > 0
        ? `${items[items.length - 1].blocked_at.toISOString()}|${items[items.length - 1].ip}`
        : null;

      return reply.send({
        items: items.map((row) => ({
          ip: row.ip,
          reason: row.reason,
          blockedAt: row.blocked_at,
          blockedBy: row.blocked_by,
          blockedByUsername: row.blocked_by_username,
        })),
        nextCursor,
        hasMore,
      });
    }
  );

  /**
   * POST /admin/security/blocklist
   * Add an IP to the blocklist
   */
  app.post(
    '/admin/security/blocklist',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = ipBlocklistSchema.parse(request.body);
      const user = request.user as { userId: string };

      // Check if IP already blocked
      const existing = await queryOne<{ ip: string }>(`
        SELECT ip FROM ip_blocklist WHERE ip = $1
      `, [body.ip]);

      if (existing) {
        return reply.status(409).send({
          error: { code: 'CONFLICT', message: 'IP is already blocked', statusCode: 409 },
        });
      }

      await query(`
        INSERT INTO ip_blocklist (ip, reason, blocked_by)
        VALUES ($1, $2, $3)
      `, [body.ip, body.reason, user.userId]);

      await logSecurityEvent(
        'IP_BLOCKED',
        { ip: body.ip, reason: body.reason },
        request.ip,
        user.userId
      );

      log.info({ blockedIp: body.ip, adminId: user.userId }, 'IP added to blocklist');

      return reply.status(201).send({ success: true, ip: body.ip });
    }
  );

  /**
   * DELETE /admin/security/blocklist/:ip
   * Remove an IP from the blocklist
   */
  app.delete(
    '/admin/security/blocklist/:ip',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest<{ Params: { ip: string } }>, reply: FastifyReply) => {
      const { ip } = request.params;
      const user = request.user as { userId: string };

      const existing = await queryOne<{ ip: string }>(`
        SELECT ip FROM ip_blocklist WHERE ip = $1
      `, [ip]);

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'IP not found in blocklist', statusCode: 404 },
        });
      }

      await query(`DELETE FROM ip_blocklist WHERE ip = $1`, [ip]);

      await logSecurityEvent(
        'IP_UNBLOCKED',
        { ip },
        request.ip,
        user.userId
      );

      log.info({ unblockedIp: ip, adminId: user.userId }, 'IP removed from blocklist');

      return reply.send({ success: true });
    }
  );

  /**
   * GET /admin/security/rate-limits
   * Get current rate limit configuration
   */
  app.get(
    '/admin/security/rate-limits',
    { preHandler: [authenticate, requireAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const rows = await queryAll<RateLimitRow>(`
        SELECT id, endpoint, requests_per_minute, requests_per_hour, burst_limit, updated_at, updated_by
        FROM rate_limit_config
        ORDER BY endpoint ASC
      `);

      return reply.send({
        items: rows.map((row) => ({
          id: row.id,
          endpoint: row.endpoint,
          requestsPerMinute: row.requests_per_minute,
          requestsPerHour: row.requests_per_hour,
          burstLimit: row.burst_limit,
          updatedAt: row.updated_at,
          updatedBy: row.updated_by,
        })),
      });
    }
  );

  /**
   * PUT /admin/security/rate-limits
   * Update rate limit configuration
   */
  app.put(
    '/admin/security/rate-limits',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = rateLimitUpdateSchema.parse(request.body);
      const user = request.user as { userId: string };

      // Upsert rate limit config
      await query(`
        INSERT INTO rate_limit_config (endpoint, requests_per_minute, requests_per_hour, burst_limit, updated_by)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (endpoint) DO UPDATE SET
          requests_per_minute = EXCLUDED.requests_per_minute,
          requests_per_hour = EXCLUDED.requests_per_hour,
          burst_limit = EXCLUDED.burst_limit,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
      `, [body.endpoint, body.requests_per_minute, body.requests_per_hour || null, body.burst_limit || null, user.userId]);

      await logSecurityEvent(
        'RATE_LIMIT_UPDATED',
        { endpoint: body.endpoint, config: body },
        request.ip,
        user.userId
      );

      log.info({ endpoint: body.endpoint, adminId: user.userId }, 'Rate limit config updated');

      return reply.send({ success: true });
    }
  );

  /**
   * GET /admin/security/audit-log
   * Get security audit log with filters
   */
  app.get(
    '/admin/security/audit-log',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const filters = auditLogFilterSchema.parse(request.query);

      let sql = `
        SELECT
          l.id, l.event_type, l.details, l.ip, l.user_id, l.created_at,
          u.username
        FROM security_audit_log l
        LEFT JOIN users u ON l.user_id = u.id
        WHERE 1=1
      `;
      const queryParams: unknown[] = [];
      let paramIndex = 1;

      if (filters.event_type) {
        sql += ` AND l.event_type = $${paramIndex++}`;
        queryParams.push(filters.event_type);
      }

      if (filters.user_id) {
        sql += ` AND l.user_id = $${paramIndex++}`;
        queryParams.push(filters.user_id);
      }

      if (filters.ip) {
        sql += ` AND l.ip = $${paramIndex++}`;
        queryParams.push(filters.ip);
      }

      if (filters.start_date) {
        sql += ` AND l.created_at >= $${paramIndex++}`;
        queryParams.push(filters.start_date);
      }

      if (filters.end_date) {
        sql += ` AND l.created_at <= $${paramIndex++}`;
        queryParams.push(filters.end_date);
      }

      if (filters.cursor) {
        const [cursorDate, cursorId] = filters.cursor.split('|');
        sql += ` AND (l.created_at < $${paramIndex++} OR (l.created_at = $${paramIndex - 1} AND l.id < $${paramIndex++}))`;
        queryParams.push(cursorDate, cursorId);
      }

      sql += ` ORDER BY l.created_at DESC, l.id DESC LIMIT $${paramIndex}`;
      queryParams.push(filters.limit + 1);

      const rows = await queryAll<AuditLogRow>(sql, queryParams);
      const hasMore = rows.length > filters.limit;
      const items = hasMore ? rows.slice(0, -1) : rows;

      const nextCursor = hasMore && items.length > 0
        ? `${items[items.length - 1].created_at.toISOString()}|${items[items.length - 1].id}`
        : null;

      // Get distinct event types for filtering UI
      const eventTypes = await queryAll<{ event_type: string }>(`
        SELECT DISTINCT event_type FROM security_audit_log ORDER BY event_type
      `);

      return reply.send({
        items: items.map((row) => ({
          id: row.id,
          eventType: row.event_type,
          details: row.details,
          ip: row.ip,
          userId: row.user_id,
          username: row.username,
          createdAt: row.created_at,
        })),
        nextCursor,
        hasMore,
        eventTypes: eventTypes.map((e) => e.event_type),
      });
    }
  );

  /**
   * GET /admin/security/scan
   * Run a security scan to check for common issues
   */
  app.get(
    '/admin/security/scan',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as { userId: string };
      const results: SecurityScanResult[] = [];

      // Check 1: Users with weak roles configuration
      const usersWithoutRoles = await queryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM users WHERE roles IS NULL OR roles = '{}'
      `);
      if (parseInt(usersWithoutRoles?.count || '0') > 0) {
        results.push({
          category: 'user_roles',
          severity: 'medium',
          message: `${usersWithoutRoles?.count} users have no roles assigned`,
        });
      }

      // Check 2: Failed login attempts spike
      const recentFailedLogins = await queryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM failed_login_attempts
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `);
      const failedCount = parseInt(recentFailedLogins?.count || '0');
      if (failedCount > 50) {
        results.push({
          category: 'brute_force',
          severity: failedCount > 200 ? 'critical' : 'high',
          message: `${failedCount} failed login attempts in the last hour`,
          details: { count: failedCount, threshold: 50 },
        });
      }

      // Check 3: IP addresses with multiple failed attempts
      const suspiciousIps = await queryAll<{ ip_address: string; count: string }>(`
        SELECT ip_address, COUNT(*) as count
        FROM failed_login_attempts
        WHERE created_at > NOW() - INTERVAL '1 hour'
        GROUP BY ip_address
        HAVING COUNT(*) > 10
        ORDER BY count DESC
        LIMIT 10
      `);
      if (suspiciousIps.length > 0) {
        results.push({
          category: 'suspicious_ips',
          severity: 'high',
          message: `${suspiciousIps.length} IP addresses with >10 failed attempts`,
          details: { ips: suspiciousIps.map((i) => ({ ip: i.ip_address, attempts: parseInt(i.count) })) },
        });
      }

      // Check 4: Sessions from blocked IPs
      const blockedIpSessions = await queryOne<{ count: string }>(`
        SELECT COUNT(*) as count
        FROM user_sessions s
        JOIN ip_blocklist b ON s.ip_address = b.ip
        WHERE s.expires_at > NOW()
      `);
      if (parseInt(blockedIpSessions?.count || '0') > 0) {
        results.push({
          category: 'blocked_ip_sessions',
          severity: 'critical',
          message: `${blockedIpSessions?.count} active sessions from blocked IPs`,
        });
      }

      // Check 5: Expired sessions not cleaned up
      const expiredSessions = await queryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM user_sessions WHERE expires_at < NOW()
      `);
      if (parseInt(expiredSessions?.count || '0') > 100) {
        results.push({
          category: 'cleanup',
          severity: 'low',
          message: `${expiredSessions?.count} expired sessions need cleanup`,
        });
      }

      // Check 6: Admin users count
      const adminCount = await queryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM users WHERE 'admin' = ANY(roles)
      `);
      if (parseInt(adminCount?.count || '0') > 10) {
        results.push({
          category: 'admin_proliferation',
          severity: 'medium',
          message: `${adminCount?.count} users have admin privileges - review if all are necessary`,
        });
      }

      // Check 7: Users with unverified emails (if email verification exists)
      const unverifiedEmails = await queryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM users WHERE email_verified_at IS NULL
      `).catch(() => null); // Ignore if column doesn't exist
      if (unverifiedEmails && parseInt(unverifiedEmails?.count || '0') > 100) {
        results.push({
          category: 'unverified_emails',
          severity: 'low',
          message: `${unverifiedEmails?.count} users have unverified emails`,
        });
      }

      // Check 8: Database size and growth
      const dbSize = await queryOne<{ size: string }>(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      results.push({
        category: 'database_size',
        severity: 'info',
        message: `Database size: ${dbSize?.size || 'unknown'}`,
      });

      // Check 9: Old audit logs (if retention policy exists)
      const oldAuditLogs = await queryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM security_audit_log
        WHERE created_at < NOW() - INTERVAL '90 days'
      `);
      if (parseInt(oldAuditLogs?.count || '0') > 10000) {
        results.push({
          category: 'audit_log_retention',
          severity: 'low',
          message: `${oldAuditLogs?.count} audit log entries older than 90 days - consider archiving`,
        });
      }

      // Log the scan
      await logSecurityEvent(
        'SECURITY_SCAN',
        { resultsCount: results.length, criticalCount: results.filter((r) => r.severity === 'critical').length },
        request.ip,
        user.userId
      );

      // Calculate summary
      const summary = {
        critical: results.filter((r) => r.severity === 'critical').length,
        high: results.filter((r) => r.severity === 'high').length,
        medium: results.filter((r) => r.severity === 'medium').length,
        low: results.filter((r) => r.severity === 'low').length,
        info: results.filter((r) => r.severity === 'info').length,
      };

      return reply.send({
        scannedAt: new Date().toISOString(),
        summary,
        results: results.sort((a, b) => {
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        }),
      });
    }
  );
}
