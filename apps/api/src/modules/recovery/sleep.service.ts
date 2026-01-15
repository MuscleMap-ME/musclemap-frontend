/**
 * Sleep Service
 *
 * Handles sleep log CRUD operations and sleep statistics.
 */

import { queryOne, queryAll, execute } from '../../db/client';
import { loggers } from '../../lib/logger';
import type {
  SleepLog,
  CreateSleepLogInput,
  UpdateSleepLogInput,
  SleepGoal,
  CreateSleepGoalInput,
  UpdateSleepGoalInput,
  SleepStats,
  WeeklySleepStats,
} from './types';

const log = loggers.api;

// ============================================
// SLEEP LOG OPERATIONS
// ============================================

/**
 * Log a sleep session
 */
export async function logSleep(userId: string, input: CreateSleepLogInput): Promise<SleepLog> {
  const id = `sl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  // Validate sleep times
  const bedTime = new Date(input.bedTime);
  const wakeTime = new Date(input.wakeTime);

  if (wakeTime <= bedTime) {
    throw new Error('Wake time must be after bed time');
  }

  const durationMinutes = Math.round((wakeTime.getTime() - bedTime.getTime()) / (1000 * 60));

  // Validate duration (4-16 hours)
  if (durationMinutes < 240 || durationMinutes > 960) {
    throw new Error('Sleep duration must be between 4 and 16 hours');
  }

  await execute(
    `INSERT INTO sleep_logs (
      id, user_id, bed_time, wake_time, quality, sleep_environment,
      time_to_fall_asleep_minutes, wake_count, notes, source, external_id, logged_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (user_id, bed_time) DO UPDATE SET
      wake_time = EXCLUDED.wake_time,
      quality = EXCLUDED.quality,
      sleep_environment = EXCLUDED.sleep_environment,
      time_to_fall_asleep_minutes = EXCLUDED.time_to_fall_asleep_minutes,
      wake_count = EXCLUDED.wake_count,
      notes = EXCLUDED.notes,
      updated_at = NOW()`,
    [
      id,
      userId,
      input.bedTime,
      input.wakeTime,
      input.quality,
      JSON.stringify(input.sleepEnvironment || {}),
      input.timeToFallAsleepMinutes || null,
      input.wakeCount || 0,
      input.notes || null,
      input.source || 'manual',
      input.externalId || null,
      input.loggedAt || now,
    ]
  );

  log.info({ userId, sleepId: id, durationMinutes, quality: input.quality }, 'Sleep logged');

  const sleepLog = await getSleepLog(userId, id);
  if (!sleepLog) {
    throw new Error('Failed to create sleep log');
  }

  return sleepLog;
}

/**
 * Get a single sleep log
 */
export async function getSleepLog(userId: string, sleepId: string): Promise<SleepLog | null> {
  const row = await queryOne<{
    id: string;
    user_id: string;
    bed_time: string;
    wake_time: string;
    sleep_duration_minutes: number;
    quality: number;
    sleep_environment: string | object;
    time_to_fall_asleep_minutes: number | null;
    wake_count: number;
    notes: string | null;
    source: string;
    external_id: string | null;
    logged_at: string;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT * FROM sleep_logs WHERE id = $1 AND user_id = $2`,
    [sleepId, userId]
  );

  if (!row) return null;

  return mapRowToSleepLog(row);
}

/**
 * Get user's sleep history with keyset pagination
 */
