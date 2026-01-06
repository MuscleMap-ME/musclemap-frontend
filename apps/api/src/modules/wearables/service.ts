/**
 * Wearables Service
 *
 * Business logic for wearable device integrations and health data.
 */
import { db } from '../../db';
import type {
  WearableConnection,
  WearableProvider,
  HealthSyncPayload,
  HealthSummary,
  HeartRateSample,
  WorkoutSample,
  ActivitySample,
  SleepSample,
} from './types';

/**
 * Initialize wearables database tables
 */
export function initWearablesTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wearable_connections (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_user_id TEXT,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at TEXT,
      is_active INTEGER DEFAULT 1,
      last_sync_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, provider)
    );

    CREATE TABLE IF NOT EXISTS health_heart_rate (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      bpm INTEGER NOT NULL,
      source TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS health_workouts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration INTEGER NOT NULL,
      calories INTEGER,
      distance REAL,
      avg_heart_rate INTEGER,
      max_heart_rate INTEGER,
      source TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS health_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      steps INTEGER,
      active_calories INTEGER,
      total_calories INTEGER,
      move_minutes INTEGER,
      stand_hours INTEGER,
      source TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, date, source)
    );

    CREATE TABLE IF NOT EXISTS health_sleep (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration INTEGER NOT NULL,
      awake_minutes INTEGER,
      light_minutes INTEGER,
      deep_minutes INTEGER,
      rem_minutes INTEGER,
      source TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_health_hr_user ON health_heart_rate(user_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_health_workouts_user ON health_workouts(user_id, start_time);
    CREATE INDEX IF NOT EXISTS idx_health_activity_user ON health_activity(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_health_sleep_user ON health_sleep(user_id, start_time);
  `);
}

/**
 * Get user's wearable connections
 */
export function getConnections(userId: string): WearableConnection[] {
  const rows = db
    .prepare(
      `SELECT * FROM wearable_connections WHERE user_id = ? ORDER BY created_at DESC`
    )
    .all(userId) as any[];

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    provider: row.provider as WearableProvider,
    providerUserId: row.provider_user_id,
    isActive: Boolean(row.is_active),
    lastSyncAt: row.last_sync_at,
    createdAt: row.created_at,
  }));
}

/**
 * Create or update a wearable connection
 */
export function upsertConnection(
  userId: string,
  provider: WearableProvider,
  data: {
    providerUserId?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: string;
  }
): WearableConnection {
  const id = `wc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO wearable_connections (id, user_id, provider, provider_user_id, access_token, refresh_token, token_expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, provider) DO UPDATE SET
       provider_user_id = excluded.provider_user_id,
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       token_expires_at = excluded.token_expires_at,
       is_active = 1`
  ).run(
    id,
    userId,
    provider,
    data.providerUserId || null,
    data.accessToken || null,
    data.refreshToken || null,
    data.tokenExpiresAt || null,
    now
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
export function disconnectProvider(userId: string, provider: WearableProvider): void {
  db.prepare(
    `UPDATE wearable_connections SET is_active = 0 WHERE user_id = ? AND provider = ?`
  ).run(userId, provider);
}

/**
 * Sync health data from a wearable
 */
export function syncHealthData(
  userId: string,
  provider: WearableProvider,
  payload: HealthSyncPayload
): { synced: { heartRate: number; workouts: number; activity: number; sleep: number } } {
  const counts = { heartRate: 0, workouts: 0, activity: 0, sleep: 0 };

  // Sync heart rate samples
  if (payload.heartRate?.length) {
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO health_heart_rate (user_id, timestamp, bpm, source) VALUES (?, ?, ?, ?)`
    );
    for (const sample of payload.heartRate) {
      stmt.run(userId, sample.timestamp, sample.bpm, provider);
      counts.heartRate++;
    }
  }

  // Sync workouts
  if (payload.workouts?.length) {
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO health_workouts
       (id, user_id, type, start_time, end_time, duration, calories, distance, avg_heart_rate, max_heart_rate, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const workout of payload.workouts) {
      stmt.run(
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
      );
      counts.workouts++;
    }
  }

  // Sync activity
  if (payload.activity?.length) {
    const stmt = db.prepare(
      `INSERT INTO health_activity
       (user_id, date, steps, active_calories, total_calories, move_minutes, stand_hours, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, date, source) DO UPDATE SET
         steps = excluded.steps,
         active_calories = excluded.active_calories,
         total_calories = excluded.total_calories,
         move_minutes = excluded.move_minutes,
         stand_hours = excluded.stand_hours`
    );
    for (const activity of payload.activity) {
      stmt.run(
        userId,
        activity.date,
        activity.steps || null,
        activity.activeCalories || null,
        activity.totalCalories || null,
        activity.moveMinutes || null,
        activity.standHours || null,
        provider
      );
      counts.activity++;
    }
  }

  // Sync sleep
  if (payload.sleep?.length) {
    const stmt = db.prepare(
      `INSERT INTO health_sleep
       (user_id, start_time, end_time, duration, awake_minutes, light_minutes, deep_minutes, rem_minutes, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const sleep of payload.sleep) {
      stmt.run(
        userId,
        sleep.startTime,
        sleep.endTime,
        sleep.duration,
        sleep.sleepStages?.awake || null,
        sleep.sleepStages?.light || null,
        sleep.sleepStages?.deep || null,
        sleep.sleepStages?.rem || null,
        provider
      );
      counts.sleep++;
    }
  }

  // Update last sync time
  db.prepare(
    `UPDATE wearable_connections SET last_sync_at = ? WHERE user_id = ? AND provider = ?`
  ).run(new Date().toISOString(), userId, provider);

  return { synced: counts };
}

/**
 * Get health summary for a user
 */
export function getHealthSummary(userId: string): HealthSummary {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Today's activity
  const todayActivity = db
    .prepare(
      `SELECT SUM(steps) as steps, SUM(active_calories) as calories
       FROM health_activity WHERE user_id = ? AND date = ?`
    )
    .get(userId, today) as any || { steps: 0, calories: 0 };

  // Today's average heart rate
  const todayHR = db
    .prepare(
      `SELECT AVG(bpm) as avg_bpm FROM health_heart_rate
       WHERE user_id = ? AND timestamp >= ?`
    )
    .get(userId, today) as any;

  // Today's workout minutes
  const todayWorkouts = db
    .prepare(
      `SELECT SUM(duration) / 60 as minutes FROM health_workouts
       WHERE user_id = ? AND DATE(start_time) = ?`
    )
    .get(userId, today) as any || { minutes: 0 };

  // Last night's sleep
  const lastSleep = db
    .prepare(
      `SELECT duration FROM health_sleep
       WHERE user_id = ? ORDER BY end_time DESC LIMIT 1`
    )
    .get(userId) as any;

  // Week stats
  const weekActivity = db
    .prepare(
      `SELECT SUM(steps) as total, COUNT(DISTINCT date) as days
       FROM health_activity WHERE user_id = ? AND date >= ?`
    )
    .get(userId, weekAgo) as any || { total: 0, days: 1 };

  const weekWorkouts = db
    .prepare(
      `SELECT SUM(duration) / 60 as minutes FROM health_workouts
       WHERE user_id = ? AND DATE(start_time) >= ?`
    )
    .get(userId, weekAgo) as any || { minutes: 0 };

  const weekSleep = db
    .prepare(
      `SELECT AVG(duration) / 60 as avg_hours FROM health_sleep
       WHERE user_id = ? AND DATE(start_time) >= ?`
    )
    .get(userId, weekAgo) as any;

  const weekRestingHR = db
    .prepare(
      `SELECT AVG(bpm) as avg FROM health_heart_rate
       WHERE user_id = ? AND timestamp >= ? AND bpm < 80`
    )
    .get(userId, weekAgo) as any;

  const connections = getConnections(userId);

  return {
    today: {
      steps: todayActivity?.steps || 0,
      activeCalories: todayActivity?.calories || 0,
      avgHeartRate: todayHR?.avg_bpm ? Math.round(todayHR.avg_bpm) : null,
      workoutMinutes: Math.round(todayWorkouts?.minutes || 0),
      sleepHours: lastSleep?.duration ? Math.round(lastSleep.duration / 60 * 10) / 10 : null,
    },
    thisWeek: {
      totalSteps: weekActivity?.total || 0,
      avgDailySteps: weekActivity?.days ? Math.round((weekActivity.total || 0) / weekActivity.days) : 0,
      totalWorkoutMinutes: Math.round(weekWorkouts?.minutes || 0),
      avgSleepHours: weekSleep?.avg_hours ? Math.round(weekSleep.avg_hours * 10) / 10 : null,
      avgRestingHeartRate: weekRestingHR?.avg ? Math.round(weekRestingHR.avg) : null,
    },
    connections,
  };
}

/**
 * Get recent workouts from wearables
 */
export function getRecentWearableWorkouts(userId: string, limit = 10): WorkoutSample[] {
  const rows = db
    .prepare(
      `SELECT * FROM health_workouts WHERE user_id = ? ORDER BY start_time DESC LIMIT ?`
    )
    .all(userId, limit) as any[];

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    startTime: row.start_time,
    endTime: row.end_time,
    duration: row.duration,
    calories: row.calories,
    distance: row.distance,
    avgHeartRate: row.avg_heart_rate,
    maxHeartRate: row.max_heart_rate,
    source: row.source as WearableProvider,
  }));
}

// Initialize tables on module load
initWearablesTables();
