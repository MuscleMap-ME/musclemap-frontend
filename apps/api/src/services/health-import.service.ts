/**
 * Health Import Service
 *
 * Handles importing workouts and activities from external sources:
 * - Apple Health (via file export or iOS companion app)
 * - Google Fit
 * - Strava
 * - Garmin
 * - Other fitness platforms
 *
 * Converts imported activities to workout sessions and awards credits for reps.
 */

import crypto from 'crypto';
import { queryOne, queryAll, serializableTransaction } from '../db/client';
import { creditService } from '../modules/economy/credit.service';
import { ValidationError } from '../lib/errors';
import { loggers } from '../lib/logger';

const log = loggers.core;

// Import sources
export enum ImportSource {
  APPLE_HEALTH = 'apple_health',
  GOOGLE_FIT = 'google_fit',
  STRAVA = 'strava',
  GARMIN = 'garmin',
  FITBIT = 'fitbit',
  MANUAL = 'manual',
}

// Activity types we recognize
export enum ActivityType {
  STRENGTH_TRAINING = 'strength_training',
  RUNNING = 'running',
  CYCLING = 'cycling',
  SWIMMING = 'swimming',
  HIIT = 'hiit',
  YOGA = 'yoga',
  WALKING = 'walking',
  HIKING = 'hiking',
  OTHER = 'other',
}

// Workout session sources
export enum SessionSource {
  APP = 0,
  APPLE_HEALTH = 1,
  GOOGLE_FIT = 2,
  STRAVA = 3,
  GARMIN = 4,
  FITBIT = 5,
  IMPORT = 6,
}

interface ImportedActivity {
  id: string;
  userId: string;
  source: ImportSource;
  sourceId?: string;
  activityType: ActivityType;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;
  distanceMeters?: number;
  caloriesBurned?: number;
  heartRateAvg?: number;
  heartRateMax?: number;
  stepsCount?: number;
  elevationGainMeters?: number;
  rawData?: Record<string, unknown>;
  processed: boolean;
  sessionId?: string;
  errorMessage?: string;
  createdAt: Date;
}

interface AppleHealthWorkout {
  workoutActivityType: string;
  startDate: string;
  endDate: string;
  duration?: number;
  totalDistance?: number;
  totalEnergyBurned?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  metadata?: Record<string, unknown>;
}

interface AppleHealthExport {
  workouts: AppleHealthWorkout[];
  // Could also include: steps, heart rate samples, etc.
}

interface ProcessResult {
  imported: number;
  skipped: number;
  failed: number;
  creditsAwarded: number;
  errors: string[];
}

/**
 * Map Apple Health activity types to our activity types
 */
function mapAppleActivityType(appleType: string): ActivityType {
  const mapping: Record<string, ActivityType> = {
    HKWorkoutActivityTypeTraditionalStrengthTraining: ActivityType.STRENGTH_TRAINING,
    HKWorkoutActivityTypeFunctionalStrengthTraining: ActivityType.STRENGTH_TRAINING,
    HKWorkoutActivityTypeRunning: ActivityType.RUNNING,
    HKWorkoutActivityTypeCycling: ActivityType.CYCLING,
    HKWorkoutActivityTypeSwimming: ActivityType.SWIMMING,
    HKWorkoutActivityTypeHighIntensityIntervalTraining: ActivityType.HIIT,
    HKWorkoutActivityTypeYoga: ActivityType.YOGA,
    HKWorkoutActivityTypeWalking: ActivityType.WALKING,
    HKWorkoutActivityTypeHiking: ActivityType.HIKING,
  };

  return mapping[appleType] || ActivityType.OTHER;
}

/**
 * Map import source to session source
 */
function mapSessionSource(importSource: ImportSource): SessionSource {
  const mapping: Record<ImportSource, SessionSource> = {
    [ImportSource.APPLE_HEALTH]: SessionSource.APPLE_HEALTH,
    [ImportSource.GOOGLE_FIT]: SessionSource.GOOGLE_FIT,
    [ImportSource.STRAVA]: SessionSource.STRAVA,
    [ImportSource.GARMIN]: SessionSource.GARMIN,
    [ImportSource.FITBIT]: SessionSource.FITBIT,
    [ImportSource.MANUAL]: SessionSource.IMPORT,
  };

  return mapping[importSource] || SessionSource.IMPORT;
}

/**
 * Estimate reps from strength training duration
 * Assumes ~30 seconds per set, 3 sets per exercise, 8 reps per set
 */
function estimateRepsFromDuration(durationSeconds: number): number {
  const setsEstimate = Math.floor(durationSeconds / 30);
  const repsPerSet = 8;
  return Math.min(setsEstimate * repsPerSet, 500); // Cap at 500 reps
}