export async function getSleepHistory(
  userId: string,
  options: {
    limit?: number;
    cursor?: { bedTime: string; id: string };
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<{ logs: SleepLog[]; nextCursor: { bedTime: string; id: string } | null }> {
  const limit = Math.min(options.limit || 30, 100);
  let sql: string;
  let params: unknown[];

  if (options.cursor) {
    sql = `
      SELECT * FROM sleep_logs
      WHERE user_id = $1
        AND (bed_time, id) < ($2, $3)
        ${options.startDate ? 'AND bed_time >= $4' : ''}
        ${options.endDate ? `AND bed_time <= $${options.startDate ? 5 : 4}` : ''}
      ORDER BY bed_time DESC, id DESC
      LIMIT $${options.startDate && options.endDate ? 6 : options.startDate || options.endDate ? 5 : 4}
    `;
    params = [userId, options.cursor.bedTime, options.cursor.id];
    if (options.startDate) params.push(options.startDate);
    if (options.endDate) params.push(options.endDate);
    params.push(limit);
  } else {
    sql = `
      SELECT * FROM sleep_logs
      WHERE user_id = $1
        ${options.startDate ? 'AND bed_time >= $2' : ''}
        ${options.endDate ? `AND bed_time <= $${options.startDate ? 3 : 2}` : ''}
      ORDER BY bed_time DESC, id DESC
      LIMIT $${options.startDate && options.endDate ? 4 : options.startDate || options.endDate ? 3 : 2}
    `;
    params = [userId];
    if (options.startDate) params.push(options.startDate);
    if (options.endDate) params.push(options.endDate);
    params.push(limit);
  }

  const rows = await queryAll<any>(sql, params);
  const logs = rows.map(mapRowToSleepLog);

  const lastLog = logs[logs.length - 1];
  const nextCursor = logs.length === limit && lastLog
    ? { bedTime: lastLog.bedTime, id: lastLog.id }
    : null;

  return { logs, nextCursor };
}

/**
 * Update a sleep log
 */
export async function updateSleepLog(
  userId: string,
  sleepId: string,
  input: UpdateSleepLogInput
): Promise<SleepLog | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.quality !== undefined) {
    updates.push(`quality = $${paramIndex++}`);
    values.push(input.quality);
  }
  if (input.sleepEnvironment !== undefined) {
    updates.push(`sleep_environment = $${paramIndex++}`);
    values.push(JSON.stringify(input.sleepEnvironment));
  }
  if (input.timeToFallAsleepMinutes !== undefined) {
    updates.push(`time_to_fall_asleep_minutes = $${paramIndex++}`);
    values.push(input.timeToFallAsleepMinutes);
  }
  if (input.wakeCount !== undefined) {
    updates.push(`wake_count = $${paramIndex++}`);
    values.push(input.wakeCount);
  }
  if (input.notes !== undefined) {
    updates.push(`notes = $${paramIndex++}`);
    values.push(input.notes);
  }

  if (updates.length === 0) {
    return getSleepLog(userId, sleepId);
  }

  updates.push(`updated_at = NOW()`);
  values.push(sleepId, userId);

  await execute(
    `UPDATE sleep_logs SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
    values
  );

  return getSleepLog(userId, sleepId);
}

/**
 * Delete a sleep log
 */
export async function deleteSleepLog(userId: string, sleepId: string): Promise<boolean> {
  const rowCount = await execute(
    `DELETE FROM sleep_logs WHERE id = $1 AND user_id = $2`,
    [sleepId, userId]
  );
  return rowCount > 0;
}

/**
 * Get last night's sleep (most recent)
 */
export async function getLastSleep(userId: string): Promise<SleepLog | null> {
  const row = await queryOne<any>(
    `SELECT * FROM sleep_logs WHERE user_id = $1 ORDER BY bed_time DESC LIMIT 1`,
    [userId]
  );

  if (!row) return null;
  return mapRowToSleepLog(row);
}

// ============================================
// SLEEP STATISTICS
// ============================================

/**
 * Get sleep statistics for a user
 */
export async function getSleepStats(
  userId: string,
  period: 'week' | 'month' | 'all' = 'week'
): Promise<SleepStats> {
  const intervalMap = {
    week: '7 days',
    month: '30 days',
    all: '365 days', // Cap at 1 year for performance
  };

  const interval = intervalMap[period];

  // Get aggregate stats
  const stats = await queryOne<{
    nights_logged: string;
    avg_duration: string;
    avg_quality: string;
    min_duration: string;
    max_duration: string;
    stddev_duration: string;
  }>(
    `SELECT
      COUNT(*) as nights_logged,
      ROUND(AVG(sleep_duration_minutes)::numeric, 1) as avg_duration,
      ROUND(AVG(quality)::numeric, 2) as avg_quality,
      MIN(sleep_duration_minutes) as min_duration,
      MAX(sleep_duration_minutes) as max_duration,
      ROUND(STDDEV(sleep_duration_minutes)::numeric, 1) as stddev_duration
    FROM sleep_logs
    WHERE user_id = $1 AND bed_time >= NOW() - INTERVAL '${interval}'`,
    [userId]
  );

  // Get quality distribution
  const qualityDist = await queryAll<{ quality: number; count: string }>(
    `SELECT quality, COUNT(*) as count
     FROM sleep_logs
     WHERE user_id = $1 AND bed_time >= NOW() - INTERVAL '${interval}'
     GROUP BY quality`,
    [userId]
  );

  const qualityMap: Record<number, number> = {};
  for (const row of qualityDist) {
    qualityMap[row.quality] = parseInt(row.count);
  }

  // Get user's sleep goal for target comparison
  const goal = await getActiveSleepGoal(userId);
  const targetMinutes = (goal?.targetHours || 8) * 60;

  // Count nights meeting target
  const targetMet = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM sleep_logs
     WHERE user_id = $1
       AND bed_time >= NOW() - INTERVAL '${interval}'
       AND sleep_duration_minutes >= $2`,
    [userId, targetMinutes * 0.9] // Within 90% of target
  );

  const nightsLogged = parseInt(stats?.nights_logged || '0');
  const avgDuration = parseFloat(stats?.avg_duration || '0');
  const stddev = parseFloat(stats?.stddev_duration || '0');

  // Calculate consistency (inverse of coefficient of variation)
  const consistency = avgDuration > 0 && nightsLogged >= 3
    ? Math.max(0, Math.min(100, 100 - (stddev / avgDuration * 100)))
    : 0;

  return {
    period,
    nightsLogged,
    avgDurationMinutes: avgDuration,
    avgDurationHours: Math.round((avgDuration / 60) * 10) / 10,
    avgQuality: parseFloat(stats?.avg_quality || '0'),
    minDurationMinutes: parseInt(stats?.min_duration || '0'),
    maxDurationMinutes: parseInt(stats?.max_duration || '0'),
    consistency: Math.round(consistency),
    targetMet: parseInt(targetMet?.count || '0'),
    qualityDistribution: {
      terrible: qualityMap[1] || 0,
      poor: qualityMap[2] || 0,
      fair: qualityMap[3] || 0,
      good: qualityMap[4] || 0,
      excellent: qualityMap[5] || 0,
    },
  };
}

