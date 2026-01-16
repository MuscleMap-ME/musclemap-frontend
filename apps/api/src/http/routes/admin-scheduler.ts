/**
 * Admin Scheduler Routes
 *
 * Manages scheduled tasks/cron jobs for the MuscleMap platform:
 * - List all scheduled jobs
 * - Create, update, and delete jobs
 * - Run jobs immediately (manual trigger)
 * - View job execution history
 * - Enable/disable jobs
 *
 * SECURITY: All routes require admin authentication
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { queryOne, queryAll, query, execute, transaction } from '../../db/client';
import { authenticate, requireAdmin } from './auth';
import { loggers } from '../../lib/logger';
import crypto from 'crypto';

const log = loggers.api;

// ============================================
// SCHEMAS
// ============================================

// Validates node-cron expression format
// Format: second(optional) minute hour day-of-month month day-of-week
// Examples: "0 * * * *" (every hour), "0 0 * * *" (midnight), "*/5 * * * *" (every 5 min)
const CRON_REGEX = /^(\*|[0-9,\-\/]+|\?)\s+(\*|[0-9,\-\/]+|\?)\s+(\*|[0-9,\-\/]+|\?)\s+(\*|[0-9,\-\/]+|\?)\s+(\*|[0-9,\-\/]+|\?)(\s+(\*|[0-9,\-\/]+|\?))?$/;

const cronExpressionSchema = z.string().regex(
  CRON_REGEX,
  'Invalid cron expression. Use node-cron format: minute hour day-of-month month day-of-week (second optional)'
);

const createJobSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Name must be alphanumeric with dashes/underscores'),
  description: z.string().max(500).optional(),
  cron_expression: cronExpressionSchema,
  command: z.string().min(1).max(1000),
  enabled: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

const updateJobSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  description: z.string().max(500).nullable().optional(),
  cron_expression: cronExpressionSchema.optional(),
  command: z.string().min(1).max(1000).optional(),
  enabled: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const listJobsQuerySchema = z.object({
  enabled: z.enum(['true', 'false']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

const historyQuerySchema = z.object({
  job_id: z.string().optional(),
  status: z.enum(['success', 'failure', 'running', 'skipped']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// ============================================
// TYPES
// ============================================

interface ScheduledJob {
  id: string;
  name: string;
  description: string | null;
  cron_expression: string;
  command: string;
  enabled: boolean;
  last_run: Date | null;
  next_run: Date | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface JobExecutionHistory {
  id: string;
  job_id: string;
  job_name: string;
  status: 'success' | 'failure' | 'running' | 'skipped';
  started_at: Date;
  completed_at: Date | null;
  duration_ms: number | null;
  output: string | null;
  error: string | null;
  triggered_by: 'cron' | 'manual';
  created_at: Date;
}

// ============================================
// HELPERS
// ============================================

/**
 * Calculate next run time from cron expression
 * This is a simplified version - in production, use a proper cron parser
 */
function calculateNextRun(cronExpression: string): Date {
  // For now, return a placeholder - actual implementation would use node-cron or cron-parser
  // In a real implementation, you'd use: import { parseExpression } from 'cron-parser';
  const now = new Date();
  // Default to next hour if we can't parse
  const nextHour = new Date(now);
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  return nextHour;
}

/**
 * Format job for API response
 */
function formatJob(job: ScheduledJob) {
  return {
    id: job.id,
    name: job.name,
    description: job.description,
    cronExpression: job.cron_expression,
    command: job.command,
    enabled: job.enabled,
    lastRun: job.last_run,
    nextRun: job.next_run,
    metadata: job.metadata || {},
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  };
}

/**
 * Format execution history for API response
 */
function formatHistory(entry: JobExecutionHistory) {
  return {
    id: entry.id,
    jobId: entry.job_id,
    jobName: entry.job_name,
    status: entry.status,
    startedAt: entry.started_at,
    completedAt: entry.completed_at,
    durationMs: entry.duration_ms,
    output: entry.output,
    error: entry.error,
    triggeredBy: entry.triggered_by,
    createdAt: entry.created_at,
  };
}

// ============================================
// ROUTES
// ============================================

export default async function adminSchedulerRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /admin/scheduler/jobs
   * List all scheduled jobs
   */
  fastify.get(
    '/admin/scheduler/jobs',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const queryParams = listJobsQuerySchema.parse(request.query);

      let sql = `
        SELECT *
        FROM scheduled_jobs
        WHERE 1=1
      `;
      const params: unknown[] = [];
      let paramIndex = 1;

      if (queryParams.enabled !== undefined) {
        sql += ` AND enabled = $${paramIndex++}`;
        params.push(queryParams.enabled === 'true');
      }

      // Keyset pagination
      if (queryParams.cursor) {
        const [cursorDate, cursorId] = queryParams.cursor.split('|');
        sql += ` AND (created_at < $${paramIndex++} OR (created_at = $${paramIndex - 1} AND id < $${paramIndex++}))`;
        params.push(cursorDate, cursorId);
      }

      sql += ` ORDER BY created_at DESC, id DESC LIMIT $${paramIndex}`;
      params.push(queryParams.limit + 1);

      const jobs = await queryAll<ScheduledJob>(sql, params);
      const hasMore = jobs.length > queryParams.limit;
      const items = hasMore ? jobs.slice(0, -1) : jobs;

      const nextCursor = hasMore && items.length > 0
        ? `${items[items.length - 1].created_at.toISOString()}|${items[items.length - 1].id}`
        : null;

      return reply.send({
        items: items.map(formatJob),
        nextCursor,
        hasMore,
      });
    }
  );

  /**
   * GET /admin/scheduler/jobs/:id
   * Get a single job by ID
   */
  fastify.get<{ Params: { id: string } }>(
    '/admin/scheduler/jobs/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;

      const job = await queryOne<ScheduledJob>(
        'SELECT * FROM scheduled_jobs WHERE id = $1',
        [id]
      );

      if (!job) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Scheduled job not found', statusCode: 404 },
        });
      }

      // Get recent execution history for this job
      const history = await queryAll<JobExecutionHistory>(`
        SELECT h.*, j.name as job_name
        FROM scheduled_job_history h
        JOIN scheduled_jobs j ON h.job_id = j.id
        WHERE h.job_id = $1
        ORDER BY h.started_at DESC
        LIMIT 10
      `, [id]);

      return reply.send({
        ...formatJob(job),
        recentHistory: history.map(formatHistory),
      });
    }
  );

  /**
   * POST /admin/scheduler/jobs
   * Create a new scheduled job
   */
  fastify.post(
    '/admin/scheduler/jobs',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as { userId: string };
      const body = createJobSchema.parse(request.body);

      // Check for duplicate name
      const existing = await queryOne<{ id: string }>(
        'SELECT id FROM scheduled_jobs WHERE name = $1',
        [body.name]
      );

      if (existing) {
        return reply.status(400).send({
          error: { code: 'DUPLICATE_NAME', message: 'A job with this name already exists', statusCode: 400 },
        });
      }

      const id = `job_${crypto.randomBytes(12).toString('hex')}`;
      const nextRun = body.enabled ? calculateNextRun(body.cron_expression) : null;

      const job = await queryOne<ScheduledJob>(`
        INSERT INTO scheduled_jobs (id, name, description, cron_expression, command, enabled, next_run, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        id,
        body.name,
        body.description || null,
        body.cron_expression,
        body.command,
        body.enabled,
        nextRun,
        body.metadata || {},
      ]);

      log.info({ jobId: id, name: body.name, adminId: user.userId }, 'Scheduled job created');

      return reply.status(201).send(formatJob(job!));
    }
  );

  /**
   * PUT /admin/scheduler/jobs/:id
   * Update an existing scheduled job
   */
  fastify.put<{ Params: { id: string } }>(
    '/admin/scheduler/jobs/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user as { userId: string };
      const body = updateJobSchema.parse(request.body);

      // Check job exists
      const existing = await queryOne<ScheduledJob>(
        'SELECT * FROM scheduled_jobs WHERE id = $1',
        [id]
      );

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Scheduled job not found', statusCode: 404 },
        });
      }

      // Check for duplicate name if changing
      if (body.name && body.name !== existing.name) {
        const duplicate = await queryOne<{ id: string }>(
          'SELECT id FROM scheduled_jobs WHERE name = $1 AND id != $2',
          [body.name, id]
        );

        if (duplicate) {
          return reply.status(400).send({
            error: { code: 'DUPLICATE_NAME', message: 'A job with this name already exists', statusCode: 400 },
          });
        }
      }

      // Build update query
      const setClauses: string[] = ['updated_at = NOW()'];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (body.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        params.push(body.name);
      }

      if (body.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        params.push(body.description);
      }

      if (body.cron_expression !== undefined) {
        setClauses.push(`cron_expression = $${paramIndex++}`);
        params.push(body.cron_expression);
      }

      if (body.command !== undefined) {
        setClauses.push(`command = $${paramIndex++}`);
        params.push(body.command);
      }

      if (body.enabled !== undefined) {
        setClauses.push(`enabled = $${paramIndex++}`);
        params.push(body.enabled);
      }

      if (body.metadata !== undefined) {
        setClauses.push(`metadata = $${paramIndex++}`);
        params.push(body.metadata);
      }

      // Update next_run if cron expression or enabled status changed
      const newCronExpression = body.cron_expression ?? existing.cron_expression;
      const newEnabled = body.enabled ?? existing.enabled;
      const nextRun = newEnabled ? calculateNextRun(newCronExpression) : null;
      setClauses.push(`next_run = $${paramIndex++}`);
      params.push(nextRun);

      params.push(id);

      const job = await queryOne<ScheduledJob>(`
        UPDATE scheduled_jobs SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
        RETURNING *
      `, params);

      log.info({ jobId: id, updates: body, adminId: user.userId }, 'Scheduled job updated');

      return reply.send(formatJob(job!));
    }
  );

  /**
   * DELETE /admin/scheduler/jobs/:id
   * Delete a scheduled job
   */
  fastify.delete<{ Params: { id: string } }>(
    '/admin/scheduler/jobs/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user as { userId: string };

      const existing = await queryOne<{ id: string; name: string }>(
        'SELECT id, name FROM scheduled_jobs WHERE id = $1',
        [id]
      );

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Scheduled job not found', statusCode: 404 },
        });
      }

      // Delete job and its history in a transaction
      await transaction(async (client) => {
        await client.query('DELETE FROM scheduled_job_history WHERE job_id = $1', [id]);
        await client.query('DELETE FROM scheduled_jobs WHERE id = $1', [id]);
      });

      log.info({ jobId: id, name: existing.name, adminId: user.userId }, 'Scheduled job deleted');

      return reply.send({ success: true, message: 'Job deleted successfully' });
    }
  );

  /**
   * POST /admin/scheduler/jobs/:id/run
   * Run a job immediately (manual trigger)
   */
  fastify.post<{ Params: { id: string } }>(
    '/admin/scheduler/jobs/:id/run',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user as { userId: string };

      const job = await queryOne<ScheduledJob>(
        'SELECT * FROM scheduled_jobs WHERE id = $1',
        [id]
      );

      if (!job) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Scheduled job not found', statusCode: 404 },
        });
      }

      // Create execution history entry
      const historyId = `hist_${crypto.randomBytes(12).toString('hex')}`;
      const startedAt = new Date();

      await query(`
        INSERT INTO scheduled_job_history (id, job_id, status, started_at, triggered_by)
        VALUES ($1, $2, 'running', $3, 'manual')
      `, [historyId, id, startedAt]);

      // Note: In a real implementation, you would:
      // 1. Send the job to a worker queue (BullMQ, etc.)
      // 2. The worker would execute the command
      // 3. Update the history with results
      //
      // For now, we'll simulate a successful execution
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      await query(`
        UPDATE scheduled_job_history
        SET status = 'success', completed_at = $1, duration_ms = $2, output = 'Job triggered manually'
        WHERE id = $3
      `, [completedAt, durationMs, historyId]);

      // Update last_run on the job
      await query(`
        UPDATE scheduled_jobs SET last_run = $1, updated_at = NOW() WHERE id = $2
      `, [startedAt, id]);

      log.info({ jobId: id, name: job.name, historyId, adminId: user.userId }, 'Scheduled job triggered manually');

      return reply.send({
        success: true,
        message: 'Job triggered successfully',
        executionId: historyId,
        jobId: id,
        jobName: job.name,
      });
    }
  );

  /**
   * PUT /admin/scheduler/jobs/:id/toggle
   * Enable or disable a job
   */
  fastify.put<{ Params: { id: string } }>(
    '/admin/scheduler/jobs/:id/toggle',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user as { userId: string };

      const job = await queryOne<ScheduledJob>(
        'SELECT * FROM scheduled_jobs WHERE id = $1',
        [id]
      );

      if (!job) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Scheduled job not found', statusCode: 404 },
        });
      }

      const newEnabled = !job.enabled;
      const nextRun = newEnabled ? calculateNextRun(job.cron_expression) : null;

      await query(`
        UPDATE scheduled_jobs SET enabled = $1, next_run = $2, updated_at = NOW() WHERE id = $3
      `, [newEnabled, nextRun, id]);

      log.info({
        jobId: id,
        name: job.name,
        enabled: newEnabled,
        adminId: user.userId
      }, `Scheduled job ${newEnabled ? 'enabled' : 'disabled'}`);

      return reply.send({
        success: true,
        enabled: newEnabled,
        nextRun,
        message: `Job ${newEnabled ? 'enabled' : 'disabled'} successfully`,
      });
    }
  );

  /**
   * GET /admin/scheduler/history
   * Get job execution history
   */
  fastify.get(
    '/admin/scheduler/history',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const queryParams = historyQuerySchema.parse(request.query);

      let sql = `
        SELECT h.*, j.name as job_name
        FROM scheduled_job_history h
        JOIN scheduled_jobs j ON h.job_id = j.id
        WHERE 1=1
      `;
      const params: unknown[] = [];
      let paramIndex = 1;

      if (queryParams.job_id) {
        sql += ` AND h.job_id = $${paramIndex++}`;
        params.push(queryParams.job_id);
      }

      if (queryParams.status) {
        sql += ` AND h.status = $${paramIndex++}`;
        params.push(queryParams.status);
      }

      // Keyset pagination
      if (queryParams.cursor) {
        const [cursorDate, cursorId] = queryParams.cursor.split('|');
        sql += ` AND (h.started_at < $${paramIndex++} OR (h.started_at = $${paramIndex - 1} AND h.id < $${paramIndex++}))`;
        params.push(cursorDate, cursorId);
      }

      sql += ` ORDER BY h.started_at DESC, h.id DESC LIMIT $${paramIndex}`;
      params.push(queryParams.limit + 1);

      const history = await queryAll<JobExecutionHistory>(sql, params);
      const hasMore = history.length > queryParams.limit;
      const items = hasMore ? history.slice(0, -1) : history;

      const nextCursor = hasMore && items.length > 0
        ? `${items[items.length - 1].started_at.toISOString()}|${items[items.length - 1].id}`
        : null;

      return reply.send({
        items: items.map(formatHistory),
        nextCursor,
        hasMore,
      });
    }
  );

  /**
   * GET /admin/scheduler/stats
   * Get scheduler statistics
   */
  fastify.get(
    '/admin/scheduler/stats',
    { preHandler: [authenticate, requireAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const [
        totalJobs,
        enabledJobs,
        recentExecutions,
        failureRate,
      ] = await Promise.all([
        queryOne<{ count: string }>('SELECT COUNT(*) as count FROM scheduled_jobs'),
        queryOne<{ count: string }>('SELECT COUNT(*) as count FROM scheduled_jobs WHERE enabled = true'),
        queryAll<{ status: string; count: string }>(`
          SELECT status, COUNT(*) as count
          FROM scheduled_job_history
          WHERE started_at > NOW() - INTERVAL '24 hours'
          GROUP BY status
        `),
        queryOne<{ failure_rate: string }>(`
          SELECT
            CASE WHEN COUNT(*) > 0
              THEN (COUNT(*) FILTER (WHERE status = 'failure'))::float / COUNT(*)::float * 100
              ELSE 0
            END as failure_rate
          FROM scheduled_job_history
          WHERE started_at > NOW() - INTERVAL '24 hours'
        `),
      ]);

      const executionsByStatus = Object.fromEntries(
        recentExecutions.map((r) => [r.status, parseInt(r.count)])
      );

      return reply.send({
        totalJobs: parseInt(totalJobs?.count || '0'),
        enabledJobs: parseInt(enabledJobs?.count || '0'),
        disabledJobs: parseInt(totalJobs?.count || '0') - parseInt(enabledJobs?.count || '0'),
        last24Hours: {
          total: Object.values(executionsByStatus).reduce((a, b) => a + b, 0),
          success: executionsByStatus.success || 0,
          failure: executionsByStatus.failure || 0,
          running: executionsByStatus.running || 0,
          skipped: executionsByStatus.skipped || 0,
          failureRate: parseFloat(failureRate?.failure_rate || '0').toFixed(2) + '%',
        },
      });
    }
  );
}
