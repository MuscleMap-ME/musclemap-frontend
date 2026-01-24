/**
 * Venue Records Service
 *
 * Manages exercise-specific records at venues:
 * - Record claiming (manual and auto-detected from workouts)
 * - Leaderboard management
 * - Verification (video/witness) for top 3 positions
 * - Privacy-aware queries
 */

import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import { getRedis } from '../../lib/redis';
import { achievementService } from '../achievements';

const log = loggers.api;

// ============================================
// TYPES
// ============================================

export type RecordType = 'max_weight' | 'max_reps' | 'fastest_time' | 'max_distance' | 'max_1rm';
export type VerificationStatus = 'unverified' | 'self_verified' | 'witness_verified' | 'video_verified' | 'pending_verification';

export interface VenueExerciseRecord {
  id: string;
  venueId: string;
  exerciseId: string;
  userId: string;
  recordType: RecordType;
  recordValue: number;
  recordUnit: string;
  workoutSessionId?: string;
  setId?: string;
  repsAtWeight?: number;
  weightAtReps?: number;
  verificationStatus: VerificationStatus;
  videoUrl?: string;
  witnessCount: number;
  achievedAt: Date;
  verifiedAt?: Date;
  conditions?: Record<string, unknown>;
  notes?: string;
  previousRecordValue?: number;
  previousRecordHolderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClaimRecordInput {
  venueId: string;
  exerciseId: string;
  recordType: RecordType;
  recordValue: number;
  recordUnit: string;
  repsAtWeight?: number;
  weightAtReps?: number;
  workoutSessionId?: string;
  setId?: string;
  conditions?: Record<string, unknown>;
  notes?: string;
}

export interface RecordClaimResult {
  record: VenueExerciseRecord;
  isNewRecord: boolean;
  isVenueBest: boolean;
  previousValue?: number;
  previousHolderId?: string;
  rank: number;
  requiresVerification: boolean;
  achievements: string[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  value: number;
  unit: string;
  achievedAt: Date;
  verificationStatus: VerificationStatus;
  isCurrentUser: boolean;
}

export interface VenueLeaderboard {
  venueId: string;
  exerciseId: string;
  recordType: RecordType;
  entries: LeaderboardEntry[];
  totalParticipants: number;
  myRank?: number;
  myRecord?: VenueExerciseRecord;
  lastUpdatedAt: Date;
}

// Raw database row type (snake_case)
interface VenueExerciseRecordRow {
  id: string;
  venue_id: string;
  exercise_id: string;
  user_id: string;
  record_type: RecordType;
  record_value: number;
  record_unit: string;
  workout_session_id?: string;
  set_id?: string;
  reps_at_weight?: number;
  weight_at_reps?: number;
  verification_status: VerificationStatus;
  video_url?: string;
  witness_count: number;
  achieved_at: Date;
  verified_at?: Date;
  conditions?: Record<string, unknown>;
  notes?: string;
  previous_record_value?: number;
  previous_record_holder_id?: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// CACHE KEYS
// ============================================

const CACHE_KEYS = {
  leaderboard: (venueId: string, exerciseId: string, recordType: string) =>
    `venue:leaderboard:${venueId}:${exerciseId}:${recordType}`,
  userRecords: (userId: string) => `venue:records:user:${userId}`,
  venueStats: (venueId: string) => `venue:stats:${venueId}`,
};

const CACHE_TTL = {
  LEADERBOARD: 300, // 5 minutes
  USER_RECORDS: 60, // 1 minute
  VENUE_STATS: 300, // 5 minutes
};

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Claim a record at a venue
 */
export async function claimRecord(
  userId: string,
  input: ClaimRecordInput
): Promise<RecordClaimResult> {
  const {
    venueId,
    exerciseId,
    recordType,
    recordValue,
    recordUnit,
    repsAtWeight,
    weightAtReps,
    workoutSessionId,
    setId,
    conditions,
    notes,
  } = input;

  log.info(`User ${userId} claiming ${recordType} record at venue ${venueId} for exercise ${exerciseId}: ${recordValue} ${recordUnit}`);

  // Check user privacy settings - must opt-in to share location records
  const user = await db.queryOne<{ share_location_records: boolean; username: string }>(
    `SELECT share_location_records, username FROM users WHERE id = $1`,
    [userId]
  );

  if (!user?.share_location_records) {
    throw new Error('You must enable "Share location records" in privacy settings to claim venue records');
  }

  // Use database function to check if this is a new record
  const checkResult = await db.queryOne<{
    is_new_record: boolean;
    is_venue_best: boolean;
    previous_value: number | null;
    previous_holder_id: string | null;
    rank_at_venue: number;
  }>(
    `SELECT * FROM check_venue_exercise_record($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [venueId, exerciseId, userId, recordType, recordValue, recordUnit, workoutSessionId, setId, repsAtWeight, weightAtReps]
  );

  if (!checkResult) {
    throw new Error('Failed to check record status');
  }

  const { is_new_record, is_venue_best, previous_value, previous_holder_id, rank_at_venue } = checkResult;

  // If not a new personal record, don't update
  if (!is_new_record) {
    // Return existing record
    const existingRecord = await db.queryOne<VenueExerciseRecordRow>(
      `SELECT * FROM venue_exercise_records
       WHERE venue_id = $1 AND exercise_id = $2 AND user_id = $3 AND record_type = $4`,
      [venueId, exerciseId, userId, recordType]
    );

    if (!existingRecord) {
      throw new Error('Record check inconsistency');
    }

    return {
      record: mapRecordRow(existingRecord),
      isNewRecord: false,
      isVenueBest: false,
      previousValue: existingRecord.record_value,
      rank: rank_at_venue,
      requiresVerification: false,
      achievements: [],
    };
  }

  // Determine verification requirements
  // Top 3 require verification, with 7-day deadline
  const requiresVerification = rank_at_venue <= 3;
  const verificationDeadline = requiresVerification
    ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    : null;

  // Insert or update the record
  const result = await db.queryOne<VenueExerciseRecordRow>(`
    INSERT INTO venue_exercise_records (
      venue_id, exercise_id, user_id, record_type, record_value, record_unit,
      workout_session_id, set_id, reps_at_weight, weight_at_reps,
      verification_status, verification_deadline,
      conditions, notes, previous_record_value, previous_record_holder_id,
      achieved_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
    ON CONFLICT (venue_id, exercise_id, user_id, record_type)
    DO UPDATE SET
      record_value = EXCLUDED.record_value,
      record_unit = EXCLUDED.record_unit,
      workout_session_id = EXCLUDED.workout_session_id,
      set_id = EXCLUDED.set_id,
      reps_at_weight = EXCLUDED.reps_at_weight,
      weight_at_reps = EXCLUDED.weight_at_reps,
      verification_status = EXCLUDED.verification_status,
      verification_deadline = EXCLUDED.verification_deadline,
      conditions = EXCLUDED.conditions,
      notes = EXCLUDED.notes,
      previous_record_value = venue_exercise_records.record_value,
      achieved_at = NOW(),
      updated_at = NOW()
    RETURNING *
  `, [
    venueId, exerciseId, userId, recordType, recordValue, recordUnit,
    workoutSessionId, setId, repsAtWeight, weightAtReps,
    requiresVerification ? 'pending_verification' : 'unverified',
    verificationDeadline,
    conditions ? JSON.stringify(conditions) : null,
    notes,
    previous_value,
    previous_holder_id,
  ]);

  if (!result) {
    throw new Error('Failed to claim record');
  }

  // Invalidate caches
  await invalidateCaches(venueId, exerciseId, recordType, userId);

  // Check for achievements
  const achievements: string[] = [];

  // First venue record achievement
  const recordCount = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM venue_exercise_records WHERE user_id = $1`,
    [userId]
  );

  if (parseInt(recordCount?.count || '0') === 1) {
    try {
      await achievementService.grant({ userId, achievementKey: 'first_venue_exercise_record' });
      achievements.push('first_venue_exercise_record');
    } catch (e) {
      // Already has achievement or doesn't exist
    }
  }

  // Record breaker achievement
  if (is_venue_best && previous_holder_id && previous_holder_id !== userId) {
    try {
      await achievementService.grant({ userId, achievementKey: 'record_breaker_venue', exerciseId });
      achievements.push('record_breaker_venue');
    } catch (e) {
      // Already has achievement
    }
  }

  // Venue regular (10 records at same venue)
  const venueRecordCount = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM venue_exercise_records WHERE user_id = $1 AND venue_id = $2`,
    [userId, venueId]
  );

  if (parseInt(venueRecordCount?.count || '0') === 10) {
    try {
      await achievementService.grant({ userId, achievementKey: 'venue_regular_10' });
      achievements.push('venue_regular_10');
    } catch (e) {
      // Already has achievement
    }
  }

  // Multi-venue champion (5 different venues)
  const uniqueVenues = await db.queryOne<{ count: string }>(
    `SELECT COUNT(DISTINCT venue_id) as count FROM venue_exercise_records WHERE user_id = $1`,
    [userId]
  );

  if (parseInt(uniqueVenues?.count || '0') === 5) {
    try {
      await achievementService.grant({ userId, achievementKey: 'multi_venue_champion_5' });
      achievements.push('multi_venue_champion_5');
    } catch (e) {
      // Already has achievement
    }
  }

  // Refresh leaderboard cache asynchronously
  refreshLeaderboard(venueId, exerciseId, recordType).catch(log.error);

  return {
    record: mapRecordRow(result),
    isNewRecord: true,
    isVenueBest: is_venue_best,
    previousValue: previous_value ?? undefined,
    previousHolderId: previous_holder_id ?? undefined,
    rank: rank_at_venue,
    requiresVerification,
    achievements,
  };
}

/**
 * Auto-detect records from a completed workout session
 */
export async function autoDetectRecords(
  userId: string,
  workoutSessionId: string,
  venueId: string
): Promise<RecordClaimResult[]> {
  log.info(`Auto-detecting records for user ${userId} at venue ${venueId} from session ${workoutSessionId}`);

  // Check if user has opted in
  const user = await db.queryOne<{ share_location_records: boolean }>(
    `SELECT share_location_records FROM users WHERE id = $1`,
    [userId]
  );

  if (!user?.share_location_records) {
    return [];
  }

  // Get the workout session sets
  const session = await db.queryOne<{ sets: string }>(
    `SELECT sets FROM workout_sessions WHERE id = $1 AND user_id = $2`,
    [workoutSessionId, userId]
  );

  if (!session?.sets) {
    return [];
  }

  const sets = JSON.parse(session.sets) as Array<{
    exerciseId: string;
    exerciseName: string;
    reps?: number;
    weightKg?: number;
    durationSeconds?: number;
    id: string;
  }>;

  const results: RecordClaimResult[] = [];
  const exerciseMaxWeight: Map<string, { value: number; reps: number; setId: string }> = new Map();
  const exerciseMaxReps: Map<string, { value: number; weight: number; setId: string }> = new Map();
  const exerciseFastestTime: Map<string, { value: number; setId: string }> = new Map();

  // Aggregate sets by exercise to find max values
  for (const set of sets) {
    if (!set.exerciseId) continue;

    // Max weight
    if (set.weightKg && set.reps) {
      const existing = exerciseMaxWeight.get(set.exerciseId);
      if (!existing || set.weightKg > existing.value) {
        exerciseMaxWeight.set(set.exerciseId, {
          value: set.weightKg,
          reps: set.reps,
          setId: set.id,
        });
      }
    }

    // Max reps (at any weight)
    if (set.reps) {
      const existing = exerciseMaxReps.get(set.exerciseId);
      if (!existing || set.reps > existing.value) {
        exerciseMaxReps.set(set.exerciseId, {
          value: set.reps,
          weight: set.weightKg || 0,
          setId: set.id,
        });
      }
    }

    // Fastest time
    if (set.durationSeconds) {
      const existing = exerciseFastestTime.get(set.exerciseId);
      if (!existing || set.durationSeconds < existing.value) {
        exerciseFastestTime.set(set.exerciseId, {
          value: set.durationSeconds,
          setId: set.id,
        });
      }
    }
  }

  // Try to claim records for each exercise
  for (const [exerciseId, data] of exerciseMaxWeight) {
    try {
      const result = await claimRecord(userId, {
        venueId,
        exerciseId,
        recordType: 'max_weight',
        recordValue: data.value,
        recordUnit: 'kg',
        repsAtWeight: data.reps,
        workoutSessionId,
        setId: data.setId,
      });

      if (result.isNewRecord) {
        results.push(result);
      }

      // Also try to claim 1RM
      const estimated1RM = calculate1RM(data.value, data.reps);
      if (estimated1RM > data.value) {
        try {
          const rm1Result = await claimRecord(userId, {
            venueId,
            exerciseId,
            recordType: 'max_1rm',
            recordValue: estimated1RM,
            recordUnit: '1rm_kg',
            repsAtWeight: data.reps,
            weightAtReps: data.value,
            workoutSessionId,
            setId: data.setId,
          });

          if (rm1Result.isNewRecord) {
            results.push(rm1Result);
          }
        } catch (e) {
          // Ignore 1RM errors
        }
      }
    } catch (e) {
      log.warn(`Failed to claim max_weight record for ${exerciseId}: ${e}`);
    }
  }

  for (const [exerciseId, data] of exerciseMaxReps) {
    try {
      const result = await claimRecord(userId, {
        venueId,
        exerciseId,
        recordType: 'max_reps',
        recordValue: data.value,
        recordUnit: 'reps',
        weightAtReps: data.weight,
        workoutSessionId,
        setId: data.setId,
      });

      if (result.isNewRecord) {
        results.push(result);
      }
    } catch (e) {
      log.warn(`Failed to claim max_reps record for ${exerciseId}: ${e}`);
    }
  }

  for (const [exerciseId, data] of exerciseFastestTime) {
    try {
      const result = await claimRecord(userId, {
        venueId,
        exerciseId,
        recordType: 'fastest_time',
        recordValue: data.value,
        recordUnit: 'seconds',
        workoutSessionId,
        setId: data.setId,
      });

      if (result.isNewRecord) {
        results.push(result);
      }
    } catch (e) {
      log.warn(`Failed to claim fastest_time record for ${exerciseId}: ${e}`);
    }
  }

  return results;
}

/**
 * Get leaderboard for a venue/exercise/record type
 */
export async function getVenueLeaderboard(
  venueId: string,
  exerciseId: string,
  recordType: RecordType,
  limit: number = 50,
  currentUserId?: string
): Promise<VenueLeaderboard> {
  const cacheKey = CACHE_KEYS.leaderboard(venueId, exerciseId, recordType);

  // Try cache first
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const leaderboard = JSON.parse(cached) as VenueLeaderboard;
        // Update current user flag
        if (currentUserId) {
          leaderboard.entries = leaderboard.entries.map(e => ({
            ...e,
            isCurrentUser: e.userId === currentUserId,
          }));
          leaderboard.myRank = leaderboard.entries.find(e => e.userId === currentUserId)?.rank;
        }
        return leaderboard;
      }
    } catch (e) {
      log.warn(`Cache read failed for ${cacheKey}: ${e}`);
    }
  }

  // Query database
  const orderDirection = recordType === 'fastest_time' ? 'ASC' : 'DESC';

  const entries = await db.queryAll<{
    user_id: string;
    username: string;
    avatar_url: string | null;
    record_value: number;
    record_unit: string;
    achieved_at: Date;
    verification_status: VerificationStatus;
  }>(`
    SELECT
      ver.user_id,
      u.username,
      u.avatar_url,
      ver.record_value,
      ver.record_unit,
      ver.achieved_at,
      ver.verification_status
    FROM venue_exercise_records ver
    JOIN users u ON u.id = ver.user_id
    WHERE ver.venue_id = $1
      AND ver.exercise_id = $2
      AND ver.record_type = $3
      AND COALESCE(u.share_location_records, false) = true
    ORDER BY ver.record_value ${orderDirection}
    LIMIT $4
  `, [venueId, exerciseId, recordType, limit]);

  const totalParticipants = await db.queryOne<{ count: string }>(`
    SELECT COUNT(DISTINCT ver.user_id) as count
    FROM venue_exercise_records ver
    JOIN users u ON u.id = ver.user_id
    WHERE ver.venue_id = $1
      AND ver.exercise_id = $2
      AND ver.record_type = $3
      AND COALESCE(u.share_location_records, false) = true
  `, [venueId, exerciseId, recordType]);

  const leaderboard: VenueLeaderboard = {
    venueId,
    exerciseId,
    recordType,
    entries: entries.map((e, i) => ({
      rank: i + 1,
      userId: e.user_id,
      username: e.username,
      avatarUrl: e.avatar_url ?? undefined,
      value: Number(e.record_value),
      unit: e.record_unit,
      achievedAt: new Date(e.achieved_at),
      verificationStatus: e.verification_status,
      isCurrentUser: e.user_id === currentUserId,
    })),
    totalParticipants: parseInt(totalParticipants?.count || '0'),
    myRank: undefined,
    lastUpdatedAt: new Date(),
  };

  // Find current user's rank if they're not in top entries
  if (currentUserId) {
    const myEntry = leaderboard.entries.find(e => e.userId === currentUserId);
    if (myEntry) {
      leaderboard.myRank = myEntry.rank;
    } else {
      // User not in top N, get their actual rank
      const myRankResult = await db.queryOne<{ rank: number }>(`
        SELECT COUNT(*) + 1 as rank
        FROM venue_exercise_records ver
        JOIN users u ON u.id = ver.user_id
        WHERE ver.venue_id = $1
          AND ver.exercise_id = $2
          AND ver.record_type = $3
          AND COALESCE(u.share_location_records, false) = true
          AND (
            (${recordType === 'fastest_time' ? 'ver.record_value <' : 'ver.record_value >'} (
              SELECT record_value FROM venue_exercise_records
              WHERE venue_id = $1 AND exercise_id = $2 AND record_type = $3 AND user_id = $4
            ))
          )
      `, [venueId, exerciseId, recordType, currentUserId]);

      leaderboard.myRank = myRankResult?.rank;

      // Also get user's record
      const myRecord = await db.queryOne<VenueExerciseRecordRow>(`
        SELECT * FROM venue_exercise_records
        WHERE venue_id = $1 AND exercise_id = $2 AND record_type = $3 AND user_id = $4
      `, [venueId, exerciseId, recordType, currentUserId]);

      if (myRecord) {
        leaderboard.myRecord = mapRecordRow(myRecord);
      }
    }
  }

  // Cache the result
  const redisForCache = getRedis();
  if (redisForCache) {
    try {
      await redisForCache.set(cacheKey, JSON.stringify(leaderboard), 'EX', CACHE_TTL.LEADERBOARD);
    } catch (e) {
      log.warn(`Cache write failed for ${cacheKey}: ${e}`);
    }
  }

  return leaderboard;
}

/**
 * Get user's records at venues
 */
export async function getMyVenueRecords(
  userId: string,
  venueId?: string,
  limit: number = 20,
  cursor?: { achievedAt: Date; id: string }
): Promise<{ records: VenueExerciseRecord[]; hasMore: boolean }> {
  let query = `
    SELECT ver.*, e.name as exercise_name, fv.name as venue_name
    FROM venue_exercise_records ver
    JOIN exercises e ON e.id = ver.exercise_id
    LEFT JOIN fitness_venues fv ON fv.id = ver.venue_id
    WHERE ver.user_id = $1
  `;

  const params: (string | Date | number)[] = [userId];
  let paramIndex = 2;

  if (venueId) {
    query += ` AND ver.venue_id = $${paramIndex}`;
    params.push(venueId);
    paramIndex++;
  }

  if (cursor) {
    query += ` AND (ver.achieved_at, ver.id) < ($${paramIndex}, $${paramIndex + 1})`;
    params.push(cursor.achievedAt, cursor.id);
    paramIndex += 2;
  }

  query += ` ORDER BY ver.achieved_at DESC, ver.id DESC LIMIT $${paramIndex}`;
  params.push(limit + 1);

  const records = await db.queryAll<VenueExerciseRecord>(query, params);

  const hasMore = records.length > limit;
  if (hasMore) {
    records.pop();
  }

  return {
    records: records.map(mapRecordRow),
    hasMore,
  };
}

/**
 * Submit video verification for a record
 */
export async function submitVideoVerification(
  userId: string,
  recordId: string,
  videoUrl: string
): Promise<VenueExerciseRecord> {
  const record = await db.queryOne<VenueExerciseRecordRow>(
    `SELECT * FROM venue_exercise_records WHERE id = $1 AND user_id = $2`,
    [recordId, userId]
  );

  if (!record) {
    throw new Error('Record not found or not owned by user');
  }

  const updated = await db.queryOne<VenueExerciseRecordRow>(`
    UPDATE venue_exercise_records
    SET video_url = $1, verification_status = 'video_verified', verified_at = NOW(), updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `, [videoUrl, recordId]);

  if (!updated) {
    throw new Error('Failed to update record');
  }

  // Check for verified record achievement
  try {
    await achievementService.grant({ userId, achievementKey: 'witnessed_record' });
  } catch (e) {
    // Already has achievement
  }

  await invalidateCaches(updated.venue_id, updated.exercise_id, updated.record_type, userId);

  return mapRecordRow(updated);
}

/**
 * Witness a record
 */
export async function witnessRecord(
  witnessUserId: string,
  recordId: string,
  latitude?: number,
  longitude?: number,
  attestation?: string
): Promise<VenueExerciseRecord> {
  // Check record exists
  const record = await db.queryOne<VenueExerciseRecordRow>(
    `SELECT * FROM venue_exercise_records WHERE id = $1`,
    [recordId]
  );

  if (!record) {
    throw new Error('Record not found');
  }

  // Can't witness own record
  if (record.user_id === witnessUserId) {
    throw new Error('Cannot witness your own record');
  }

  // Insert witness
  await db.query(`
    INSERT INTO venue_record_witnesses (record_id, witness_user_id, witness_latitude, witness_longitude, attestation)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (record_id, witness_user_id) DO UPDATE SET
      witness_latitude = EXCLUDED.witness_latitude,
      witness_longitude = EXCLUDED.witness_longitude,
      attestation = EXCLUDED.attestation,
      witnessed_at = NOW()
  `, [recordId, witnessUserId, latitude, longitude, attestation]);

  // Update witness count and possibly verification status
  const witnessCount = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM venue_record_witnesses WHERE record_id = $1 AND is_valid = true`,
    [recordId]
  );

  const count = parseInt(witnessCount?.count || '0');

  // 2+ witnesses = witness_verified
  const newStatus = count >= 2 ? 'witness_verified' : record.verification_status;

  const updated = await db.queryOne<VenueExerciseRecordRow>(`
    UPDATE venue_exercise_records
    SET witness_count = $1,
        verification_status = CASE WHEN $2 = 'witness_verified' THEN 'witness_verified' ELSE verification_status END,
        verified_at = CASE WHEN $2 = 'witness_verified' AND verified_at IS NULL THEN NOW() ELSE verified_at END,
        updated_at = NOW()
    WHERE id = $3
    RETURNING *
  `, [count, newStatus, recordId]);

  if (!updated) {
    throw new Error('Failed to update record');
  }

  // Check witness achievement (10 witnesses)
  const totalWitnessed = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM venue_record_witnesses WHERE witness_user_id = $1`,
    [witnessUserId]
  );

  if (parseInt(totalWitnessed?.count || '0') === 10) {
    try {
      await achievementService.grant({ userId: witnessUserId, achievementKey: 'reliable_witness' });
    } catch (e) {
      // Already has achievement
    }
  }

  await invalidateCaches(updated.venue_id, updated.exercise_id, updated.record_type, updated.user_id);

  return mapRecordRow(updated);
}

/**
 * Refresh leaderboard cache
 */
export async function refreshLeaderboard(
  venueId: string,
  exerciseId: string,
  recordType: RecordType
): Promise<void> {
  const cacheKey = CACHE_KEYS.leaderboard(venueId, exerciseId, recordType);

  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(cacheKey);
    } catch (e) {
      log.warn(`Cache delete failed for ${cacheKey}: ${e}`);
    }
  }

  // Also update the cached leaderboard table
  const orderDirection = recordType === 'fastest_time' ? 'ASC' : 'DESC';

  const entries = await db.queryAll<{
    user_id: string;
    username: string;
    avatar_url: string | null;
    record_value: number;
    record_unit: string;
    achieved_at: Date;
    verification_status: VerificationStatus;
  }>(`
    SELECT
      ver.user_id,
      u.username,
      u.avatar_url,
      ver.record_value,
      ver.record_unit,
      ver.achieved_at,
      ver.verification_status
    FROM venue_exercise_records ver
    JOIN users u ON u.id = ver.user_id
    WHERE ver.venue_id = $1
      AND ver.exercise_id = $2
      AND ver.record_type = $3
      AND COALESCE(u.share_location_records, false) = true
    ORDER BY ver.record_value ${orderDirection}
    LIMIT 100
  `, [venueId, exerciseId, recordType]);

  const rankings = entries.map((e, i) => ({
    rank: i + 1,
    user_id: e.user_id,
    username: e.username,
    avatar_url: e.avatar_url,
    value: Number(e.record_value),
    unit: e.record_unit,
    achieved_at: e.achieved_at,
    verification_status: e.verification_status,
  }));

  const totalParticipants = await db.queryOne<{ count: string }>(`
    SELECT COUNT(DISTINCT ver.user_id) as count
    FROM venue_exercise_records ver
    JOIN users u ON u.id = ver.user_id
    WHERE ver.venue_id = $1
      AND ver.exercise_id = $2
      AND ver.record_type = $3
      AND COALESCE(u.share_location_records, false) = true
  `, [venueId, exerciseId, recordType]);

  const verifiedCount = entries.filter(e =>
    e.verification_status === 'video_verified' || e.verification_status === 'witness_verified'
  ).length;

  await db.query(`
    INSERT INTO venue_leaderboards (venue_id, exercise_id, record_type, rankings, total_participants, verified_participants, last_updated_at, stale_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW() + INTERVAL '5 minutes')
    ON CONFLICT (venue_id, exercise_id, record_type)
    DO UPDATE SET
      rankings = EXCLUDED.rankings,
      total_participants = EXCLUDED.total_participants,
      verified_participants = EXCLUDED.verified_participants,
      last_updated_at = NOW(),
      stale_at = NOW() + INTERVAL '5 minutes',
      cache_version = venue_leaderboards.cache_version + 1
  `, [venueId, exerciseId, recordType, JSON.stringify(rankings), parseInt(totalParticipants?.count || '0'), verifiedCount]);
}

/**
 * Get global records for an exercise across all venues
 */
export async function getGlobalExerciseRecords(
  exerciseId: string,
  recordType: RecordType,
  limit: number = 50
): Promise<LeaderboardEntry[]> {
  const orderDirection = recordType === 'fastest_time' ? 'ASC' : 'DESC';

  const entries = await db.queryAll<{
    user_id: string;
    username: string;
    avatar_url: string | null;
    record_value: number;
    record_unit: string;
    achieved_at: Date;
    verification_status: VerificationStatus;
    venue_name: string;
  }>(`
    SELECT DISTINCT ON (ver.user_id)
      ver.user_id,
      u.username,
      u.avatar_url,
      ver.record_value,
      ver.record_unit,
      ver.achieved_at,
      ver.verification_status,
      fv.name as venue_name
    FROM venue_exercise_records ver
    JOIN users u ON u.id = ver.user_id
    LEFT JOIN fitness_venues fv ON fv.id = ver.venue_id
    WHERE ver.exercise_id = $1
      AND ver.record_type = $2
      AND COALESCE(u.share_location_records, false) = true
    ORDER BY ver.user_id, ver.record_value ${orderDirection}
  `, [exerciseId, recordType]);

  // Sort globally
  const sorted = entries.sort((a, b) => {
    if (recordType === 'fastest_time') {
      return Number(a.record_value) - Number(b.record_value);
    }
    return Number(b.record_value) - Number(a.record_value);
  }).slice(0, limit);

  return sorted.map((e, i) => ({
    rank: i + 1,
    userId: e.user_id,
    username: e.username,
    avatarUrl: e.avatar_url ?? undefined,
    value: Number(e.record_value),
    unit: e.record_unit,
    achievedAt: new Date(e.achieved_at),
    verificationStatus: e.verification_status,
    isCurrentUser: false,
  }));
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapRecordRow(row: any): VenueExerciseRecord {
  return {
    id: row.id,
    venueId: row.venue_id,
    exerciseId: row.exercise_id,
    userId: row.user_id,
    recordType: row.record_type,
    recordValue: Number(row.record_value),
    recordUnit: row.record_unit,
    workoutSessionId: row.workout_session_id,
    setId: row.set_id,
    repsAtWeight: row.reps_at_weight,
    weightAtReps: row.weight_at_reps ? Number(row.weight_at_reps) : undefined,
    verificationStatus: row.verification_status,
    videoUrl: row.video_url,
    witnessCount: row.witness_count || 0,
    achievedAt: new Date(row.achieved_at),
    verifiedAt: row.verified_at ? new Date(row.verified_at) : undefined,
    conditions: row.conditions,
    notes: row.notes,
    previousRecordValue: row.previous_record_value ? Number(row.previous_record_value) : undefined,
    previousRecordHolderId: row.previous_record_holder_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function invalidateCaches(
  venueId: string,
  exerciseId: string,
  recordType: string,
  userId: string
): Promise<void> {
  const redisClient = getRedis();
  if (!redisClient) return;

  try {
    await Promise.all([
      redisClient.del(CACHE_KEYS.leaderboard(venueId, exerciseId, recordType)),
      redisClient.del(CACHE_KEYS.userRecords(userId)),
      redisClient.del(CACHE_KEYS.venueStats(venueId)),
    ]);
  } catch (e) {
    log.warn(`Cache invalidation failed: ${e}`);
  }
}

/**
 * Epley formula for estimated 1RM
 */
function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps > 12) return weight; // Formula less accurate for high reps
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

// Export as named service
export const venueRecordsService = {
  claimRecord,
  autoDetectRecords,
  getVenueLeaderboard,
  getMyVenueRecords,
  submitVideoVerification,
  witnessRecord,
  refreshLeaderboard,
  getGlobalExerciseRecords,
};
