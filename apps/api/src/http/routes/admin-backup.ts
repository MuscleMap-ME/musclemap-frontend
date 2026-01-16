/**
 * Admin Backup Routes
 *
 * Handles database backup and recovery operations:
 * - List all backups
 * - Create manual backups (pg_dump)
 * - Restore from backups
 * - Delete backups
 * - Manage backup schedule
 * - Check backup job status
 * - Test restore to verify integrity
 *
 * SECURITY: All routes require admin authentication
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { query, queryOne, queryAll, transaction as _transaction } from '../../db/client';
import { authenticate, requireAdmin } from './auth';
import { loggers } from '../../lib/logger';
import { config } from '../../config';

const execAsync = promisify(exec);
const log = loggers.api;

// ============================================
// CONSTANTS
// ============================================

const BACKUP_DIR = process.env.BACKUP_DIR || '/var/backups/musclemap';
const PG_DUMP_PATH = process.env.PG_DUMP_PATH || 'pg_dump';
const _PG_RESTORE_PATH = process.env.PG_RESTORE_PATH || 'pg_restore';
const PSQL_PATH = process.env.PSQL_PATH || 'psql';

// ============================================
// SCHEMAS
// ============================================

const createBackupSchema = z.object({
  type: z.enum(['full', 'schema', 'data']).default('full'),
  compress: z.boolean().default(true),
  description: z.string().max(500).optional(),
});

const restoreBackupSchema = z.object({
  targetDatabase: z.string().optional(),
  dropExisting: z.boolean().default(false),
  dataOnly: z.boolean().default(false),
  schemaOnly: z.boolean().default(false),
});

const updateScheduleSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
  retentionDays: z.number().min(1).max(365).default(30),
  hour: z.number().min(0).max(23).default(3),
  minute: z.number().min(0).max(59).default(0),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(28).optional(),
});

const listBackupsSchema = z.object({
  type: z.enum(['full', 'schema', 'data', 'all']).default('all'),
  status: z.enum(['completed', 'failed', 'in_progress', 'all']).default('all'),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// ============================================
// TYPES
// ============================================

interface BackupRow {
  id: string;
  filename: string;
  size_bytes: bigint | number;
  type: 'full' | 'schema' | 'data';
  status: 'in_progress' | 'completed' | 'failed' | 'verified' | 'corrupted';
  description: string | null;
  error_message: string | null;
  created_at: Date;
  completed_at: Date | null;
  verified_at: Date | null;
  created_by: string | null;
  metadata: Record<string, unknown>;
}

interface BackupScheduleRow {
  id: string;
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  retention_days: number;
  hour: number;
  minute: number;
  day_of_week: number | null;
  day_of_month: number | null;
  last_run_at: Date | null;
  next_run_at: Date | null;
  updated_at: Date;
}

interface BackupJobStatus {
  isRunning: boolean;
  currentBackupId: string | null;
  progress: number;
  startedAt: Date | null;
  estimatedCompletion: Date | null;
}

// Track current backup job
let currentBackupJob: BackupJobStatus = {
  isRunning: false,
  currentBackupId: null,
  progress: 0,
  startedAt: null,
  estimatedCompletion: null,
};

// ============================================
// HELPERS
// ============================================

async function ensureBackupDir(): Promise<void> {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    log.error({ error, dir: BACKUP_DIR }, 'Failed to create backup directory');
    throw new Error(`Failed to create backup directory: ${BACKUP_DIR}`);
  }
}

async function getFileSize(filepath: string): Promise<number> {
  try {
    const stats = await fs.stat(filepath);
    return stats.size;
  } catch {
    return 0;
  }
}

async function fileExists(filepath: string): Promise<boolean> {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

function generateBackupFilename(type: string, compressed: boolean): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const ext = compressed ? '.sql.gz' : '.sql';
  return `musclemap_${type}_${timestamp}${ext}`;
}

function formatBackupResponse(row: BackupRow) {
  return {
    id: row.id,
    filename: row.filename,
    sizeBytes: Number(row.size_bytes),
    sizeMb: Math.round(Number(row.size_bytes) / (1024 * 1024) * 100) / 100,
    type: row.type,
    status: row.status,
    description: row.description,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    verifiedAt: row.verified_at,
    createdBy: row.created_by,
    metadata: row.metadata,
  };
}

async function runPgDump(
  backupId: string,
  filename: string,
  type: 'full' | 'schema' | 'data',
  compress: boolean
): Promise<{ success: boolean; error?: string }> {
  return new Promise(async (resolve) => {
    const filepath = path.join(BACKUP_DIR, filename);
    const args: string[] = [];

    // Database connection from config
    if (config.DATABASE_URL) {
      args.push(config.DATABASE_URL);
    } else {
      args.push('-h', config.PGHOST || 'localhost');
      args.push('-p', String(config.PGPORT || 5432));
      args.push('-U', config.PGUSER || 'postgres');
      args.push('-d', config.PGDATABASE || 'musclemap');
    }

    // Backup type
    if (type === 'schema') {
      args.push('--schema-only');
    } else if (type === 'data') {
      args.push('--data-only');
    }

    // Format and compression
    args.push('--format=plain');
    args.push('--no-owner');
    args.push('--no-privileges');

    let outputFile: fs.FileHandle | null = null;
    let gzipProcess: ReturnType<typeof spawn> | null = null;

    try {
      if (compress) {
        // Pipe through gzip
        const dumpProcess = spawn(PG_DUMP_PATH, args, {
          env: { ...process.env, PGPASSWORD: config.PGPASSWORD || '' },
        });

        gzipProcess = spawn('gzip', ['-c']);
        outputFile = await fs.open(filepath, 'w');
        const writeStream = outputFile.createWriteStream();

        dumpProcess.stdout.pipe(gzipProcess.stdin);
        gzipProcess.stdout.pipe(writeStream);

        let errorOutput = '';
        dumpProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        await new Promise<void>((res, rej) => {
          let completed = 0;
          const checkComplete = () => {
            completed++;
            if (completed === 2) res();
          };

          dumpProcess.on('close', (code) => {
            if (code !== 0) {
              rej(new Error(errorOutput || `pg_dump exited with code ${code}`));
            } else {
              checkComplete();
            }
          });

          writeStream.on('finish', checkComplete);
          writeStream.on('error', rej);
        });
      } else {
        // Direct output to file
        args.push('-f', filepath);

        const dumpProcess = spawn(PG_DUMP_PATH, args, {
          env: { ...process.env, PGPASSWORD: config.PGPASSWORD || '' },
        });

        let errorOutput = '';
        dumpProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        await new Promise<void>((res, rej) => {
          dumpProcess.on('close', (code) => {
            if (code !== 0) {
              rej(new Error(errorOutput || `pg_dump exited with code ${code}`));
            } else {
              res();
            }
          });
        });
      }

      // Get final file size
      const sizeBytes = await getFileSize(filepath);

      // Update backup record with success
      await query(
        `UPDATE backups SET
          status = 'completed',
          size_bytes = $1,
          completed_at = NOW()
        WHERE id = $2`,
        [sizeBytes, backupId]
      );

      resolve({ success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update backup record with failure
      await query(
        `UPDATE backups SET
          status = 'failed',
          error_message = $1,
          completed_at = NOW()
        WHERE id = $2`,
        [errorMessage, backupId]
      );

      resolve({ success: false, error: errorMessage });
    } finally {
      if (outputFile) {
        await outputFile.close().catch(() => {});
      }
      currentBackupJob = {
        isRunning: false,
        currentBackupId: null,
        progress: 100,
        startedAt: null,
        estimatedCompletion: null,
      };
    }
  });
}

async function runPgRestore(
  filepath: string,
  options: {
    targetDatabase?: string;
    dropExisting?: boolean;
    dataOnly?: boolean;
    schemaOnly?: boolean;
  }
): Promise<{ success: boolean; output: string; error?: string }> {
  const isCompressed = filepath.endsWith('.gz');
  const args: string[] = [];

  // Database connection
  const targetDb = options.targetDatabase || config.PGDATABASE || 'musclemap';
  if (config.DATABASE_URL) {
    // Parse DATABASE_URL and replace database name if different target specified
    const dbUrl = new URL(config.DATABASE_URL);
    if (options.targetDatabase) {
      dbUrl.pathname = `/${options.targetDatabase}`;
    }
    args.push('-d', dbUrl.toString());
  } else {
    args.push('-h', config.PGHOST || 'localhost');
    args.push('-p', String(config.PGPORT || 5432));
    args.push('-U', config.PGUSER || 'postgres');
    args.push('-d', targetDb);
  }

  try {
    let command: string;

    if (isCompressed) {
      // Decompress and pipe to psql
      if (options.dropExisting) {
        command = `gunzip -c "${filepath}" | PGPASSWORD='${config.PGPASSWORD || ''}' ${PSQL_PATH} ${args.join(' ')} -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" && gunzip -c "${filepath}" | PGPASSWORD='${config.PGPASSWORD || ''}' ${PSQL_PATH} ${args.join(' ')}`;
      } else {
        command = `gunzip -c "${filepath}" | PGPASSWORD='${config.PGPASSWORD || ''}' ${PSQL_PATH} ${args.join(' ')}`;
      }
    } else {
      // Direct file input to psql
      if (options.dropExisting) {
        command = `PGPASSWORD='${config.PGPASSWORD || ''}' ${PSQL_PATH} ${args.join(' ')} -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" && PGPASSWORD='${config.PGPASSWORD || ''}' ${PSQL_PATH} ${args.join(' ')} -f "${filepath}"`;
      } else {
        command = `PGPASSWORD='${config.PGPASSWORD || ''}' ${PSQL_PATH} ${args.join(' ')} -f "${filepath}"`;
      }
    }

    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });

    return { success: true, output: stdout || stderr };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, output: '', error: errorMessage };
  }
}

async function testBackupIntegrity(
  backupId: string,
  filepath: string
): Promise<{ valid: boolean; error?: string }> {
  const isCompressed = filepath.endsWith('.gz');

  try {
    // First check if file exists and is readable
    if (!(await fileExists(filepath))) {
      return { valid: false, error: 'Backup file not found' };
    }

    // For compressed files, verify gzip integrity
    if (isCompressed) {
      await execAsync(`gzip -t "${filepath}"`);
    }

    // Try to parse the SQL to verify it's valid
    // We'll create a temporary database, restore, then drop it
    const testDbName = `musclemap_test_restore_${Date.now()}`;

    // Create test database
    const createDbArgs = config.DATABASE_URL
      ? [config.DATABASE_URL.replace(/\/[^/]+$/, '/postgres')]
      : ['-h', config.PGHOST || 'localhost', '-p', String(config.PGPORT || 5432), '-U', config.PGUSER || 'postgres', '-d', 'postgres'];

    await execAsync(
      `PGPASSWORD='${config.PGPASSWORD || ''}' ${PSQL_PATH} ${createDbArgs.join(' ')} -c "CREATE DATABASE ${testDbName}"`
    );

    try {
      // Attempt restore to test database
      const restoreResult = await runPgRestore(filepath, {
        targetDatabase: testDbName,
        dropExisting: false,
      });

      // Update backup status based on result
      if (restoreResult.success) {
        await query(
          `UPDATE backups SET status = 'verified', verified_at = NOW() WHERE id = $1`,
          [backupId]
        );
        return { valid: true };
      } else {
        await query(
          `UPDATE backups SET status = 'corrupted', error_message = $1 WHERE id = $2`,
          [restoreResult.error, backupId]
        );
        return { valid: false, error: restoreResult.error };
      }
    } finally {
      // Always drop test database
      await execAsync(
        `PGPASSWORD='${config.PGPASSWORD || ''}' ${PSQL_PATH} ${createDbArgs.join(' ')} -c "DROP DATABASE IF EXISTS ${testDbName}"`
      ).catch(() => {});
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await query(
      `UPDATE backups SET status = 'corrupted', error_message = $1 WHERE id = $2`,
      [errorMessage, backupId]
    );
    return { valid: false, error: errorMessage };
  }
}

function calculateNextRunTime(schedule: BackupScheduleRow): Date {
  const now = new Date();
  const next = new Date(now);

  next.setHours(schedule.hour);
  next.setMinutes(schedule.minute);
  next.setSeconds(0);
  next.setMilliseconds(0);

  switch (schedule.frequency) {
    case 'hourly':
      next.setMinutes(schedule.minute);
      if (next <= now) {
        next.setHours(next.getHours() + 1);
      }
      break;

    case 'daily':
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      break;

    case 'weekly':
      next.setDate(next.getDate() + ((7 + (schedule.day_of_week || 0) - next.getDay()) % 7 || 7));
      if (next <= now) {
        next.setDate(next.getDate() + 7);
      }
      break;

    case 'monthly':
      next.setDate(schedule.day_of_month || 1);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      break;
  }

  return next;
}

// ============================================
// ROUTES
// ============================================

export default async function adminBackupRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /admin/backup/list
   * List all backups with size and timestamp
   */
  fastify.get(
    '/admin/backup/list',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const queryParams = listBackupsSchema.parse(request.query);

      let sql = `
        SELECT b.*, u.username as created_by_username
        FROM backups b
        LEFT JOIN users u ON b.created_by = u.id
        WHERE 1=1
      `;
      const params: unknown[] = [];
      let paramIndex = 1;

      if (queryParams.type !== 'all') {
        sql += ` AND b.type = $${paramIndex++}`;
        params.push(queryParams.type);
      }

      if (queryParams.status !== 'all') {
        sql += ` AND b.status = $${paramIndex++}`;
        params.push(queryParams.status);
      }

      // Keyset pagination
      if (queryParams.cursor) {
        const [cursorDate, cursorId] = queryParams.cursor.split('|');
        sql += ` AND (b.created_at < $${paramIndex++} OR (b.created_at = $${paramIndex - 1} AND b.id < $${paramIndex++}))`;
        params.push(cursorDate, cursorId);
      }

      sql += ` ORDER BY b.created_at DESC, b.id DESC LIMIT $${paramIndex}`;
      params.push(queryParams.limit + 1);

      const rows = await queryAll<BackupRow & { created_by_username: string | null }>(sql, params);
      const hasMore = rows.length > queryParams.limit;
      const items = hasMore ? rows.slice(0, -1) : rows;

      const nextCursor = hasMore && items.length > 0
        ? `${items[items.length - 1].created_at.toISOString()}|${items[items.length - 1].id}`
        : null;

      // Get total stats
      const stats = await queryOne<{ total: string; total_size: string }>(`
        SELECT COUNT(*) as total, COALESCE(SUM(size_bytes), 0) as total_size
        FROM backups WHERE status = 'completed'
      `);

      return reply.send({
        items: items.map((row) => ({
          ...formatBackupResponse(row),
          createdByUsername: row.created_by_username,
        })),
        nextCursor,
        hasMore,
        stats: {
          totalBackups: parseInt(stats?.total || '0'),
          totalSizeBytes: parseInt(stats?.total_size || '0'),
          totalSizeMb: Math.round(parseInt(stats?.total_size || '0') / (1024 * 1024) * 100) / 100,
        },
      });
    }
  );

  /**
   * POST /admin/backup/create
   * Trigger a manual backup (pg_dump)
   */
  fastify.post(
    '/admin/backup/create',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as { userId: string };
      const body = createBackupSchema.parse(request.body);

      // Check if backup is already in progress
      if (currentBackupJob.isRunning) {
        return reply.status(409).send({
          error: {
            code: 'BACKUP_IN_PROGRESS',
            message: 'A backup is already in progress',
            statusCode: 409,
            currentBackupId: currentBackupJob.currentBackupId,
          },
        });
      }

      await ensureBackupDir();

      const filename = generateBackupFilename(body.type, body.compress);
      const backupId = `backup_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Create backup record
      await query(
        `INSERT INTO backups (id, filename, size_bytes, type, status, description, created_by, metadata)
         VALUES ($1, $2, 0, $3, 'in_progress', $4, $5, $6)`,
        [
          backupId,
          filename,
          body.type,
          body.description || null,
          user.userId,
          JSON.stringify({ compressed: body.compress }),
        ]
      );

      // Update job status
      currentBackupJob = {
        isRunning: true,
        currentBackupId: backupId,
        progress: 0,
        startedAt: new Date(),
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000), // Estimate 5 minutes
      };

      // Start backup in background
      runPgDump(backupId, filename, body.type, body.compress).then((result) => {
        if (result.success) {
          log.info({ backupId, filename }, 'Backup completed successfully');
        } else {
          log.error({ backupId, filename, error: result.error }, 'Backup failed');
        }
      });

      log.info({ backupId, filename, type: body.type, userId: user.userId }, 'Backup started');

      return reply.status(202).send({
        message: 'Backup started',
        backupId,
        filename,
        type: body.type,
        status: 'in_progress',
      });
    }
  );

  /**
   * POST /admin/backup/restore/:id
   * Restore from a backup
   */
  fastify.post<{ Params: { id: string } }>(
    '/admin/backup/restore/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user as { userId: string };
      const body = restoreBackupSchema.parse(request.body || {});

      // Get backup record
      const backup = await queryOne<BackupRow>(
        'SELECT * FROM backups WHERE id = $1',
        [id]
      );

      if (!backup) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Backup not found', statusCode: 404 },
        });
      }

      if (backup.status !== 'completed' && backup.status !== 'verified') {
        return reply.status(400).send({
          error: {
            code: 'INVALID_BACKUP',
            message: `Cannot restore from backup with status: ${backup.status}`,
            statusCode: 400,
          },
        });
      }

      const filepath = path.join(BACKUP_DIR, backup.filename);
      if (!(await fileExists(filepath))) {
        return reply.status(404).send({
          error: { code: 'FILE_NOT_FOUND', message: 'Backup file not found on disk', statusCode: 404 },
        });
      }

      log.warn(
        { backupId: id, targetDb: body.targetDatabase, userId: user.userId },
        'Starting database restore'
      );

      // Perform restore
      const result = await runPgRestore(filepath, {
        targetDatabase: body.targetDatabase,
        dropExisting: body.dropExisting,
        dataOnly: body.dataOnly,
        schemaOnly: body.schemaOnly,
      });

      if (result.success) {
        log.info({ backupId: id, userId: user.userId }, 'Database restore completed');
        return reply.send({
          success: true,
          message: 'Database restored successfully',
          output: result.output,
        });
      } else {
        log.error({ backupId: id, error: result.error }, 'Database restore failed');
        return reply.status(500).send({
          error: {
            code: 'RESTORE_FAILED',
            message: 'Database restore failed',
            details: result.error,
            statusCode: 500,
          },
        });
      }
    }
  );

  /**
   * DELETE /admin/backup/:id
   * Delete a backup
   */
  fastify.delete<{ Params: { id: string } }>(
    '/admin/backup/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user as { userId: string };

      const backup = await queryOne<BackupRow>(
        'SELECT * FROM backups WHERE id = $1',
        [id]
      );

      if (!backup) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Backup not found', statusCode: 404 },
        });
      }

      // Don't delete in-progress backups
      if (backup.status === 'in_progress') {
        return reply.status(400).send({
          error: {
            code: 'BACKUP_IN_PROGRESS',
            message: 'Cannot delete backup that is in progress',
            statusCode: 400,
          },
        });
      }

      // Delete file from disk
      const filepath = path.join(BACKUP_DIR, backup.filename);
      try {
        await fs.unlink(filepath);
      } catch (error) {
        // File might not exist, continue with database deletion
        log.warn({ filepath, error }, 'Failed to delete backup file');
      }

      // Delete from database
      await query('DELETE FROM backups WHERE id = $1', [id]);

      log.info({ backupId: id, filename: backup.filename, userId: user.userId }, 'Backup deleted');

      return reply.send({ success: true, message: 'Backup deleted' });
    }
  );

  /**
   * GET /admin/backup/schedule
   * Get backup schedule
   */
  fastify.get(
    '/admin/backup/schedule',
    { preHandler: [authenticate, requireAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      let schedule = await queryOne<BackupScheduleRow>(
        'SELECT * FROM backup_schedule ORDER BY id LIMIT 1'
      );

      // Create default schedule if none exists
      if (!schedule) {
        await query(
          `INSERT INTO backup_schedule (enabled, frequency, retention_days, hour, minute)
           VALUES (false, 'daily', 30, 3, 0)`
        );
        schedule = await queryOne<BackupScheduleRow>(
          'SELECT * FROM backup_schedule ORDER BY id LIMIT 1'
        );
      }

      return reply.send({
        enabled: schedule?.enabled ?? false,
        frequency: schedule?.frequency ?? 'daily',
        retentionDays: schedule?.retention_days ?? 30,
        hour: schedule?.hour ?? 3,
        minute: schedule?.minute ?? 0,
        dayOfWeek: schedule?.day_of_week,
        dayOfMonth: schedule?.day_of_month,
        lastRunAt: schedule?.last_run_at,
        nextRunAt: schedule?.next_run_at,
        updatedAt: schedule?.updated_at,
      });
    }
  );

  /**
   * PUT /admin/backup/schedule
   * Update backup schedule
   */
  fastify.put(
    '/admin/backup/schedule',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as { userId: string };
      const body = updateScheduleSchema.parse(request.body);

      // Get or create schedule
      let schedule = await queryOne<BackupScheduleRow>(
        'SELECT * FROM backup_schedule ORDER BY id LIMIT 1'
      );

      const nextRun = body.enabled
        ? calculateNextRunTime({
            ...schedule,
            frequency: body.frequency,
            hour: body.hour,
            minute: body.minute,
            day_of_week: body.dayOfWeek ?? null,
            day_of_month: body.dayOfMonth ?? null,
          } as BackupScheduleRow)
        : null;

      if (schedule) {
        await query(
          `UPDATE backup_schedule SET
            enabled = $1,
            frequency = $2,
            retention_days = $3,
            hour = $4,
            minute = $5,
            day_of_week = $6,
            day_of_month = $7,
            next_run_at = $8,
            updated_at = NOW()
          WHERE id = $9`,
          [
            body.enabled,
            body.frequency,
            body.retentionDays,
            body.hour,
            body.minute,
            body.dayOfWeek ?? null,
            body.dayOfMonth ?? null,
            nextRun,
            schedule.id,
          ]
        );
      } else {
        await query(
          `INSERT INTO backup_schedule (enabled, frequency, retention_days, hour, minute, day_of_week, day_of_month, next_run_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            body.enabled,
            body.frequency,
            body.retentionDays,
            body.hour,
            body.minute,
            body.dayOfWeek ?? null,
            body.dayOfMonth ?? null,
            nextRun,
          ]
        );
      }

      log.info({ schedule: body, userId: user.userId }, 'Backup schedule updated');

      return reply.send({
        success: true,
        message: 'Backup schedule updated',
        nextRunAt: nextRun,
      });
    }
  );

  /**
   * GET /admin/backup/status
   * Current backup job status
   */
  fastify.get(
    '/admin/backup/status',
    { preHandler: [authenticate, requireAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      // If a backup is running, get its current details
      if (currentBackupJob.isRunning && currentBackupJob.currentBackupId) {
        const backup = await queryOne<BackupRow>(
          'SELECT * FROM backups WHERE id = $1',
          [currentBackupJob.currentBackupId]
        );

        return reply.send({
          ...currentBackupJob,
          backup: backup ? formatBackupResponse(backup) : null,
        });
      }

      // Get most recent completed/failed backup
      const lastBackup = await queryOne<BackupRow>(
        `SELECT * FROM backups
         WHERE status IN ('completed', 'failed')
         ORDER BY created_at DESC LIMIT 1`
      );

      return reply.send({
        ...currentBackupJob,
        lastBackup: lastBackup ? formatBackupResponse(lastBackup) : null,
      });
    }
  );

  /**
   * POST /admin/backup/test-restore/:id
   * Test restore to verify backup integrity
   */
  fastify.post<{ Params: { id: string } }>(
    '/admin/backup/test-restore/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user as { userId: string };

      const backup = await queryOne<BackupRow>(
        'SELECT * FROM backups WHERE id = $1',
        [id]
      );

      if (!backup) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Backup not found', statusCode: 404 },
        });
      }

      if (backup.status === 'in_progress') {
        return reply.status(400).send({
          error: {
            code: 'BACKUP_IN_PROGRESS',
            message: 'Cannot test backup that is in progress',
            statusCode: 400,
          },
        });
      }

      const filepath = path.join(BACKUP_DIR, backup.filename);
      if (!(await fileExists(filepath))) {
        return reply.status(404).send({
          error: { code: 'FILE_NOT_FOUND', message: 'Backup file not found on disk', statusCode: 404 },
        });
      }

      log.info({ backupId: id, userId: user.userId }, 'Starting backup integrity test');

      const result = await testBackupIntegrity(id, filepath);

      if (result.valid) {
        log.info({ backupId: id }, 'Backup integrity test passed');
        return reply.send({
          success: true,
          valid: true,
          message: 'Backup integrity verified successfully',
        });
      } else {
        log.warn({ backupId: id, error: result.error }, 'Backup integrity test failed');
        return reply.send({
          success: true,
          valid: false,
          message: 'Backup integrity check failed',
          error: result.error,
        });
      }
    }
  );

  /**
   * GET /admin/backup/:id
   * Get single backup details
   */
  fastify.get<{ Params: { id: string } }>(
    '/admin/backup/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;

      const backup = await queryOne<BackupRow & { created_by_username: string | null }>(
        `SELECT b.*, u.username as created_by_username
         FROM backups b
         LEFT JOIN users u ON b.created_by = u.id
         WHERE b.id = $1`,
        [id]
      );

      if (!backup) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Backup not found', statusCode: 404 },
        });
      }

      // Check if file exists
      const filepath = path.join(BACKUP_DIR, backup.filename);
      const fileOnDisk = await fileExists(filepath);

      return reply.send({
        ...formatBackupResponse(backup),
        createdByUsername: backup.created_by_username,
        fileOnDisk,
        filepath: fileOnDisk ? filepath : null,
      });
    }
  );
}
