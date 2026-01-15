/**
 * Wearables Service
 *
 * Business logic for wearable device integrations and health data.
 * Supports Apple Health, Google Fit, Fitbit, Garmin, Whoop, and Oura.
 */
import type { PoolClient } from 'pg';
import { queryOne, queryAll, execute, transaction } from '../../db/client';
import type {
  WearableConnection,
  WearableProvider,
  HealthSyncPayload,
  HealthSummary,
  WorkoutSample,
  HealthSyncResult,
  HealthSyncStatus,
  SyncConflict,
  SyncOptions,
  BodyMeasurementSample,
} from './types';

/**
 * Helper to execute a query within a transaction
 */
async function trxQuery<T = Record<string, unknown>>(
  trx: PoolClient,
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await trx.query(sql, params);
  return (result.rows[0] as T) ?? null;
}

async function trxExecute(
  trx: PoolClient,
  sql: string,
  params?: unknown[]
): Promise<number> {
  const result = await trx.query(sql, params);
  return result.rowCount ?? 0;
}

/**
 * Get user's wearable connections
 */
export async function getConnections(userId: string): Promise<WearableConnection[]> {
  const rows = await queryAll<{
    id: string;
    user_id: string;
    provider: string;
    provider_user_id: string | null;
    is_active: number | boolean;
    last_sync_at: string | null;
    sync_error: string | null;
    created_at: string;
  }>(
    `SELECT id, user_id, provider, provider_user_id, is_active, last_sync_at, sync_error, created_at
     FROM wearable_connections WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    provider: row.provider as WearableProvider,
    providerUserId: row.provider_user_id ?? undefined,
    isActive: Boolean(row.is_active),
    lastSyncAt: row.last_sync_at ?? null,
    syncError: row.sync_error ?? null,
    syncStatus: row.sync_error ? 'error' : (row.last_sync_at ? 'success' : 'idle'),
    createdAt: row.created_at,
  }));
}

/**
 * Create or update a wearable connection
 */
export async function upsertConnection(
  userId: string,
  provider: WearableProvider,
  data: {
    providerUserId?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: string;
  }
): Promise<WearableConnection> {
  const id = `wc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO wearable_connections (id, user_id, provider, provider_user_id, access_token, refresh_token, token_expires_at, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8)
     ON CONFLICT(user_id, provider) DO UPDATE SET
       provider_user_id = EXCLUDED.provider_user_id,
       access_token = EXCLUDED.access_token,
       refresh_token = EXCLUDED.refresh_token,
       token_expires_at = EXCLUDED.token_expires_at,
       is_active = TRUE,
       sync_error = NULL,
       updated_at = NOW()`,
    [
      id,
      userId,
      provider,
      data.providerUserId || null,
      data.accessToken || null,
      data.refreshToken || null,
      data.tokenExpiresAt || null,
      now
    ]
  );

  return {
    id,
    userId,
    provider,
    providerUserId: data.providerUserId,
    isActive: true,
    lastSyncAt: null,
    syncStatus: 'idle',
    createdAt: now,
  };
}

/**
 * Disconnect a wearable provider
 */
export async function disconnectProvider(userId: string, provider: WearableProvider): Promise<void> {
  await execute(
    `UPDATE wearable_connections SET is_active = FALSE, updated_at = NOW() WHERE user_id = $1 AND provider = $2`,
    [userId, provider]
  );
}

/**
 * Get sync status for all providers
 */
export async function getSyncStatus(userId: string): Promise<HealthSyncStatus[]> {
  const connections = await getConnections(userId);

  return connections
    .filter(c => c.isActive)
    .map(c => ({
      provider: c.provider,
      lastSyncAt: c.lastSyncAt,
      syncStatus: c.syncStatus || 'idle',
      syncError: c.syncError || null,
    }));
}

/**
 * Get sync status for a specific provider
 */
export async function getProviderSyncStatus(userId: string, provider: WearableProvider): Promise<HealthSyncStatus | null> {
  const row = await queryOne<{
    last_sync_at: string | null;
    sync_error: string | null;
    is_active: boolean;
  }>(
    `SELECT last_sync_at, sync_error, is_active FROM wearable_connections
     WHERE user_id = $1 AND provider = $2`,
    [userId, provider]
  );

  if (!row || !row.is_active) {
    return null;
  }

  return {
    provider,
    lastSyncAt: row.last_sync_at,
    syncStatus: row.sync_error ? 'error' : (row.last_sync_at ? 'success' : 'idle'),
    syncError: row.sync_error,
  };
}

/**
 * Update sync status (for showing sync in progress)
 */
export async function updateSyncStatus(
  userId: string,
  provider: WearableProvider,
  status: 'syncing' | 'success' | 'error',
  error?: string
): Promise<void> {
  const updates = status === 'error'
    ? `sync_error = $3, updated_at = NOW()`
    : `sync_error = NULL, updated_at = NOW()`;

  await execute(
    `UPDATE wearable_connections SET ${updates} WHERE user_id = $1 AND provider = $2`,
    status === 'error' ? [userId, provider, error] : [userId, provider]
  );
}

/**
 * Sync health data from a wearable with conflict resolution
 */
export async function syncHealthData(
  userId: string,
  provider: WearableProvider,
  payload: HealthSyncPayload,
  options: SyncOptions = {}
): Promise<HealthSyncResult> {
  const counts = { heartRate: 0, workouts: 0, activity: 0, sleep: 0, bodyMeasurements: 0 };
  const conflicts: SyncConflict[] = [];
  const now = new Date().toISOString();
  const { conflictStrategy = 'newest_wins' } = options;

  // Mark sync as in progress
  await updateSyncStatus(userId, provider, 'syncing');

  try {
    // Use transaction for data integrity
    await transaction(async (trx) => {
      // Sync heart rate samples
      if (payload.heartRate?.length) {
        for (const sample of payload.heartRate) {
          // Check for existing sample at same timestamp
          const existing = await trxQuery<{ id: string }>(
            trx,
            `SELECT id FROM health_heart_rate WHERE user_id = $1 AND timestamp = $2`,
            [userId, sample.timestamp]
          );

          if (!existing) {
            await trxExecute(
              trx,
              `INSERT INTO health_heart_rate (user_id, timestamp, bpm, context, source, created_at)
               VALUES ($1, $2, $3, $4, $5, NOW())`,
              [userId, sample.timestamp, sample.bpm, sample.context || null, provider]
            );
            counts.heartRate++;
          }
        }
      }

      // Sync workouts with conflict detection
      if (payload.workouts?.length) {
        for (const workout of payload.workouts) {
          const externalId = workout.externalId || workout.id;

          // Check for existing workout by external ID or time overlap
          const existing = await trxQuery<{
            id: string;
            external_id: string | null;
            start_time: string;
            end_time: string;
            calories_burned: number | null;
          }>(
            trx,
            `SELECT id, external_id, start_time, end_time, calories_burned FROM health_workouts
             WHERE user_id = $1 AND (
               (external_id = $2 AND source = $3) OR
               (start_time <= $4 AND end_time >= $5 AND ABS(EXTRACT(EPOCH FROM (end_time - $4::timestamptz))) < 300)
             )`,
            [userId, externalId, provider, workout.endTime, workout.startTime]
          );

          if (existing) {
            // Conflict detected - apply resolution strategy
            const shouldUpdate = resolveConflict(conflictStrategy, existing, workout);

            if (shouldUpdate) {
              await trxExecute(
                trx,
                `UPDATE health_workouts SET
                   workout_type = $1, start_time = $2, end_time = $3,
                   calories_burned = $4, distance_meters = $5,
                   avg_heart_rate = $6, max_heart_rate = $7, min_heart_rate = $8,
                   steps = $9, elevation_gain_meters = $10
                 WHERE id = $11`,
                [
                  workout.type, workout.startTime, workout.endTime,
                  workout.calories || null, workout.distance || null,
                  workout.avgHeartRate || null, workout.maxHeartRate || null, workout.minHeartRate || null,
                  workout.steps || null, workout.elevationGain || null,
                  existing.id
                ]
              );

              conflicts.push({
                type: 'workout',
                localId: existing.id,
                remoteId: externalId,
                resolution: 'remote_wins',
                timestamp: now,
              });
            } else {
              conflicts.push({
                type: 'workout',
                localId: existing.id,
                remoteId: externalId,
                resolution: 'local_wins',
                timestamp: now,
              });
            }
          } else {
            // New workout - insert
            const id = `hw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            await trxExecute(
              trx,
              `INSERT INTO health_workouts
               (id, user_id, external_id, workout_type, start_time, end_time,
                calories_burned, distance_meters, avg_heart_rate, max_heart_rate, min_heart_rate,
                steps, elevation_gain_meters, source, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
              [
                id, userId, externalId, workout.type, workout.startTime, workout.endTime,
                workout.calories || null, workout.distance || null,
                workout.avgHeartRate || null, workout.maxHeartRate || null, workout.minHeartRate || null,
                workout.steps || null, workout.elevationGain || null, provider
              ]
            );
            counts.workouts++;
          }
        }
      }

      // Sync activity
      if (payload.activity?.length) {
        for (const activity of payload.activity) {
          // Check for existing activity on same date
          const existing = await trxQuery<{ id: string; steps: number | null }>(
            trx,
            `SELECT id, steps FROM health_activity WHERE user_id = $1 AND date = $2 AND source = $3`,
            [userId, activity.date, provider]
          );

          if (existing) {
            // Update with newer/higher values (merge strategy for activity)
            await trxExecute(
              trx,
              `UPDATE health_activity SET
                 steps = GREATEST(COALESCE(steps, 0), COALESCE($1::int, 0)),
                 active_calories = GREATEST(COALESCE(active_calories, 0), COALESCE($2::int, 0)),
                 total_calories = GREATEST(COALESCE(total_calories, 0), COALESCE($3::int, 0)),
                 move_minutes = GREATEST(COALESCE(move_minutes, 0), COALESCE($4::int, 0)),
                 exercise_minutes = GREATEST(COALESCE(exercise_minutes, 0), COALESCE($5::int, 0)),
                 stand_hours = GREATEST(COALESCE(stand_hours, 0), COALESCE($6::int, 0)),
                 distance_meters = GREATEST(COALESCE(distance_meters, 0), COALESCE($7::numeric, 0)),
                 floors_climbed = GREATEST(COALESCE(floors_climbed, 0), COALESCE($8::int, 0)),
                 updated_at = NOW()
               WHERE id = $9`,
              [
                activity.steps, activity.activeCalories, activity.totalCalories,
                activity.moveMinutes, activity.exerciseMinutes, activity.standHours,
                activity.distanceMeters, activity.floorsClimbed, existing.id
              ]
            );

            conflicts.push({
              type: 'activity',
              localId: existing.id,
              resolution: 'merged',
              timestamp: now,
            });
          } else {
            await trxExecute(
              trx,
              `INSERT INTO health_activity
               (user_id, date, steps, active_calories, total_calories, move_minutes,
                exercise_minutes, stand_hours, distance_meters, floors_climbed, source, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
              [
                userId, activity.date, activity.steps || 0, activity.activeCalories || 0,
                activity.totalCalories || 0, activity.moveMinutes || 0,
                activity.exerciseMinutes || 0, activity.standHours || 0,
                activity.distanceMeters || 0, activity.floorsClimbed || 0, provider
              ]
            );
            counts.activity++;
          }
        }
      }

      // Sync sleep
      if (payload.sleep?.length) {
        for (const sleep of payload.sleep) {
          // Check for overlapping sleep records
          const existing = await trxQuery<{ id: string }>(
            trx,
            `SELECT id FROM health_sleep
             WHERE user_id = $1 AND source = $2
             AND ((start_time <= $3::timestamptz AND end_time >= $3::timestamptz) OR (start_time <= $4::timestamptz AND end_time >= $4::timestamptz))`,
            [userId, provider, sleep.startTime, sleep.endTime]
          );

          if (!existing) {
            const sleepDate = new Date(sleep.startTime).toISOString().split('T')[0];
            await trxExecute(
              trx,
              `INSERT INTO health_sleep
               (user_id, date, start_time, end_time, awake_minutes, light_minutes,
                deep_minutes, rem_minutes, sleep_score, source, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
              [
                userId, sleepDate, sleep.startTime, sleep.endTime,
                sleep.sleepStages?.awake || 0, sleep.sleepStages?.light || 0,
                sleep.sleepStages?.deep || 0, sleep.sleepStages?.rem || 0,
                sleep.sleepScore || null, provider
              ]
            );
            counts.sleep++;
          }
        }
      }

      // Sync body measurements
      if (payload.bodyMeasurements?.length) {
        for (const measurement of payload.bodyMeasurements) {
          await syncBodyMeasurement(trx, userId, measurement, provider);
          counts.bodyMeasurements++;
        }
      }
    });

    // Update last sync time and clear error
    await execute(
      `UPDATE wearable_connections SET last_sync_at = $1, sync_error = NULL, updated_at = NOW()
       WHERE user_id = $2 AND provider = $3`,
      [now, userId, provider]
    );

    return { synced: counts, conflicts, lastSyncAt: now };
  } catch (error) {
    // Mark sync as failed
    const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
    await updateSyncStatus(userId, provider, 'error', errorMessage);
    throw error;
  }
}

/**
 * Sync a single body measurement to the body_measurements table
 */
async function syncBodyMeasurement(
  trx: PoolClient,
  userId: string,
  measurement: BodyMeasurementSample,
  provider: WearableProvider
): Promise<void> {
  const measurementDate = new Date(measurement.measuredAt).toISOString().split('T')[0];

  // Convert to appropriate column based on type
  const columnMap: Record<string, { column: string; convertValue: (v: number, u: string) => number }> = {
    weight: {
      column: 'weight_kg',
      convertValue: (v, u) => u === 'lb' ? v * 0.453592 : v
    },
    body_fat: {
      column: 'body_fat_percentage',
      convertValue: (v) => v
    },
    lean_mass: {
      column: 'lean_mass_kg',
      convertValue: (v, u) => u === 'lb' ? v * 0.453592 : v
    },
  };

  const config = columnMap[measurement.type];
  if (!config) return;

  const value = config.convertValue(measurement.value, measurement.unit);

  // Check if measurement exists for this date
  const existing = await trxQuery<{ id: string }>(
    trx,
    `SELECT id FROM body_measurements WHERE user_id = $1 AND measurement_date = $2`,
    [userId, measurementDate]
  );

  if (existing) {
    // Update existing measurement
    await trxExecute(
      trx,
      `UPDATE body_measurements SET ${config.column} = $1, measurement_source = $2, updated_at = NOW()
       WHERE id = $3`,
      [value, provider, existing.id]
    );
  } else {
    // Insert new measurement
    await trxExecute(
      trx,
      `INSERT INTO body_measurements (user_id, ${config.column}, measurement_source, measurement_date, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, value, provider, measurementDate]
    );
  }
}

/**
 * Resolve conflict between local and remote data
 */
function resolveConflict(
  strategy: string,
  local: { start_time?: string; calories_burned?: number | null },
  remote: { startTime?: string; calories?: number }
): boolean {
  switch (strategy) {
    case 'remote_wins':
      return true;
    case 'local_wins':
      return false;
    case 'newest_wins':
      if (local.start_time && remote.startTime) {
        return new Date(remote.startTime) > new Date(local.start_time);
      }
      return false;
    case 'merge':
      // For merge, we update if remote has more data
      return (remote.calories || 0) > (local.calories_burned || 0);
    default:
      return false;
  }
}

/**
 * Get workouts from MuscleMap to push to wearable
 */
export async function getWorkoutsForExport(
  userId: string,
  options: { startDate?: string; endDate?: string; limit?: number } = {}
): Promise<WorkoutSample[]> {
  const { startDate, endDate, limit = 50 } = options;
  const params: unknown[] = [userId];
  let conditions = 'WHERE user_id = $1';
  let paramIndex = 2;

  if (startDate) {
    conditions += ` AND start_time >= $${paramIndex++}`;
    params.push(startDate);
  }
  if (endDate) {
    conditions += ` AND end_time <= $${paramIndex++}`;
    params.push(endDate);
  }

  params.push(limit);

  const rows = await queryAll<{
    id: string;
    workout_type: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    calories_burned: number | null;
    distance_meters: number | null;
    avg_heart_rate: number | null;
    max_heart_rate: number | null;
    source: string;
  }>(
    `SELECT id, workout_type, start_time, end_time, duration_minutes,
            calories_burned, distance_meters, avg_heart_rate, max_heart_rate, source
     FROM health_workouts ${conditions}
     ORDER BY start_time DESC LIMIT $${paramIndex}`,
    params
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.workout_type,
    startTime: row.start_time,
    endTime: row.end_time,
    duration: (row.duration_minutes || 0) * 60,
    calories: row.calories_burned ?? undefined,
    distance: row.distance_meters ?? undefined,
    avgHeartRate: row.avg_heart_rate ?? undefined,
    maxHeartRate: row.max_heart_rate ?? undefined,
    source: row.source as WearableProvider,
  }));
}