/**
 * Get weekly sleep stats for trend analysis
 */
export async function getWeeklySleepStats(
  userId: string,
  weeks: number = 8
): Promise<WeeklySleepStats[]> {
  const rows = await queryAll<{
    week_start: string;
    nights_logged: string;
    avg_duration_minutes: string;
    avg_quality: string;
    min_duration_minutes: string;
    max_duration_minutes: string;
    stddev_duration: string;
  }>(
    `SELECT * FROM mv_sleep_stats
     WHERE user_id = $1
     ORDER BY week_start DESC
     LIMIT $2`,
    [userId, weeks]
  );

  return rows.map(row => ({
    weekStart: row.week_start,
    nightsLogged: parseInt(row.nights_logged),
    avgDurationMinutes: parseFloat(row.avg_duration_minutes),
    avgQuality: parseFloat(row.avg_quality),
    minDurationMinutes: parseInt(row.min_duration_minutes),
    maxDurationMinutes: parseInt(row.max_duration_minutes),
    stddevDuration: parseFloat(row.stddev_duration || '0'),
  }));
}

// ============================================
// SLEEP GOAL OPERATIONS
// ============================================

/**
 * Get active sleep goal
 */
export async function getActiveSleepGoal(userId: string): Promise<SleepGoal | null> {
  const row = await queryOne<{
    id: string;
    user_id: string;
    target_hours: string;
    target_bed_time: string | null;
    target_wake_time: string | null;
    target_quality: number | null;
    consistency_target: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT * FROM sleep_goals WHERE user_id = $1 AND is_active = TRUE`,
    [userId]
  );

  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    targetHours: parseFloat(row.target_hours),
    targetBedTime: row.target_bed_time || undefined,
    targetWakeTime: row.target_wake_time || undefined,
    targetQuality: row.target_quality || undefined,
    consistencyTarget: row.consistency_target,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Create or update sleep goal
 */
export async function upsertSleepGoal(userId: string, input: CreateSleepGoalInput): Promise<SleepGoal> {
  const id = `sg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Deactivate existing goals first
  await execute(
    `UPDATE sleep_goals SET is_active = FALSE, updated_at = NOW() WHERE user_id = $1 AND is_active = TRUE`,
    [userId]
  );

  // Create new goal
  await execute(
    `INSERT INTO sleep_goals (
      id, user_id, target_hours, target_bed_time, target_wake_time,
      target_quality, consistency_target, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
    [
      id,
      userId,
      input.targetHours,
      input.targetBedTime || null,
      input.targetWakeTime || null,
      input.targetQuality || null,
      input.consistencyTarget || 5,
    ]
  );

  log.info({ userId, goalId: id, targetHours: input.targetHours }, 'Sleep goal created');

  const goal = await getActiveSleepGoal(userId);
  if (!goal) {
    throw new Error('Failed to create sleep goal');
  }

  return goal;
}

/**
 * Update sleep goal
 */
export async function updateSleepGoal(
  userId: string,
  goalId: string,
  input: UpdateSleepGoalInput
): Promise<SleepGoal | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.targetHours !== undefined) {
    updates.push(`target_hours = $${paramIndex++}`);
    values.push(input.targetHours);
  }
  if (input.targetBedTime !== undefined) {
    updates.push(`target_bed_time = $${paramIndex++}`);
    values.push(input.targetBedTime);
  }
  if (input.targetWakeTime !== undefined) {
    updates.push(`target_wake_time = $${paramIndex++}`);
    values.push(input.targetWakeTime);
  }
  if (input.targetQuality !== undefined) {
    updates.push(`target_quality = $${paramIndex++}`);
    values.push(input.targetQuality);
  }
  if (input.consistencyTarget !== undefined) {
    updates.push(`consistency_target = $${paramIndex++}`);
    values.push(input.consistencyTarget);
  }

  if (updates.length === 0) {
    return getActiveSleepGoal(userId);
  }

  updates.push(`updated_at = NOW()`);
  values.push(goalId, userId);

  await execute(
    `UPDATE sleep_goals SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
    values
  );

  return getActiveSleepGoal(userId);
}

/**
 * Delete sleep goal
 */
export async function deleteSleepGoal(userId: string, goalId: string): Promise<boolean> {
  const rowCount = await execute(
    `DELETE FROM sleep_goals WHERE id = $1 AND user_id = $2`,
    [goalId, userId]
  );
  return rowCount > 0;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapRowToSleepLog(row: any): SleepLog {
  let sleepEnvironment = {};
  if (row.sleep_environment) {
    try {
      sleepEnvironment = typeof row.sleep_environment === 'string'
        ? JSON.parse(row.sleep_environment)
        : row.sleep_environment;
    } catch {
      sleepEnvironment = {};
    }
  }

  return {
    id: row.id,
    userId: row.user_id,
    bedTime: row.bed_time,
    wakeTime: row.wake_time,
    sleepDurationMinutes: row.sleep_duration_minutes,
    quality: row.quality,
    sleepEnvironment: Object.keys(sleepEnvironment).length > 0 ? sleepEnvironment : undefined,
    timeToFallAsleepMinutes: row.time_to_fall_asleep_minutes || undefined,
    wakeCount: row.wake_count || undefined,
    notes: row.notes || undefined,
    source: row.source,
    externalId: row.external_id || undefined,
    loggedAt: row.logged_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
