/**
 * GraphQL Resolvers for Venue Exercise Records & Activity Analytics
 *
 * Handles location-based records, leaderboards, and community activity visualizations
 */

import { GraphQLError } from 'graphql';
import { queryOne, queryAll, query } from '../db/client';
import * as venueRecordsService from '../modules/venue-records';
import * as venueActivityService from '../modules/venue-activity';

// ============================================
// TYPES
// ============================================

interface Context {
  user?: {
    userId: string;
    email: string;
    roles: string[];
  };
}

interface VenueRecordsInput {
  venueId: string;
  exerciseId?: string;
  recordType?: string;
  timeRange?: string;
  limit?: number;
  cursor?: string;
}

interface VenueLeaderboardInput {
  venueId: string;
  exerciseId: string;
  recordType: string;
  timeRange?: string;
  limit?: number;
}

interface MyVenueRecordsInput {
  venueId?: string;
  limit?: number;
  cursor?: string;
}

interface VenueActivityInput {
  venueId: string;
  date: string;
}

interface VenueActivitySummaryInput {
  venueId: string;
  startDate: string;
  endDate: string;
}

interface RegionalActivityInput {
  venueIds?: string[];
  borough?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  startDate: string;
  endDate: string;
}

interface GlobalVenueRecordsInput {
  exerciseId?: string;
  recordType?: string;
  limit?: number;
}

interface NearbyVenueActivityInput {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  limit?: number;
}

interface ClaimVenueRecordInput {
  venueId: string;
  exerciseId: string;
  recordType: string;
  recordValue: number;
  recordUnit: string;
  repsAtWeight?: number;
  weightAtReps?: number;
  workoutSessionId?: string;
  setId?: string;
  conditions?: Record<string, unknown>;
  notes?: string;
}