/**
 * Get health summary for a user
 */
export async function getHealthSummary(userId: string): Promise<HealthSummary> {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Today's activity
  const todayActivity = await queryOne<{ steps: string | null; calories: string | null }>(
    `SELECT SUM(steps) as steps, SUM(active_calories) as calories
     FROM health_activity WHERE user_id = $1 AND date = $2`,
    [userId, today]
  );

  // Today's average heart rate
  const todayHR = await queryOne<{ avg_bpm: string | null }>(
    `SELECT AVG(bpm) as avg_bpm FROM health_heart_rate
     WHERE user_id = $1 AND timestamp >= $2`,
    [userId, today]
  );

  // Today's workout minutes
  const todayWorkouts = await queryOne<{ minutes: string | null }>(
    `SELECT SUM(duration_minutes) as minutes FROM health_workouts
     WHERE user_id = $1 AND DATE(start_time) = $2`,
    [userId, today]
  );

  // Last night's sleep
  const lastSleep = await queryOne<{ total_minutes: number | null }>(
    `SELECT total_minutes FROM health_sleep
     WHERE user_id = $1 ORDER BY end_time DESC LIMIT 1`,
    [userId]
  );

  // Week stats
  const weekActivity = await queryOne<{ total: string | null; days: string | null }>(
    `SELECT SUM(steps) as total, COUNT(DISTINCT date) as days
     FROM health_activity WHERE user_id = $1 AND date >= $2`,
    [userId, weekAgo]
  );

  const weekWorkouts = await queryOne<{ minutes: string | null }>(
    `SELECT SUM(duration_minutes) as minutes FROM health_workouts
     WHERE user_id = $1 AND DATE(start_time) >= $2`,
    [userId, weekAgo]
  );

  const weekSleep = await queryOne<{ avg_hours: string | null }>(
    `SELECT AVG(total_minutes) / 60.0 as avg_hours FROM health_sleep
     WHERE user_id = $1 AND date >= $2`,
    [userId, weekAgo]
  );

  const weekRestingHR = await queryOne<{ avg: string | null }>(
    `SELECT AVG(bpm) as avg FROM health_heart_rate
     WHERE user_id = $1 AND timestamp >= $2 AND context = 'resting'`,
    [userId, weekAgo]
  );

  const connections = await getConnections(userId);
  const syncStatus = await getSyncStatus(userId);

  return {
    today: {
      steps: parseInt(todayActivity?.steps || '0', 10),
      activeCalories: parseInt(todayActivity?.calories || '0', 10),
      avgHeartRate: todayHR?.avg_bpm ? Math.round(parseFloat(todayHR.avg_bpm)) : null,
      workoutMinutes: Math.round(parseFloat(todayWorkouts?.minutes || '0')),
      sleepHours: lastSleep?.total_minutes ? Math.round(lastSleep.total_minutes / 60 * 10) / 10 : null,
    },
    thisWeek: {
      totalSteps: parseInt(weekActivity?.total || '0', 10),
      avgDailySteps: weekActivity?.days ? Math.round(parseInt(weekActivity.total || '0', 10) / parseInt(weekActivity.days, 10)) : 0,
      totalWorkoutMinutes: Math.round(parseFloat(weekWorkouts?.minutes || '0')),
      avgSleepHours: weekSleep?.avg_hours ? Math.round(parseFloat(weekSleep.avg_hours) * 10) / 10 : null,
      avgRestingHeartRate: weekRestingHR?.avg ? Math.round(parseFloat(weekRestingHR.avg)) : null,
    },
    connections,
    syncStatus,
  };
}

/**
 * Get recent workouts from wearables
 */
export async function getRecentWearableWorkouts(userId: string, limit = 10): Promise<WorkoutSample[]> {
  const rows = await queryAll<{
    id: string;
    workout_type: string;
    start_time: string;
    end_time: string;
    duration_minutes: number | null;
    calories_burned: number | null;
    distance_meters: number | null;
    avg_heart_rate: number | null;
    max_heart_rate: number | null;
    source: string;
  }>(
    `SELECT id, workout_type, start_time, end_time, duration_minutes,
            calories_burned, distance_meters, avg_heart_rate, max_heart_rate, source
     FROM health_workouts WHERE user_id = $1 ORDER BY start_time DESC LIMIT $2`,
    [userId, limit]
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.workout_type,
    startTime: row.start_time,
    endTime: row.end_time,
    duration: (row.duration_minutes || 0) * 60,
    calories: row.calories_burned ?? undefined,
    distance: row.distance_meters ?? undefined,
    avgHeartRate: row.avg_heart_rate ?? undefined,
    maxHeartRate: row.max_heart_rate ?? undefined,
    source: row.source as WearableProvider,
  }));
}
