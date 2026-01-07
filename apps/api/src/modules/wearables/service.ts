/**
 * Wearables Service
 *
 * Business logic for wearable device integrations and health data.
 */
import { queryOne, queryAll, execute } from '../../db/client';
import type {
  WearableConnection,
  WearableProvider,
  HealthSyncPayload,
  HealthSummary,
  WorkoutSample,
} from './types';

/**
 * Get user's wearable connections
 */
export async function getConnections(userId: string): Promise<WearableConnection[]> {
  const rows = await queryAll<{
    id: string;
    user_id: string;
    provider: string;
    provider_user_id: string | null;
    is_active: number;
    last_sync_at: string | null;
    created_at: string;
  }>(
    `SELECT * FROM wearable_connections WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    provider: row.provider as WearableProvider,
    providerUserId: row.provider_user_id ?? undefined,
    isActive: Boolean(row.is_active),
    lastSyncAt: row.last_sync_at ?? null,
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
    `INSERT INTO wearable_connections (id, user_id, provider, provider_user_id, access_token, refresh_token, token_expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT(user_id, provider) DO UPDATE SET
       provider_user_id = EXCLUDED.provider_user_id,
       access_token = EXCLUDED.access_token,
       refresh_token = EXCLUDED.refresh_token,
       token_expires_at = EXCLUDED.token_expires_at,
       is_active = 1`,
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
    createdAt: now,
  };
}

/**
 * Disconnect a wearable provider
 */
export async function disconnectProvider(userId: string, provider: WearableProvider): Promise<void> {
  await execute(
    `UPDATE wearable_connections SET is_active = 0 WHERE user_id = $1 AND provider = $2`,
    [userId, provider]
  );
}

/**
 * Sync health data from a wearable
 */
export async function syncHealthData(
  userId: string,
  provider: WearableProvider,
  payload: HealthSyncPayload
): Promise<{ synced: { heartRate: number; workouts: number; activity: number; sleep: number } }> {
  const counts = { heartRate: 0, workouts: 0, activity: 0, sleep: 0 };

  // Sync heart rate samples
  if (payload.heartRate?.length) {
    for (const sample of payload.heartRate) {
      await execute(
        `INSERT INTO health_heart_rate (user_id, timestamp, bpm, source) VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [userId, sample.timestamp, sample.bpm, provider]
      );
      counts.heartRate++;
    }
  }

  // Sync workouts
  if (payload.workouts?.length) {
    for (const workout of payload.workouts) {
      await execute(
        `INSERT INTO health_workouts
         (id, user_id, type, start_time, end_time, duration, calories, distance, avg_heart_rate, max_heart_rate, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           type = EXCLUDED.type,
           start_time = EXCLUDED.start_time,
           end_time = EXCLUDED.end_time,
           duration = EXCLUDED.duration,
           calories = EXCLUDED.calories,
           distance = EXCLUDED.distance,
           avg_heart_rate = EXCLUDED.avg_heart_rate,
           max_heart_rate = EXCLUDED.max_heart_rate,
           source = EXCLUDED.source`,
        [
          workout.id,
          userId,
          workout.type,
          workout.startTime,
          workout.endTime,
          workout.duration,
          workout.calories || null,
          workout.distance || null,
          workout.avgHeartRate || null,
          workout.maxHeartRate || null,
          provider
        ]
      );
      counts.workouts++;
    }
  }

  // Sync activity
  if (payload.activity?.length) {
    for (const activity of payload.activity) {
      await execute(
        `INSERT INTO health_activity
         (user_id, date, steps, active_calories, total_calories, move_minutes, stand_hours, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT(user_id, date, source) DO UPDATE SET
           steps = EXCLUDED.steps,
           active_calories = EXCLUDED.active_calories,
           total_calories = EXCLUDED.total_calories,
           move_minutes = EXCLUDED.move_minutes,
           stand_hours = EXCLUDED.stand_hours`,
        [
          userId,
          activity.date,
          activity.steps || null,
          activity.activeCalories || null,
          activity.totalCalories || null,
          activity.moveMinutes || null,
          activity.standHours || null,
          provider
        ]
      );
      counts.activity++;
    }
  }

  // Sync sleep
  if (payload.sleep?.length) {
    for (const sleep of payload.sleep) {
      await execute(
        `INSERT INTO health_sleep
         (user_id, start_time, end_time, duration, awake_minutes, light_minutes, deep_minutes, rem_minutes, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId,
          sleep.startTime,
          sleep.endTime,
          sleep.duration,
          sleep.sleepStages?.awake || null,
          sleep.sleepStages?.light || null,
          sleep.sleepStages?.deep || null,
          sleep.sleepStages?.rem || null,
          provider
        ]
      );
      counts.sleep++;
    }
  }

  // Update last sync time
  await execute(
    `UPDATE wearable_connections SET last_sync_at = $1 WHERE user_id = $2 AND provider = $3`,
    [new Date().toISOString(), userId, provider]
  );

  return { synced: counts };
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
    `SELECT SUM(duration) / 60 as minutes FROM health_workouts
     WHERE user_id = $1 AND DATE(start_time) = $2`,
    [userId, today]
  );

  // Last night's sleep
  const lastSleep = await queryOne<{ duration: number | null }>(
    `SELECT duration FROM health_sleep
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
    `SELECT SUM(duration) / 60 as minutes FROM health_workouts
     WHERE user_id = $1 AND DATE(start_time) >= $2`,
    [userId, weekAgo]
  );

  const weekSleep = await queryOne<{ avg_hours: string | null }>(
    `SELECT AVG(duration) / 60 as avg_hours FROM health_sleep
     WHERE user_id = $1 AND DATE(start_time) >= $2`,
    [userId, weekAgo]
  );

  const weekRestingHR = await queryOne<{ avg: string | null }>(
    `SELECT AVG(bpm) as avg FROM health_heart_rate
     WHERE user_id = $1 AND timestamp >= $2 AND bpm < 80`,
    [userId, weekAgo]
  );

  const connections = await getConnections(userId);

  return {
    today: {
      steps: parseInt(todayActivity?.steps || '0', 10),
      activeCalories: parseInt(todayActivity?.calories || '0', 10),
      avgHeartRate: todayHR?.avg_bpm ? Math.round(parseFloat(todayHR.avg_bpm)) : null,
      workoutMinutes: Math.round(parseFloat(todayWorkouts?.minutes || '0')),
      sleepHours: lastSleep?.duration ? Math.round(lastSleep.duration / 60 * 10) / 10 : null,
    },
    thisWeek: {
      totalSteps: parseInt(weekActivity?.total || '0', 10),
      avgDailySteps: weekActivity?.days ? Math.round(parseInt(weekActivity.total || '0', 10) / parseInt(weekActivity.days, 10)) : 0,
      totalWorkoutMinutes: Math.round(parseFloat(weekWorkouts?.minutes || '0')),
      avgSleepHours: weekSleep?.avg_hours ? Math.round(parseFloat(weekSleep.avg_hours) * 10) / 10 : null,
      avgRestingHeartRate: weekRestingHR?.avg ? Math.round(parseFloat(weekRestingHR.avg)) : null,
    },
    connections,
  };
}

/**
 * Get recent workouts from wearables
 */
export async function getRecentWearableWorkouts(userId: string, limit = 10): Promise<WorkoutSample[]> {
  const rows = await queryAll<{
    id: string;
    type: string;
    start_time: string;
    end_time: string;
    duration: number;
    calories: number | null;
    distance: number | null;
    avg_heart_rate: number | null;
    max_heart_rate: number | null;
    source: string;
  }>(
    `SELECT * FROM health_workouts WHERE user_id = $1 ORDER BY start_time DESC LIMIT $2`,
    [userId, limit]
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    startTime: row.start_time,
    endTime: row.end_time,
    duration: row.duration,
    calories: row.calories ?? undefined,
    distance: row.distance ?? undefined,
    avgHeartRate: row.avg_heart_rate ?? undefined,
    maxHeartRate: row.max_heart_rate ?? undefined,
    source: row.source as WearableProvider,
  }));
}