interface LocationRecordPrivacyInput {
  shareLocationRecords: boolean;
  shareVenueActivity: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function requireAuth(context: Context): { userId: string; email: string; roles: string[]; isAdmin: boolean } {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return {
    ...context.user,
    isAdmin: context.user.roles?.includes('admin') || false,
  };
}

// Transform database row to GraphQL VenueExerciseRecord type
interface RecordRow {
  id: string;
  venue_id: string;
  exercise_id: string;
  user_id: string;
  record_type: string;
  record_value: string | number;
  record_unit: string;
  reps_at_weight?: number;
  weight_at_reps?: string | number;
  verification_status: string;
  video_url?: string;
  witness_count: number;
  achieved_at: Date;
  verified_at?: Date;
  conditions?: Record<string, unknown>;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  rank?: number;
  global_rank?: number;
}

function transformRecord(row: RecordRow): Record<string, unknown> {
  return {
    id: row.id,
    venueId: row.venue_id,
    exerciseId: row.exercise_id,
    userId: row.user_id,
    recordType: row.record_type,
    recordValue: parseFloat(String(row.record_value)),
    recordUnit: row.record_unit,
    repsAtWeight: row.reps_at_weight,
    weightAtReps: row.weight_at_reps ? parseFloat(String(row.weight_at_reps)) : null,
    verificationStatus: row.verification_status,
    videoUrl: row.video_url,
    witnessCount: row.witness_count,
    achievedAt: row.achieved_at,
    verifiedAt: row.verified_at,
    conditions: row.conditions || {},
    notes: row.notes,
    rank: row.rank || 0,
    globalRank: row.global_rank || null,
  };
}

// Transform activity daily row
interface ActivityDailyRow {
  id: string;
  venue_id: string;
  activity_date: Date;
  total_users: number;
  public_users: number;
  total_workouts: number;
  total_sets: number;
  total_reps: string | number;
  total_volume_kg: string | number;
  total_tu: string | number;
  exercises_breakdown?: Record<string, number>;
  muscle_activations?: Record<string, number>;
  hourly_activity?: number[];
  records_set: number;
  peak_concurrent_users: number;
  busiest_hour?: number;
}

function transformActivityDaily(row: ActivityDailyRow): Record<string, unknown> {
  // Transform exercises breakdown to array
  const exercisesBreakdown = row.exercises_breakdown
    ? Object.entries(row.exercises_breakdown).map(([exerciseId, count]) => ({
        exerciseId,
        exerciseName: exerciseId, // Will be resolved by type resolver
        count,
        percentage: 0, // Will be calculated
      }))
    : [];

  // Calculate percentages
  const totalExercises = exercisesBreakdown.reduce((sum, e) => sum + (e.count as number), 0);
  exercisesBreakdown.forEach((e) => {
    e.percentage = totalExercises > 0 ? ((e.count as number) / totalExercises) * 100 : 0;
  });

  // Transform muscle activations to array
  const muscleActivations = row.muscle_activations
    ? Object.entries(row.muscle_activations).map(([muscleId, totalTu]) => ({
        muscleId,
        muscleName: muscleId, // Will be resolved by type resolver
        totalTu,
        percentage: 0, // Will be calculated
      }))
    : [];

  // Calculate percentages
  const totalMuscleActivation = muscleActivations.reduce((sum, m) => sum + (m.totalTu as number), 0);
  muscleActivations.forEach((m) => {
    m.percentage = totalMuscleActivation > 0 ? ((m.totalTu as number) / totalMuscleActivation) * 100 : 0;
  });

  return {
    venueId: row.venue_id,
    activityDate: row.activity_date,
    totalUsers: row.total_users,
    publicUsers: row.public_users,
    totalWorkouts: row.total_workouts,
    totalSets: row.total_sets,
    totalReps: parseInt(String(row.total_reps)),
    totalVolumeKg: parseFloat(String(row.total_volume_kg)),
    totalTu: parseFloat(String(row.total_tu)),
    exercisesBreakdown,
    muscleActivations,
    hourlyActivity: row.hourly_activity || Array(24).fill(0),
    recordsSet: row.records_set,
    peakConcurrentUsers: row.peak_concurrent_users,
    busiestHour: row.busiest_hour,
  };
}

// ============================================
// VENUE RECORDS QUERY RESOLVERS
// ============================================

export const venueRecordsQueries = {
  // Get records for a venue
  venueRecords: async (
    _: unknown,
    { input }: { input: VenueRecordsInput },
    context: Context
  ) => {
    const limit = Math.min(input.limit || 20, 100);
    const params: (string | number | null)[] = [input.venueId];
    let paramIndex = 2;

    let sql = `
      SELECT ver.*,
        ROW_NUMBER() OVER (
          PARTITION BY ver.exercise_id, ver.record_type
          ORDER BY ver.record_value DESC
        ) as rank
      FROM venue_exercise_records ver
      WHERE ver.venue_id = $1
    `;

    if (input.exerciseId) {
      sql += ` AND ver.exercise_id = $${paramIndex}`;
      params.push(input.exerciseId);
      paramIndex++;
    }

    if (input.recordType) {
      sql += ` AND ver.record_type = $${paramIndex}`;
      params.push(input.recordType);
      paramIndex++;
    }

    if (input.timeRange && input.timeRange !== 'ALL_TIME') {
      const timeRanges: Record<string, string> = {
        TODAY: "NOW() - INTERVAL '1 day'",
        WEEK: "NOW() - INTERVAL '7 days'",
        MONTH: "NOW() - INTERVAL '30 days'",
        QUARTER: "NOW() - INTERVAL '90 days'",
        YEAR: "NOW() - INTERVAL '365 days'",
      };
      const interval = timeRanges[input.timeRange];
      if (interval) {
        sql += ` AND ver.achieved_at >= ${interval}`;
      }
    }

    // Keyset pagination
    if (input.cursor) {
      try {
        const cursor = JSON.parse(Buffer.from(input.cursor, 'base64').toString()) as {
          achievedAt: string;
          id: string;
        };
        sql += ` AND (ver.achieved_at, ver.id) < ($${paramIndex}::timestamptz, $${paramIndex + 1})`;
        params.push(cursor.achievedAt, cursor.id);
        paramIndex += 2;
      } catch {
        // Invalid cursor, ignore
      }
    }

    sql += ` ORDER BY ver.achieved_at DESC, ver.id DESC LIMIT $${paramIndex}`;
    params.push(limit + 1);

    const rows = await queryAll<RecordRow>(sql, params);
    const hasNextPage = rows.length > limit;
    const records = rows.slice(0, limit).map(transformRecord);

    const edges = records.map((record) => ({
      cursor: Buffer.from(
        JSON.stringify({ achievedAt: record.achievedAt, id: record.id })
      ).toString('base64'),
      node: record,
    }));

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM venue_exercise_records WHERE venue_id = $1`,
      [input.venueId]
    );

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: !!input.cursor,
        startCursor: edges.length > 0 ? edges[0].cursor : null,
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
      },
      totalCount: parseInt(countResult?.count || '0'),
    };
  },

  // Get venue leaderboard
  venueLeaderboard: async (
    _: unknown,
    { input }: { input: VenueLeaderboardInput },
    context: Context
  ) => {
    const userId = context.user?.userId;
    const limit = Math.min(input.limit || 50, 100);

    // Get cached leaderboard if available
    const cached = await queryOne<{
      rankings: Array<{
        rank: number;
        user_id: string;
        username: string;
        avatar_url?: string;
        value: number;
        achieved_at: Date;
        verification_status: string;
      }>;
      total_participants: number;
      last_updated_at: Date;
    }>(
      `SELECT rankings, total_participants, last_updated_at
       FROM venue_leaderboards
       WHERE venue_id = $1 AND exercise_id = $2 AND record_type = $3`,
      [input.venueId, input.exerciseId, input.recordType]
    );

    let entries: Array<Record<string, unknown>> = [];
    let totalParticipants = 0;
    let lastUpdatedAt = new Date();

    if (cached && cached.rankings) {
      // Use cached rankings
      entries = cached.rankings.slice(0, limit).map((r) => ({
        rank: r.rank,
        userId: r.user_id,
        username: r.username,
        avatarUrl: r.avatar_url,
        value: r.value,
        unit: input.recordType === 'MAX_WEIGHT' ? 'kg' : 'reps',
        achievedAt: r.achieved_at,
        verificationStatus: r.verification_status,
        isCurrentUser: r.user_id === userId,
      }));
      totalParticipants = cached.total_participants;
      lastUpdatedAt = cached.last_updated_at;
    } else {
      // Compute leaderboard on-the-fly
      const rows = await queryAll<RecordRow & { username: string; avatar_url?: string }>(
        `SELECT ver.*, u.username, u.avatar_url,
          RANK() OVER (ORDER BY ver.record_value DESC) as rank
         FROM venue_exercise_records ver
         JOIN users u ON u.id = ver.user_id AND u.share_location_records = true
         WHERE ver.venue_id = $1 AND ver.exercise_id = $2 AND ver.record_type = $3
         ORDER BY ver.record_value DESC
         LIMIT $4`,
        [input.venueId, input.exerciseId, input.recordType, limit]
      );

      entries = rows.map((r) => ({
        rank: r.rank,
        userId: r.user_id,
        username: r.username,
        avatarUrl: r.avatar_url,
        value: parseFloat(String(r.record_value)),
        unit: r.record_unit,
        achievedAt: r.achieved_at,
        verificationStatus: r.verification_status,
        isCurrentUser: r.user_id === userId,
      }));

      const countResult = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM venue_exercise_records
         WHERE venue_id = $1 AND exercise_id = $2 AND record_type = $3`,
        [input.venueId, input.exerciseId, input.recordType]
      );
      totalParticipants = parseInt(countResult?.count || '0');
    }

