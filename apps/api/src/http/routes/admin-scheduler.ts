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
import { queryOne, queryAll, query, transaction } from '../../db/client';
import { authenticate, requireAdmin } from './auth';
import { loggers } from '../../lib/logger';
import crypto from 'crypto';
import CronExpressionParser, { type CronExpression } from 'cron-parser';
import { withLock } from '../../lib/distributed-lock';

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
// SCHEDULER ENGINE (In-Memory Job Runner)
// ============================================

interface ActiveJob {
  jobId: string;
  cronExpression: CronExpression;
  timeout: NodeJS.Timeout | null;
  command: string;
  name: string;
}

// In-memory store of active jobs
const activeJobs = new Map<string, ActiveJob>();

// Track if scheduler is running
let schedulerRunning = false;

/**
 * Parse and validate a cron expression
 * Returns the parsed expression or throws if invalid
 */
function parseCronExpression(expression: string, timezone = 'UTC'): CronExpression {
  try {
    return CronExpressionParser.parse(expression, {
      tz: timezone,
      currentDate: new Date(),
    });
  } catch (err) {
    throw new Error(`Invalid cron expression: ${(err as Error).message}`);
  }
}

/**
 * Validate a cron expression without returning the parsed result
 */
function validateCronExpression(expression: string): { valid: boolean; error?: string; nextRun?: Date } {
  try {
    const parsed = parseCronExpression(expression);
    const nextRun = parsed.next().toDate();
    return { valid: true, nextRun };
  } catch (err) {
    return { valid: false, error: (err as Error).message };
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Calculate next run time from cron expression using cron-parser
 * Supports standard cron expressions (5 fields) and extended (6 fields with seconds)
 */
function calculateNextRun(cronExpression: string, timezone = 'UTC'): Date {
  try {
    const parsed = parseCronExpression(cronExpression, timezone);
    return parsed.next().toDate();
  } catch (err) {
    log.warn({ cronExpression, error: (err as Error).message }, 'Failed to parse cron expression, using fallback');
    // Fallback: return next hour if parsing fails
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    return nextHour;
  }
}

/**
 * Calculate previous run time from cron expression
 */
function calculatePreviousRun(cronExpression: string, timezone = 'UTC'): Date | null {
  try {
    const parsed = parseCronExpression(cronExpression, timezone);
    return parsed.prev().toDate();
  } catch {
    return null;
  }
}

/**
 * Get multiple upcoming run times for a cron expression
 */
function getUpcomingRuns(cronExpression: string, count = 5, timezone = 'UTC'): Date[] {
  try {
    const parsed = parseCronExpression(cronExpression, timezone);
    const runs: Date[] = [];
    for (let i = 0; i < count; i++) {
      runs.push(parsed.next().toDate());
    }
    return runs;
  } catch {
    return [];
  }
}

// ============================================
// JOB EXECUTION ENGINE
// ============================================

/**
 * Available job commands (whitelist for security)
 * Maps command names to their execution functions
 */
const JOB_COMMANDS: Record<string, () => Promise<{ success: boolean; output: string }>> = {
  // Database maintenance
  'refresh-matviews': async () => {
    try {
      await query('SELECT refresh_xp_rankings_v2_with_log()');
      return { success: true, output: 'Materialized views refreshed successfully' };
    } catch (_err) {
      try {
        await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_xp_rankings');
        return { success: true, output: 'Materialized views refreshed (direct)' };
      } catch (innerErr) {
        return { success: false, output: `Failed to refresh matviews: ${(innerErr as Error).message}` };
      }
    }
  },

  'run-retention-policies': async () => {
    try {
      const result = await queryAll<{ policy_name: string; deleted_count: number }>(
        'SELECT * FROM run_all_retention_policies()'
      );
      const totalDeleted = result.reduce((sum, r) => sum + r.deleted_count, 0);
      return { success: true, output: `Retention policies executed. Total deleted: ${totalDeleted}` };
    } catch (err) {
      return { success: false, output: `Failed to run retention policies: ${(err as Error).message}` };
    }
  },

  'archive-credits': async () => {
    try {
      const result = await queryOne<{ archived_count: number }>(
        'SELECT * FROM archive_old_credit_transactions(6, 10000)'
      );
      return { success: true, output: `Archived ${result?.archived_count || 0} credit transactions` };
    } catch (err) {
      return { success: false, output: `Failed to archive credits: ${(err as Error).message}` };
    }
  },

  'cleanup-expired-mutes': async () => {
    try {
      const result = await query(
        'DELETE FROM user_mutes WHERE mute_until IS NOT NULL AND mute_until < NOW()'
      );
      const rowCount = (result as { rowCount?: number })?.rowCount || 0;
      return { success: true, output: `Cleaned up ${rowCount} expired mutes` };
    } catch (err) {
      return { success: false, output: `Failed to cleanup mutes: ${(err as Error).message}` };
    }
  },

  'cleanup-fraud-flags': async () => {
    try {
      const result = await query(
        `DELETE FROM economy_fraud_flags
         WHERE status IN ('resolved_valid', 'resolved_invalid')
         AND resolved_at < NOW() - INTERVAL '90 days'`
      );
      const rowCount = (result as { rowCount?: number })?.rowCount || 0;
      return { success: true, output: `Cleaned up ${rowCount} old fraud flags` };
    } catch (err) {
      return { success: false, output: `Failed to cleanup fraud flags: ${(err as Error).message}` };
    }
  },

  'capture-performance-snapshot': async () => {
    try {
      await query('SELECT capture_performance_snapshot()');
      return { success: true, output: 'Performance snapshot captured' };
    } catch (err) {
      return { success: false, output: `Failed to capture snapshot: ${(err as Error).message}` };
    }
  },

  // Health check job
  'health-check': async () => {
    try {
      const dbCheck = await queryOne<{ result: number }>('SELECT 1 as result');
      if (dbCheck?.result === 1) {
        return { success: true, output: 'Health check passed: Database connection OK' };
      }
      return { success: false, output: 'Health check failed: Database query returned unexpected result' };
    } catch (err) {
      return { success: false, output: `Health check failed: ${(err as Error).message}` };
    }
  },

  // Notification job - example
  'send-daily-summary': async () => {
    // Placeholder for daily summary emails
    return { success: true, output: 'Daily summary job executed (placeholder)' };
  },

  // Beta tester snapshots
  'beta-tester-snapshots': async () => {
    try {
      const result = await queryAll<{ user_id: string; success: boolean }>(
        'SELECT * FROM run_daily_beta_snapshots()'
      );
      const successCount = result.filter(r => r.success).length;
      return { success: true, output: `Created ${successCount} beta tester snapshots` };
    } catch (err) {
      return { success: false, output: `Failed to create snapshots: ${(err as Error).message}` };
    }
  },

  // Custom SQL execution (admin only, validated)
  'custom-sql': async () => {
    // This is a placeholder - actual SQL is stored in job metadata
    // The executeJob function handles custom SQL separately
    return { success: false, output: 'Custom SQL must be executed with job context' };
  },
};

/**
 * Execute a job command
 */
async function executeJobCommand(
  command: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; output: string; error?: string }> {
  const startTime = Date.now();

  try {
    // Check if it's a built-in command
    if (JOB_COMMANDS[command]) {
      const result = await JOB_COMMANDS[command]();
      return result;
    }

    // Check for custom SQL in metadata
    if (command === 'custom-sql' && metadata?.sql && typeof metadata.sql === 'string') {
      // Security: Only allow SELECT statements for custom SQL
      const sql = metadata.sql.trim().toLowerCase();
      if (!sql.startsWith('select')) {
        return { success: false, output: 'Custom SQL only allows SELECT statements' };
      }

      const result = await queryAll<Record<string, unknown>>(metadata.sql as string);
      return {
        success: true,
        output: `Query executed successfully. Rows returned: ${result.length}`
      };
    }

    return {
      success: false,
      output: `Unknown command: ${command}. Available commands: ${Object.keys(JOB_COMMANDS).join(', ')}`
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    log.error({ command, duration, error: err }, 'Job command execution failed');
    return {
      success: false,
      output: `Command execution failed after ${duration}ms`,
      error: (err as Error).message
    };
  }
}

/**
 * Execute a scheduled job and record the result
 */
async function executeJob(
  job: ScheduledJob,
  triggeredBy: 'cron' | 'manual' = 'cron'
): Promise<{ success: boolean; historyId: string; output?: string; error?: string }> {
  const historyId = `hist_${crypto.randomBytes(12).toString('hex')}`;
  const startedAt = new Date();

  // Create execution history entry with 'running' status
  await query(`
    INSERT INTO scheduled_job_history (id, job_id, status, started_at, triggered_by)
    VALUES ($1, $2, 'running', $3, $4)
  `, [historyId, job.id, startedAt, triggeredBy]);

  try {
    // Use distributed lock to prevent duplicate executions
    const result = await withLock(`scheduler:job:${job.id}`, async () => {
      return await executeJobCommand(job.command, job.metadata);
    }, { ttl: 300000 }); // 5 minute max execution time

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    // Update history with result
    await query(`
      UPDATE scheduled_job_history
      SET status = $1, completed_at = $2, duration_ms = $3, output = $4, error = $5
      WHERE id = $6
    `, [
      result.success ? 'success' : 'failure',
      completedAt,
      durationMs,
      result.output,
      result.error || null,
      historyId,
    ]);

    // Update job's last_run and next_run
    const nextRun = job.enabled ? calculateNextRun(job.cron_expression) : null;
    await query(`
      UPDATE scheduled_jobs
      SET last_run = $1, next_run = $2, updated_at = NOW()
      WHERE id = $3
    `, [startedAt, nextRun, job.id]);

    log.info({
      jobId: job.id,
      jobName: job.name,
      historyId,
      success: result.success,
      durationMs,
      triggeredBy,
    }, 'Job execution completed');

    return { success: result.success, historyId, output: result.output, error: result.error };
  } catch (err) {
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();
    const errorMessage = (err as Error).message;

    // Check if it's a lock acquisition failure
    const status = errorMessage.includes('Failed to acquire lock') ? 'skipped' : 'failure';

    // Update history with failure
    await query(`
      UPDATE scheduled_job_history
      SET status = $1, completed_at = $2, duration_ms = $3, error = $4
      WHERE id = $5
    `, [status, completedAt, durationMs, errorMessage, historyId]);

    log.error({
      jobId: job.id,
      jobName: job.name,
      historyId,
      error: errorMessage,
      triggeredBy,
    }, 'Job execution failed');

    return { success: false, historyId, error: errorMessage };
  }
}

/**
 * Schedule a job's next execution
 */
function scheduleNextExecution(job: ScheduledJob): void {
  // Clear any existing timeout for this job
  const existingJob = activeJobs.get(job.id);
  if (existingJob?.timeout) {
    clearTimeout(existingJob.timeout);
  }

  if (!job.enabled) {
    activeJobs.delete(job.id);
    return;
  }

  try {
    const cronExpr = parseCronExpression(job.cron_expression);
    const nextRun = cronExpr.next().toDate();
    const msUntilNextRun = nextRun.getTime() - Date.now();

    // Don't schedule if the next run is too far in the future (> 24 hours)
    // Instead, we'll reschedule when the scheduler ticks
    const maxDelayMs = 24 * 60 * 60 * 1000;
    const delayMs = Math.min(msUntilNextRun, maxDelayMs);

    const timeout = setTimeout(async () => {
      // Re-fetch the job to ensure it's still enabled and hasn't changed
      const currentJob = await queryOne<ScheduledJob>(
        'SELECT * FROM scheduled_jobs WHERE id = $1',
        [job.id]
      );

      if (currentJob && currentJob.enabled) {
        await executeJob(currentJob, 'cron');
        // Schedule the next execution
        scheduleNextExecution(currentJob);
      } else {
        activeJobs.delete(job.id);
      }
    }, delayMs);

    activeJobs.set(job.id, {
      jobId: job.id,
      cronExpression: cronExpr,
      timeout,
      command: job.command,
      name: job.name,
    });

    log.debug({
      jobId: job.id,
      jobName: job.name,
      nextRun,
      delayMs,
    }, 'Job scheduled');
  } catch (err) {
    log.error({
      jobId: job.id,
      jobName: job.name,
      error: (err as Error).message,
    }, 'Failed to schedule job');
  }
}

/**
 * Load and schedule all enabled jobs from the database
 */
async function loadAndScheduleAllJobs(): Promise<void> {
  log.info('Loading and scheduling all enabled jobs...');

  const jobs = await queryAll<ScheduledJob>(
    'SELECT * FROM scheduled_jobs WHERE enabled = true'
  );

  for (const job of jobs) {
    scheduleNextExecution(job);
  }

  log.info({ jobCount: jobs.length }, 'All enabled jobs scheduled');
}

/**
 * Start the job scheduler
 */
export async function startJobScheduler(): Promise<void> {
  if (schedulerRunning) {
    log.warn('Job scheduler is already running');
    return;
  }

  schedulerRunning = true;
  await loadAndScheduleAllJobs();

  // Periodically reload jobs to catch any changes (every 5 minutes)
  setInterval(async () => {
    if (schedulerRunning) {
      await loadAndScheduleAllJobs();
    }
  }, 5 * 60 * 1000);

  log.info('Job scheduler started');
}

/**
 * Stop the job scheduler
 */
export function stopJobScheduler(): void {
  schedulerRunning = false;

  // Clear all active timeouts
  for (const [jobId, activeJob] of activeJobs) {
    if (activeJob.timeout) {
      clearTimeout(activeJob.timeout);
    }
    activeJobs.delete(jobId);
  }

  log.info('Job scheduler stopped');
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
  running: boolean;
  activeJobCount: number;
  activeJobs: Array<{ jobId: string; name: string; command: string }>;
} {
  return {
    running: schedulerRunning,
    activeJobCount: activeJobs.size,
    activeJobs: Array.from(activeJobs.values()).map(j => ({
      jobId: j.jobId,
      name: j.name,
      command: j.command,
    })),
  };
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

      // Schedule the job if it's enabled
      if (job && job.enabled) {
        scheduleNextExecution(job);
      }

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

      // Reschedule the job with new settings
      if (job) {
        scheduleNextExecution(job);
      }

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

      // Remove from in-memory scheduler first
      const activeJob = activeJobs.get(id);
      if (activeJob?.timeout) {
        clearTimeout(activeJob.timeout);
      }
      activeJobs.delete(id);

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

      log.info({ jobId: id, name: job.name, adminId: user.userId }, 'Manual job execution requested');

      // Execute the job using the real execution engine
      const result = await executeJob(job, 'manual');

      if (result.success) {
        return reply.send({
          success: true,
          message: 'Job executed successfully',
          executionId: result.historyId,
          jobId: id,
          jobName: job.name,
          output: result.output,
        });
      } else {
        return reply.status(500).send({
          success: false,
          message: 'Job execution failed',
          executionId: result.historyId,
          jobId: id,
          jobName: job.name,
          error: result.error,
        });
      }
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

      // Update the in-memory scheduler
      const updatedJob = { ...job, enabled: newEnabled, next_run: nextRun };
      scheduleNextExecution(updatedJob);

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

      // Get scheduler engine status
      const schedulerStatus = getSchedulerStatus();

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
        scheduler: schedulerStatus,
      });
    }
  );

  /**
   * GET /admin/scheduler/status
   * Get the scheduler engine status
   */
  fastify.get(
    '/admin/scheduler/status',
    { preHandler: [authenticate, requireAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const status = getSchedulerStatus();
      return reply.send(status);
    }
  );

  /**
   * POST /admin/scheduler/validate-cron
   * Validate a cron expression and get upcoming run times
   */
  fastify.post(
    '/admin/scheduler/validate-cron',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const schema = z.object({
        expression: z.string(),
        timezone: z.string().default('UTC'),
        count: z.number().min(1).max(20).default(5),
      });

      const { expression, timezone, count } = schema.parse(request.body);
      const validation = validateCronExpression(expression);

      if (!validation.valid) {
        return reply.status(400).send({
          valid: false,
          error: validation.error,
        });
      }

      const upcomingRuns = getUpcomingRuns(expression, count, timezone);
      const previousRun = calculatePreviousRun(expression, timezone);

      return reply.send({
        valid: true,
        expression,
        timezone,
        nextRun: validation.nextRun,
        previousRun,
        upcomingRuns,
        humanReadable: describeCronExpression(expression),
      });
    }
  );

  /**
   * GET /admin/scheduler/commands
   * List available job commands
   */
  fastify.get(
    '/admin/scheduler/commands',
    { preHandler: [authenticate, requireAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const commands = Object.keys(JOB_COMMANDS).map(name => ({
        name,
        description: getCommandDescription(name),
      }));

      return reply.send({
        commands,
        total: commands.length,
      });
    }
  );

  /**
   * GET /admin/scheduler/jobs/:id/upcoming
   * Get upcoming run times for a specific job
   */
  fastify.get<{ Params: { id: string } }>(
    '/admin/scheduler/jobs/:id/upcoming',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const queryParams = z.object({
        count: z.coerce.number().min(1).max(50).default(10),
        timezone: z.string().default('UTC'),
      }).parse(request.query);

      const job = await queryOne<ScheduledJob>(
        'SELECT * FROM scheduled_jobs WHERE id = $1',
        [id]
      );

      if (!job) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Scheduled job not found', statusCode: 404 },
        });
      }

      const upcomingRuns = getUpcomingRuns(
        job.cron_expression,
        queryParams.count,
        queryParams.timezone
      );

      return reply.send({
        jobId: job.id,
        jobName: job.name,
        cronExpression: job.cron_expression,
        enabled: job.enabled,
        timezone: queryParams.timezone,
        upcomingRuns,
      });
    }
  );

  /**
   * POST /admin/scheduler/start
   * Start the scheduler engine
   */
  fastify.post(
    '/admin/scheduler/start',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as { userId: string };

      await startJobScheduler();

      log.info({ adminId: user.userId }, 'Scheduler engine started by admin');

      return reply.send({
        success: true,
        message: 'Scheduler engine started',
        status: getSchedulerStatus(),
      });
    }
  );

  /**
   * POST /admin/scheduler/stop
   * Stop the scheduler engine
   */
  fastify.post(
    '/admin/scheduler/stop',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as { userId: string };

      stopJobScheduler();

      log.info({ adminId: user.userId }, 'Scheduler engine stopped by admin');

      return reply.send({
        success: true,
        message: 'Scheduler engine stopped',
        status: getSchedulerStatus(),
      });
    }
  );

  /**
   * POST /admin/scheduler/reload
   * Reload all jobs from database
   */
  fastify.post(
    '/admin/scheduler/reload',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as { userId: string };

      await loadAndScheduleAllJobs();

      log.info({ adminId: user.userId }, 'Scheduler jobs reloaded by admin');

      return reply.send({
        success: true,
        message: 'Scheduler jobs reloaded',
        status: getSchedulerStatus(),
      });
    }
  );
}