export const healthImportService = {
  /**
   * Import Apple Health export data
   */
  async importAppleHealth(userId: string, data: AppleHealthExport): Promise<ProcessResult> {
    const result: ProcessResult = {
      imported: 0,
      skipped: 0,
      failed: 0,
      creditsAwarded: 0,
      errors: [],
    };

    if (!data.workouts || !Array.isArray(data.workouts)) {
      throw new ValidationError('Invalid Apple Health export format');
    }

    for (const workout of data.workouts) {
      try {
        // Generate source ID for deduplication
        const sourceId = crypto
          .createHash('sha256')
          .update(`${workout.workoutActivityType}:${workout.startDate}:${workout.endDate}`)
          .digest('hex')
          .slice(0, 32);

        // Check for duplicate
        const existing = await queryOne<{ id: string }>(
          'SELECT id FROM imported_activities WHERE source = $1 AND source_id = $2',
          [ImportSource.APPLE_HEALTH, sourceId]
        );

        if (existing) {
          result.skipped++;
          continue;
        }

        // Parse dates
        const startedAt = new Date(workout.startDate);
        const endedAt = workout.endDate ? new Date(workout.endDate) : undefined;

        // Calculate duration
        const durationSeconds = workout.duration ||
          (endedAt ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000) : undefined);

        // Map activity type
        const activityType = mapAppleActivityType(workout.workoutActivityType);

        // Insert imported activity
        const row = await queryOne<{ id: string }>(
          `INSERT INTO imported_activities (
            user_id, source, source_id, activity_type, started_at, ended_at,
            duration_seconds, distance_meters, calories_burned, heart_rate_avg, heart_rate_max, raw_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id`,
          [
            userId,
            ImportSource.APPLE_HEALTH,
            sourceId,
            activityType,
            startedAt,
            endedAt,
            durationSeconds,
            workout.totalDistance,
            workout.totalEnergyBurned,
            workout.averageHeartRate,
            workout.maxHeartRate,
            JSON.stringify(workout),
          ]
        );

        result.imported++;

        // Process strength training workouts for credit awards
        if (activityType === ActivityType.STRENGTH_TRAINING && durationSeconds) {
          const reps = estimateRepsFromDuration(durationSeconds);
          if (reps > 0) {
            try {
              await this.processActivity(userId, row!.id);
              result.creditsAwarded += reps;
            } catch (error: any) {
              result.errors.push(`Credit award failed for ${row!.id}: ${error.message}`);
            }
          }
        }
      } catch (error: any) {
        result.failed++;
        result.errors.push(error.message);
      }
    }

    log.info({
      userId,
      ...result,
    }, 'Apple Health import completed');

    return result;
  },

  /**
   * Process an imported activity (create session and award credits)
   */
  async processActivity(userId: string, activityId: string): Promise<{
    sessionId: string;
    creditsAwarded: number;
  }> {
    return await serializableTransaction(async (client) => {
      // Get the activity
      const activity = await client.query<{
        id: string;
        activity_type: string;
        started_at: Date;
        ended_at: Date | null;
        duration_seconds: number | null;
        calories_burned: number | null;
        processed: boolean;
        source: string;
      }>(
        'SELECT * FROM imported_activities WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [activityId, userId]
      );

      if (activity.rows.length === 0) {
        throw new ValidationError('Activity not found');
      }

      if (activity.rows[0].processed) {
        throw new ValidationError('Activity already processed');
      }

      const act = activity.rows[0];

      // Create workout session
      const sessionId = `sess_${crypto.randomBytes(12).toString('hex')}`;
      const source = mapSessionSource(act.source as ImportSource);

      await client.query(
        `INSERT INTO workout_sessions (id, user_id, started_at, ended_at, source, source_ref, total_duration_seconds)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [sessionId, userId, act.started_at, act.ended_at, source, activityId, act.duration_seconds]
      );

      // Calculate reps for strength training
      let creditsAwarded = 0;
      if (act.activity_type === ActivityType.STRENGTH_TRAINING && act.duration_seconds) {
        const reps = estimateRepsFromDuration(act.duration_seconds);
        if (reps > 0) {
          // Create a rep event
          const repEventId = `rep_${crypto.randomBytes(12).toString('hex')}`;

          await client.query(
            `INSERT INTO rep_events (id, session_id, user_id, exercise_id, set_number, rep_count, credited)
             VALUES ($1, $2, $3, 'imported', 1, $4, TRUE)`,
            [repEventId, sessionId, userId, reps]
          );

          // Award credits (1 per rep)
          try {
            await creditService.awardForReps(userId, repEventId, reps);
            creditsAwarded = reps;
          } catch (error) {
            log.warn({ userId, activityId, reps, error }, 'Failed to award credits for imported activity');
          }
        }
      }

      // Mark as processed
      await client.query(
        'UPDATE imported_activities SET processed = TRUE, session_id = $1 WHERE id = $2',
        [sessionId, activityId]
      );

      log.info({
        userId,
        activityId,
        sessionId,
        creditsAwarded,
      }, 'Imported activity processed');

      return { sessionId, creditsAwarded };
    });
  },

  /**
   * Get imported activities for a user
   */
  async getActivities(
    userId: string,
    options: { limit?: number; offset?: number; source?: ImportSource; processed?: boolean } = {}
  ): Promise<{ activities: ImportedActivity[]; total: number }> {
    const { limit = 50, offset = 0, source, processed } = options;

    let whereClause = 'WHERE user_id = $1';
    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (source !== undefined) {
      whereClause += ` AND source = $${paramIndex++}`;
      params.push(source);
    }

    if (processed !== undefined) {
      whereClause += ` AND processed = $${paramIndex++}`;
      params.push(processed);
    }

    params.push(limit, offset);

    const rows = await queryAll<{
      id: string;
      user_id: string;
      source: string;
      source_id: string | null;
      activity_type: string;
      started_at: Date;
      ended_at: Date | null;
      duration_seconds: number | null;
      distance_meters: number | null;
      calories_burned: number | null;
      heart_rate_avg: number | null;
      heart_rate_max: number | null;
      steps_count: number | null;
      elevation_gain_meters: number | null;
      raw_data: string | null;
      processed: boolean;
      session_id: string | null;
      error_message: string | null;
      created_at: Date;
    }>(
      `SELECT * FROM imported_activities ${whereClause}
       ORDER BY started_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    const countParams = params.slice(0, -2); // Remove limit and offset
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM imported_activities ${whereClause}`,
      countParams
    );

    return {
      activities: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        source: r.source as ImportSource,
        sourceId: r.source_id ?? undefined,
        activityType: r.activity_type as ActivityType,
        startedAt: r.started_at,
        endedAt: r.ended_at ?? undefined,
        durationSeconds: r.duration_seconds ?? undefined,
        distanceMeters: r.distance_meters ?? undefined,
        caloriesBurned: r.calories_burned ?? undefined,
        heartRateAvg: r.heart_rate_avg ?? undefined,
        heartRateMax: r.heart_rate_max ?? undefined,
        stepsCount: r.steps_count ?? undefined,
        elevationGainMeters: r.elevation_gain_meters ?? undefined,
        rawData: r.raw_data ? JSON.parse(r.raw_data) : undefined,
        processed: r.processed,
        sessionId: r.session_id ?? undefined,
        errorMessage: r.error_message ?? undefined,
        createdAt: r.created_at,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  /**
   * Get unprocessed activities
   */
  async getUnprocessed(limit: number = 100): Promise<string[]> {
    const rows = await queryAll<{ id: string }>(
      'SELECT id FROM imported_activities WHERE processed = FALSE ORDER BY created_at LIMIT $1',
      [limit]
    );

    return rows.map((r) => r.id);
  },

  /**
   * Get import stats for a user
   */
  async getStats(userId: string): Promise<{
    totalImported: number;
    totalProcessed: number;
    totalCreditsAwarded: number;
    bySource: Record<string, number>;
    byActivityType: Record<string, number>;
  }> {
    const basic = await queryOne<{
      total_imported: string;
      total_processed: string;
    }>(
      `SELECT
        COUNT(*) as total_imported,
        COUNT(*) FILTER (WHERE processed) as total_processed
       FROM imported_activities WHERE user_id = $1`,
      [userId]
    );

    const bySource = await queryAll<{ source: string; count: string }>(
      `SELECT source, COUNT(*) as count FROM imported_activities WHERE user_id = $1 GROUP BY source`,
      [userId]
    );

    const byType = await queryAll<{ activity_type: string; count: string }>(
      `SELECT activity_type, COUNT(*) as count FROM imported_activities WHERE user_id = $1 GROUP BY activity_type`,
      [userId]
    );

    // Get credits from imported sessions
    const credits = await queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(re.rep_count), 0) as total
       FROM rep_events re
       JOIN workout_sessions ws ON ws.id = re.session_id
       WHERE ws.user_id = $1 AND ws.source >= $2`,
      [userId, SessionSource.APPLE_HEALTH]
    );

    return {
      totalImported: parseInt(basic?.total_imported || '0', 10),
      totalProcessed: parseInt(basic?.total_processed || '0', 10),
      totalCreditsAwarded: parseInt(credits?.total || '0', 10),
      bySource: Object.fromEntries(bySource.map((r) => [r.source, parseInt(r.count, 10)])),
      byActivityType: Object.fromEntries(byType.map((r) => [r.activity_type, parseInt(r.count, 10)])),
    };
  },
};