    // Get current user's rank and record
    let myRank: number | null = null;
    let myRecord: Record<string, unknown> | null = null;

    if (userId) {
      const myRecordRow = await queryOne<RecordRow>(
        `SELECT ver.*,
          (SELECT COUNT(*) + 1 FROM venue_exercise_records ver2
           WHERE ver2.venue_id = ver.venue_id
             AND ver2.exercise_id = ver.exercise_id
             AND ver2.record_type = ver.record_type
             AND ver2.record_value > ver.record_value) as rank
         FROM venue_exercise_records ver
         WHERE ver.venue_id = $1 AND ver.exercise_id = $2
           AND ver.record_type = $3 AND ver.user_id = $4`,
        [input.venueId, input.exerciseId, input.recordType, userId]
      );

      if (myRecordRow) {
        myRank = myRecordRow.rank || null;
        myRecord = transformRecord(myRecordRow);
      }
    }

    return {
      venueId: input.venueId,
      exerciseId: input.exerciseId,
      recordType: input.recordType,
      entries,
      totalParticipants,
      myRank,
      myRecord,
      lastUpdatedAt,
    };
  },

  // Get current user's venue records
  myVenueRecords: async (
    _: unknown,
    { input }: { input: MyVenueRecordsInput },
    context: Context
  ) => {
    const { userId } = requireAuth(context);
    const limit = Math.min(input?.limit || 20, 100);
    const params: (string | number)[] = [userId];
    let paramIndex = 2;

    let sql = `
      SELECT ver.*,
        (SELECT COUNT(*) + 1 FROM venue_exercise_records ver2
         WHERE ver2.venue_id = ver.venue_id
           AND ver2.exercise_id = ver.exercise_id
           AND ver2.record_type = ver.record_type
           AND ver2.record_value > ver.record_value) as rank
      FROM venue_exercise_records ver
      WHERE ver.user_id = $1
    `;

    if (input?.venueId) {
      sql += ` AND ver.venue_id = $${paramIndex}`;
      params.push(input.venueId);
      paramIndex++;
    }

    // Keyset pagination
    if (input?.cursor) {
      try {
        const cursor = JSON.parse(Buffer.from(input.cursor, 'base64').toString()) as {
          achievedAt: string;
          id: string;
        };
        sql += ` AND (ver.achieved_at, ver.id) < ($${paramIndex}::timestamptz, $${paramIndex + 1})`;
        params.push(cursor.achievedAt, cursor.id);
        paramIndex += 2;
      } catch {
        // Invalid cursor, ignore
      }
    }

    sql += ` ORDER BY ver.achieved_at DESC, ver.id DESC LIMIT $${paramIndex}`;
    params.push(limit + 1);

    const rows = await queryAll<RecordRow>(sql, params);
    const hasNextPage = rows.length > limit;
    const records = rows.slice(0, limit).map(transformRecord);

    const edges = records.map((record) => ({
      cursor: Buffer.from(
        JSON.stringify({ achievedAt: record.achievedAt, id: record.id })
      ).toString('base64'),
      node: record,
    }));

    let countSql = `SELECT COUNT(*) as count FROM venue_exercise_records WHERE user_id = $1`;
    const countParams: string[] = [userId];
    if (input?.venueId) {
      countSql += ` AND venue_id = $2`;
      countParams.push(input.venueId);
    }
    const countResult = await queryOne<{ count: string }>(countSql, countParams);

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: !!input?.cursor,
        startCursor: edges.length > 0 ? edges[0].cursor : null,
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
      },
      totalCount: parseInt(countResult?.count || '0'),
    };
  },

  // Get venue activity for a specific day
  venueActivityDaily: async (
    _: unknown,
    { input }: { input: VenueActivityInput }
  ) => {
    const row = await queryOne<ActivityDailyRow>(
      `SELECT * FROM venue_activity_daily
       WHERE venue_id = $1 AND activity_date = $2::date`,
      [input.venueId, input.date]
    );

    return row ? transformActivityDaily(row) : null;
  },

  // Get venue activity summary
  venueActivitySummary: async (
    _: unknown,
    { input }: { input: VenueActivitySummaryInput }
  ) => {
    return venueActivityService.getVenueActivitySummary(
      input.venueId,
      new Date(input.startDate),
      new Date(input.endDate)
    );
  },

  // Get regional activity summary
  regionalActivitySummary: async (
    _: unknown,
    { input }: { input: RegionalActivityInput }
  ) => {
    return venueActivityService.getRegionalActivitySummary({
      venueIds: input.venueIds,
      borough: input.borough,
      latitude: input.latitude,
      longitude: input.longitude,
      radiusMeters: input.radiusMeters,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
    });
  },

  // Get global venue records across all venues
  globalVenueRecords: async (
    _: unknown,
    { input }: { input: GlobalVenueRecordsInput }
  ) => {
    const limit = Math.min(input?.limit || 50, 100);
    const params: (string | number)[] = [];
    let paramIndex = 1;

    let sql = `
      SELECT ver.*,
        RANK() OVER (
          PARTITION BY ver.exercise_id, ver.record_type
          ORDER BY ver.record_value DESC
        ) as global_rank
      FROM venue_exercise_records ver
      JOIN users u ON u.id = ver.user_id AND u.share_location_records = true
      WHERE 1=1
    `;

    if (input?.exerciseId) {
      sql += ` AND ver.exercise_id = $${paramIndex}`;
      params.push(input.exerciseId);
      paramIndex++;
    }

    if (input?.recordType) {
      sql += ` AND ver.record_type = $${paramIndex}`;
      params.push(input.recordType);
      paramIndex++;
    }

    sql += ` ORDER BY ver.record_value DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const rows = await queryAll<RecordRow>(sql, params);
    return rows.map(transformRecord);
  },

  // Get nearby venue activity
  nearbyVenueActivity: async (
    _: unknown,
    { input }: { input: NearbyVenueActivityInput }
  ) => {
    const limit = Math.min(input.limit || 10, 50);
    const radiusMeters = input.radiusMeters || 2000;

    // Get nearby venues
    const venues = await queryAll<{ id: string; name: string }>(
      `SELECT id, name FROM fitness_venues
       WHERE is_active = true
       AND (
         6371000 * acos(
           cos(radians($1)) * cos(radians(latitude)) *
           cos(radians(longitude) - radians($2)) +
           sin(radians($1)) * sin(radians(latitude))
         )
       ) <= $3
       ORDER BY (
         6371000 * acos(
           cos(radians($1)) * cos(radians(latitude)) *
           cos(radians(longitude) - radians($2)) +
           sin(radians($1)) * sin(radians(latitude))
         )
       ) ASC
       LIMIT $4`,
      [input.latitude, input.longitude, radiusMeters, limit]
    );

    if (venues.length === 0) {
      return [];
    }

    // Get activity summaries for each venue (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const summaries = await Promise.all(
      venues.map((venue) =>
        venueActivityService.getVenueActivitySummary(venue.id, startDate, endDate)
      )
    );

    return summaries;
  },
};

// ============================================
// VENUE RECORDS MUTATION RESOLVERS
// ============================================

export const venueRecordsMutations = {
  // Claim a record at a venue
  claimVenueRecord: async (
    _: unknown,
    { input }: { input: ClaimVenueRecordInput },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    const result = await venueRecordsService.claimRecord(userId, {
      venueId: input.venueId,
      exerciseId: input.exerciseId,
      recordType: input.recordType as venueRecordsService.RecordType,
      recordValue: input.recordValue,
      recordUnit: input.recordUnit,
      repsAtWeight: input.repsAtWeight,
      weightAtReps: input.weightAtReps,
      workoutSessionId: input.workoutSessionId,
      setId: input.setId,
      conditions: input.conditions,
      notes: input.notes,
    });

    return {
      record: transformRecord(result.record as unknown as RecordRow),
      isNewRecord: result.isNewRecord,
      isVenueBest: result.isVenueBest,
      previousValue: result.previousValue ?? null,
      previousHolderId: result.previousHolderId ?? null,
      rank: result.rank,
      requiresVerification: result.requiresVerification,
      achievements: result.achievements || [],
    };
  },

  // Submit video verification for a record
  submitRecordVerification: async (
    _: unknown,
    { recordId, videoUrl }: { recordId: string; videoUrl: string },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    const result = await venueRecordsService.submitVideoVerification(
      recordId,
      userId,
      videoUrl
    );

    return transformRecord(result as unknown as RecordRow);
  },

  // Witness a record
  witnessRecord: async (
    _: unknown,
    {
      recordId,
      latitude,
      longitude,
      attestation,
    }: {
      recordId: string;
      latitude?: number;
      longitude?: number;
      attestation?: string;
    },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    const result = await venueRecordsService.witnessRecord(
      recordId,
      userId,
      latitude,
      longitude,
      attestation
    );

    return transformRecord(result as unknown as RecordRow);
  },

  // Dispute a venue record
  disputeVenueRecord: async (
    _: unknown,
    { recordId, reason }: { recordId: string; reason: string },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    // Create a dispute record
    await query(
      `INSERT INTO venue_record_disputes (id, record_id, user_id, reason, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
      [recordId, userId, reason]
    );

    return true;
  },

  // Update privacy settings for location records
  updateLocationRecordPrivacy: async (
    _: unknown,
    { input }: { input: LocationRecordPrivacyInput },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    await query(
      `UPDATE users
       SET share_location_records = $2,
           share_venue_activity = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [userId, input.shareLocationRecords, input.shareVenueActivity]
    );

    // Return updated privacy settings
    const user = await queryOne<{
      share_location_records: boolean;
      share_venue_activity: boolean;
    }>(`SELECT share_location_records, share_venue_activity FROM users WHERE id = $1`, [
      userId,
    ]);

    return {
      shareLocationRecords: user?.share_location_records ?? false,
      shareVenueActivity: user?.share_venue_activity ?? false,
    };
  },
};

// ============================================
// TYPE RESOLVERS
// ============================================

export const venueRecordsTypeResolvers = {
  VenueExerciseRecord: {
    venue: async (parent: { venueId: string }) => {
      const row = await queryOne(
        `SELECT * FROM fitness_venues WHERE id = $1`,
        [parent.venueId]
      );
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        latitude: parseFloat(String(row.latitude)),
        longitude: parseFloat(String(row.longitude)),
        borough: row.borough,
      };
    },

    exercise: async (parent: { exerciseId: string }) => {
      const row = await queryOne(
        `SELECT * FROM exercises WHERE id = $1`,
        [parent.exerciseId]
      );
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        muscleGroups: row.muscle_groups || [],
      };
    },

    user: async (parent: { userId: string }) => {
      // Check if user allows sharing location records
      const user = await queryOne<{
        id: string;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
        share_location_records: boolean;
      }>(
        `SELECT id, username, display_name, avatar_url, share_location_records
         FROM users WHERE id = $1`,
        [parent.userId]
      );

      if (!user || !user.share_location_records) {
        // Return anonymous profile
        return {
          id: parent.userId,
          username: 'Anonymous',
          displayName: null,
          avatar: null,
        };
      }

      return {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar_url,
      };
    },
  },

  VenueLeaderboard: {
    venue: async (parent: { venueId: string }) => {
      const row = await queryOne(
        `SELECT * FROM fitness_venues WHERE id = $1`,
        [parent.venueId]
      );
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
      };
    },

    exercise: async (parent: { exerciseId: string }) => {
      const row = await queryOne(
        `SELECT * FROM exercises WHERE id = $1`,
        [parent.exerciseId]
      );
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
      };
    },
  },

  VenueActivitySummary: {
    venue: async (parent: { venueId: string }) => {
      const row = await queryOne(
        `SELECT * FROM fitness_venues WHERE id = $1`,
        [parent.venueId]
      );
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        latitude: parseFloat(String(row.latitude)),
        longitude: parseFloat(String(row.longitude)),
      };
    },
  },

  ExerciseBreakdownItem: {
    exerciseName: async (parent: { exerciseId: string }) => {
      const row = await queryOne<{ name: string }>(
        `SELECT name FROM exercises WHERE id = $1`,
        [parent.exerciseId]
      );
      return row?.name || parent.exerciseId;
    },
  },

  MuscleActivationItem: {
    muscleName: async (parent: { muscleId: string }) => {
      // Muscle names are typically the ID formatted nicely
      return parent.muscleId
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    },
  },
};