// ============================================
// HELPER: Human-readable cron descriptions
// ============================================

/**
 * Get a human-readable description of a cron expression
 */
function describeCronExpression(expression: string): string {
  const parts = expression.trim().split(/\s+/);

  // Handle 5-field (standard) and 6-field (with seconds) expressions
  const hasSeconds = parts.length === 6;
  const [second, minute, hour, dayOfMonth, month, dayOfWeek] = hasSeconds
    ? parts
    : ['0', ...parts];

  const descriptions: string[] = [];

  // Seconds
  if (hasSeconds && second !== '0') {
    if (second === '*') descriptions.push('every second');
    else if (second.startsWith('*/')) descriptions.push(`every ${second.slice(2)} seconds`);
    else descriptions.push(`at second ${second}`);
  }

  // Minutes
  if (minute === '*') descriptions.push('every minute');
  else if (minute.startsWith('*/')) descriptions.push(`every ${minute.slice(2)} minutes`);
  else descriptions.push(`at minute ${minute}`);

  // Hours
  if (hour === '*') {
    // Already covered by minute
  } else if (hour.startsWith('*/')) {
    descriptions.push(`every ${hour.slice(2)} hours`);
  } else {
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
    descriptions.push(`at ${hour12}${ampm}`);
  }

  // Day of month
  if (dayOfMonth !== '*' && dayOfMonth !== '?') {
    descriptions.push(`on day ${dayOfMonth} of the month`);
  }

  // Month
  if (month !== '*') {
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthNum = parseInt(month);
    if (monthNum >= 1 && monthNum <= 12) {
      descriptions.push(`in ${monthNames[monthNum]}`);
    }
  }

  // Day of week
  if (dayOfWeek !== '*' && dayOfWeek !== '?') {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNum = parseInt(dayOfWeek);
    if (dayNum >= 0 && dayNum <= 6) {
      descriptions.push(`on ${dayNames[dayNum]}`);
    } else {
      descriptions.push(`on day ${dayOfWeek} of the week`);
    }
  }

  return descriptions.join(', ') || 'Custom schedule';
}

/**
 * Get description for a command
 */
function getCommandDescription(command: string): string {
  const descriptions: Record<string, string> = {
    'refresh-matviews': 'Refresh materialized views (XP rankings leaderboard)',
    'run-retention-policies': 'Execute data retention policies to clean up old data',
    'archive-credits': 'Archive old credit transactions (older than 6 months)',
    'cleanup-expired-mutes': 'Remove expired user mutes from the database',
    'cleanup-fraud-flags': 'Delete resolved fraud flags older than 90 days',
    'capture-performance-snapshot': 'Capture a performance metrics snapshot',
    'health-check': 'Verify database connectivity and basic system health',
    'send-daily-summary': 'Send daily summary emails (placeholder)',
    'beta-tester-snapshots': 'Create daily progress snapshots for beta testers',
    'custom-sql': 'Execute a custom SQL SELECT query (defined in job metadata)',
  };

  return descriptions[command] || 'No description available';
}
