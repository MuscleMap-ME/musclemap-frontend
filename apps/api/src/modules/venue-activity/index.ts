/**
 * Venue Activity Service
 *
 * Manages community activity aggregations for visualizations:
 * - Daily activity aggregates (for charts)
 * - Real-time activity logging
 * - Privacy-aware data aggregation
 * - Regional/multi-venue summaries
 */

import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import { getRedis } from '../../lib/redis';

const log = loggers.api;

// ============================================
// TYPES
// ============================================

export interface VenueActivityDaily {
  venueId: string;
  activityDate: Date;
  totalUsers: number;
  publicUsers: number;
  totalWorkouts: number;
  totalSets: number;
  totalReps: number;
  totalVolumeKg: number;
  totalTu: number;
  exercisesBreakdown: ExerciseBreakdownItem[];
  muscleActivations: MuscleActivationItem[];
  hourlyActivity: number[];
  recordsSet: number;
  peakConcurrentUsers: number;
  busiestHour?: number;
}

export interface ExerciseBreakdownItem {
  exerciseId: string;
  exerciseName: string;
  count: number;
  percentage: number;
}

export interface MuscleActivationItem {
  muscleId: string;
  muscleName: string;
  totalTu: number;
  percentage: number;
}

export interface DailyDataPoint {
  date: Date;
  value: number;
}

export interface HourlyDataPoint {
  hour: number;
  averageUsers: number;
  averageWorkouts: number;
}

export interface WeekdayDataPoint {
  dayOfWeek: number;
  dayName: string;
  averageUsers: number;
  averageWorkouts: number;
}

export interface VenueContributor {
  userId: string;
  username: string;
  avatarUrl?: string;
  totalWorkouts: number;
  totalVolumeKg: number;
  recordsHeld: number;
}

export interface VenueActivitySummary {
  venueId: string;
  startDate: Date;
  endDate: Date;
  totalWorkouts: number;
  uniqueUsers: number;
  totalRecordsSet: number;
  totalVolumeKg: number;
  totalTu: number;
  dailyWorkouts: DailyDataPoint[];
  dailyUsers: DailyDataPoint[];
  dailyRecords: DailyDataPoint[];
  dailyVolume: DailyDataPoint[];
  exerciseDistribution: ExerciseBreakdownItem[];
  muscleDistribution: MuscleActivationItem[];
  hourlyPattern: HourlyDataPoint[];
  weekdayPattern: WeekdayDataPoint[];
  topContributors: VenueContributor[];
  recentRecords: any[]; // VenueExerciseRecord
}

export interface VenueComparisonItem {
  venueId: string;
  venueName: string;
  workouts: number;
  users: number;
  records: number;
}

export interface VenueHeatmapPoint {
  venueId: string;
  latitude: number;
  longitude: number;
  intensity: number;
  workouts: number;
}

export interface RegionalActivitySummary {
  venues: any[]; // OutdoorVenue
  venueCount: number;
  totalWorkouts: number;
  uniqueUsers: number;
  totalRecordsSet: number;
  venueComparison: VenueComparisonItem[];
  heatmapData: VenueHeatmapPoint[];
}

// ============================================
// CACHE KEYS
// ============================================

const CACHE_KEYS = {
  dailyActivity: (venueId: string, date: string) => `venue:activity:daily:${venueId}:${date}`,
  activitySummary: (venueId: string, startDate: string, endDate: string) =>
    `venue:activity:summary:${venueId}:${startDate}:${endDate}`,
  regionalSummary: (hash: string) => `venue:activity:regional:${hash}`,
};

const CACHE_TTL = {
  DAILY: 300, // 5 minutes
  SUMMARY: 600, // 10 minutes
  REGIONAL: 900, // 15 minutes
};

// ============================================
// ACTIVITY LOGGING
// ============================================

export type ActivityType = 'checkin' | 'checkout' | 'workout_start' | 'workout_end' | 'set_logged' | 'record_claimed';

export interface LogActivityInput {
  venueId: string;
  userId: string;
  workoutSessionId?: string;
  activityType: ActivityType;
  setsCount?: number;
  repsCount?: number;
  volumeKg?: number;
  tuEarned?: number;
  exerciseId?: string;
  muscleActivations?: Record<string, number>;
}

/**
 * Log an activity event at a venue
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  const {
    venueId,
    userId,
    workoutSessionId,
    activityType,
    setsCount = 0,
    repsCount = 0,
    volumeKg = 0,
    tuEarned = 0,
    exerciseId,
    muscleActivations = {},
  } = input;

  // Check user privacy
  const user = await db.queryOne<{ share_venue_activity: boolean }>(
    `SELECT share_venue_activity FROM users WHERE id = $1`,
    [userId]
  );

  const isPublic = user?.share_venue_activity ?? false;

  await db.query(`
    INSERT INTO venue_activity_log (
      venue_id, user_id, workout_session_id, activity_type,
      is_public, sets_count, reps_count, volume_kg, tu_earned,
      exercise_id, muscle_activations
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
    venueId, userId, workoutSessionId, activityType,
    isPublic, setsCount, repsCount, volumeKg, tuEarned,
    exerciseId, JSON.stringify(muscleActivations),
  ]);

  // Invalidate daily cache
  const today = new Date().toISOString().split('T')[0];
  const redisClient = getRedis();
  if (redisClient) {
    try {
      await redisClient.del(CACHE_KEYS.dailyActivity(venueId, today));
    } catch (e) {
      log.warn(`Cache invalidation failed: ${e}`);
    }
  }
}

// ============================================
// DAILY AGGREGATES
// ============================================

/**
 * Get or compute daily activity for a venue
 */
export async function getVenueActivityDaily(
  venueId: string,
  date: Date
): Promise<VenueActivityDaily | null> {
  const dateStr = date.toISOString().split('T')[0];
  const cacheKey = CACHE_KEYS.dailyActivity(venueId, dateStr);
  const redisClient = getRedis();

  // Try cache
  if (redisClient) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      log.warn(`Cache read failed: ${e}`);
    }
  }

  // Check if pre-computed aggregate exists
  const aggregate = await db.queryOne<any>(
    `SELECT * FROM venue_activity_daily WHERE venue_id = $1 AND activity_date = $2`,
    [venueId, dateStr]
  );

  if (aggregate) {
    const result = mapDailyRow(aggregate);

    if (redisClient) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL.DAILY);
      } catch (e) {
        log.warn(`Cache write failed: ${e}`);
      }
    }

    return result;
  }

  // Compute from activity log
  const computed = await computeDailyAggregate(venueId, date);

  if (redisClient && computed) {
    try {
      await redisClient.set(cacheKey, JSON.stringify(computed), 'EX', CACHE_TTL.DAILY);
    } catch (e) {
      log.warn(`Cache write failed: ${e}`);
    }
  }

  return computed;
}

/**
 * Compute daily aggregate from activity logs
 */
async function computeDailyAggregate(
  venueId: string,
  date: Date
): Promise<VenueActivityDaily | null> {
  const dateStr = date.toISOString().split('T')[0];

  // Get basic counts
  const stats = await db.queryOne<{
    total_users: string;
    public_users: string;
    total_workouts: string;
    total_sets: string;
    total_reps: string;
    total_volume: string;
    total_tu: string;
  }>(`
    SELECT
      COUNT(DISTINCT user_id) as total_users,
      COUNT(DISTINCT CASE WHEN is_public THEN user_id END) as public_users,
      COUNT(DISTINCT CASE WHEN activity_type = 'workout_end' THEN workout_session_id END) as total_workouts,
      SUM(sets_count) as total_sets,
      SUM(reps_count) as total_reps,
      SUM(volume_kg) as total_volume,
      SUM(tu_earned) as total_tu
    FROM venue_activity_log
    WHERE venue_id = $1 AND activity_date = $2
  `, [venueId, dateStr]);

  if (!stats || stats.total_users === '0') {
    return null;
  }

  // Get hourly distribution
  const hourly = await db.queryAll<{ hour: number; count: string }>(`
    SELECT activity_hour as hour, COUNT(DISTINCT user_id) as count
    FROM venue_activity_log
    WHERE venue_id = $1 AND activity_date = $2
    GROUP BY activity_hour
    ORDER BY activity_hour
  `, [venueId, dateStr]);

  const hourlyActivity = Array(24).fill(0);
  let busiestHour = 0;
  let maxCount = 0;

  for (const h of hourly) {
    hourlyActivity[h.hour] = parseInt(h.count);
    if (parseInt(h.count) > maxCount) {
      maxCount = parseInt(h.count);
      busiestHour = h.hour;
    }
  }

  // Get exercise breakdown
  const exercises = await db.queryAll<{
    exercise_id: string;
    exercise_name: string;
    count: string;
  }>(`
    SELECT val.exercise_id, e.name as exercise_name, COUNT(*) as count
    FROM venue_activity_log val
    JOIN exercises e ON e.id = val.exercise_id
    WHERE val.venue_id = $1 AND val.activity_date = $2 AND val.exercise_id IS NOT NULL
    GROUP BY val.exercise_id, e.name
    ORDER BY count DESC
    LIMIT 20
  `, [venueId, dateStr]);

  const totalExercises = exercises.reduce((sum, e) => sum + parseInt(e.count), 0);
  const exercisesBreakdown: ExerciseBreakdownItem[] = exercises.map(e => ({
    exerciseId: e.exercise_id,
    exerciseName: e.exercise_name,
    count: parseInt(e.count),
    percentage: totalExercises > 0 ? (parseInt(e.count) / totalExercises) * 100 : 0,
  }));

  // Aggregate muscle activations
  const muscleData = await db.queryAll<{ muscle_activations: Record<string, number> }>(`
    SELECT muscle_activations
    FROM venue_activity_log
    WHERE venue_id = $1 AND activity_date = $2 AND muscle_activations != '{}'::jsonb
  `, [venueId, dateStr]);

  const muscleAggregates: Record<string, number> = {};
  for (const row of muscleData) {
    if (row.muscle_activations) {
      for (const [muscle, value] of Object.entries(row.muscle_activations)) {
        muscleAggregates[muscle] = (muscleAggregates[muscle] || 0) + (value as number);
      }
    }
  }

  const totalMuscle = Object.values(muscleAggregates).reduce((a, b) => a + b, 0);
  const muscleActivations: MuscleActivationItem[] = Object.entries(muscleAggregates)
    .map(([muscleId, totalTu]) => ({
      muscleId,
      muscleName: formatMuscleName(muscleId),
      totalTu,
      percentage: totalMuscle > 0 ? (totalTu / totalMuscle) * 100 : 0,
    }))
    .sort((a, b) => b.totalTu - a.totalTu)
    .slice(0, 15);

  // Get records count
  const recordsCount = await db.queryOne<{ count: string }>(`
    SELECT COUNT(*) as count
    FROM venue_activity_log
    WHERE venue_id = $1 AND activity_date = $2 AND activity_type = 'record_claimed'
  `, [venueId, dateStr]);

  return {
    venueId,
    activityDate: date,
    totalUsers: parseInt(stats.total_users),
    publicUsers: parseInt(stats.public_users),
    totalWorkouts: parseInt(stats.total_workouts),
    totalSets: parseInt(stats.total_sets || '0'),
    totalReps: parseInt(stats.total_reps || '0'),
    totalVolumeKg: parseFloat(stats.total_volume || '0'),
    totalTu: parseFloat(stats.total_tu || '0'),
    exercisesBreakdown,
    muscleActivations,
    hourlyActivity,
    recordsSet: parseInt(recordsCount?.count || '0'),
    peakConcurrentUsers: maxCount,
    busiestHour: maxCount > 0 ? busiestHour : undefined,
  };
}

// ============================================
// ACTIVITY SUMMARIES
// ============================================

/**
 * Get activity summary for a venue over a date range
 */
export async function getVenueActivitySummary(
  venueId: string,
  startDate: Date,
  endDate: Date
): Promise<VenueActivitySummary> {
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  // Get daily aggregates
  const dailyData = await db.queryAll<any>(`
    SELECT *
    FROM venue_activity_daily
    WHERE venue_id = $1 AND activity_date BETWEEN $2 AND $3
    ORDER BY activity_date
  `, [venueId, startStr, endStr]);

  // Build time series
  const dailyWorkouts: DailyDataPoint[] = [];
  const dailyUsers: DailyDataPoint[] = [];
  const dailyRecords: DailyDataPoint[] = [];
  const dailyVolume: DailyDataPoint[] = [];

  let totalWorkouts = 0;
  let totalRecords = 0;
  let totalVolume = 0;
  let totalTu = 0;
  const exerciseAggregate: Record<string, { name: string; count: number }> = {};
  const muscleAggregate: Record<string, number> = {};
  const hourlyAggregate: number[] = Array(24).fill(0);
  const weekdayAggregate: number[][] = Array(7).fill(null).map(() => [0, 0]); // [users, workouts]
  const uniqueUsers = new Set<string>();

  for (const day of dailyData) {
    const date = new Date(day.activity_date);

    dailyWorkouts.push({ date, value: day.total_workouts });
    dailyUsers.push({ date, value: day.public_users });
    dailyRecords.push({ date, value: day.records_set });
    dailyVolume.push({ date, value: parseFloat(day.total_volume_kg) });

    totalWorkouts += day.total_workouts;
    totalRecords += day.records_set;
    totalVolume += parseFloat(day.total_volume_kg);
    totalTu += parseFloat(day.total_tu);

    // Aggregate exercise breakdown
    const exercises = day.exercises_breakdown || {};
    for (const [exerciseId, count] of Object.entries(exercises)) {
      if (!exerciseAggregate[exerciseId]) {
        exerciseAggregate[exerciseId] = { name: exerciseId, count: 0 };
      }
      exerciseAggregate[exerciseId].count += count as number;
    }

    // Aggregate muscle activations
    const muscles = day.muscle_activations || {};
    for (const [muscleId, value] of Object.entries(muscles)) {
      muscleAggregate[muscleId] = (muscleAggregate[muscleId] || 0) + (value as number);
    }

    // Aggregate hourly
    const hourly = day.hourly_activity || [];
    for (let i = 0; i < 24 && i < hourly.length; i++) {
      hourlyAggregate[i] += hourly[i];
    }

    // Aggregate weekday
    const dayOfWeek = date.getDay();
    weekdayAggregate[dayOfWeek][0] += day.public_users;
    weekdayAggregate[dayOfWeek][1] += day.total_workouts;
  }

  // Get unique users from activity log (for accurate count)
  const userCount = await db.queryOne<{ count: string }>(`
    SELECT COUNT(DISTINCT user_id) as count
    FROM venue_activity_log
    WHERE venue_id = $1 AND activity_date BETWEEN $2 AND $3 AND is_public = true
  `, [venueId, startStr, endStr]);

  // Calculate averages
  const numDays = dailyData.length || 1;
  const hourlyPattern: HourlyDataPoint[] = hourlyAggregate.map((total, hour) => ({
    hour,
    averageUsers: total / numDays,
    averageWorkouts: total / numDays, // Simplified
  }));

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekdayPattern: WeekdayDataPoint[] = weekdayAggregate.map((totals, dayOfWeek) => ({
    dayOfWeek,
    dayName: dayNames[dayOfWeek],
    averageUsers: numDays > 0 ? totals[0] / Math.ceil(numDays / 7) : 0,
    averageWorkouts: numDays > 0 ? totals[1] / Math.ceil(numDays / 7) : 0,
  }));

  // Format exercise distribution
  const totalExCount = Object.values(exerciseAggregate).reduce((sum, e) => sum + e.count, 0);
  const exerciseDistribution: ExerciseBreakdownItem[] = Object.entries(exerciseAggregate)
    .map(([exerciseId, data]) => ({
      exerciseId,
      exerciseName: data.name,
      count: data.count,
      percentage: totalExCount > 0 ? (data.count / totalExCount) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Format muscle distribution
  const totalMuscle = Object.values(muscleAggregate).reduce((a, b) => a + b, 0);
  const muscleDistribution: MuscleActivationItem[] = Object.entries(muscleAggregate)
    .map(([muscleId, totalTuValue]) => ({
      muscleId,
      muscleName: formatMuscleName(muscleId),
      totalTu: totalTuValue,
      percentage: totalMuscle > 0 ? (totalTuValue / totalMuscle) * 100 : 0,
    }))
    .sort((a, b) => b.totalTu - a.totalTu)
    .slice(0, 15);

  // Get top contributors (public only)
  const topContributors = await db.queryAll<{
    user_id: string;
    username: string;
    avatar_url: string | null;
    total_workouts: string;
    total_volume: string;
    records_held: string;
  }>(`
    SELECT
      val.user_id,
      u.username,
      u.avatar_url,
      COUNT(DISTINCT val.workout_session_id) as total_workouts,
      SUM(val.volume_kg) as total_volume,
      (SELECT COUNT(*) FROM venue_exercise_records ver
       WHERE ver.user_id = val.user_id AND ver.venue_id = $1) as records_held
    FROM venue_activity_log val
    JOIN users u ON u.id = val.user_id
    WHERE val.venue_id = $1
      AND val.activity_date BETWEEN $2 AND $3
      AND val.is_public = true
    GROUP BY val.user_id, u.username, u.avatar_url
    ORDER BY total_workouts DESC
    LIMIT 10
  `, [venueId, startStr, endStr]);

  // Get recent records
  const recentRecords = await db.queryAll<any>(`
    SELECT ver.*, u.username, u.avatar_url, e.name as exercise_name
    FROM venue_exercise_records ver
    JOIN users u ON u.id = ver.user_id
    JOIN exercises e ON e.id = ver.exercise_id
    WHERE ver.venue_id = $1
      AND ver.achieved_at BETWEEN $2 AND $3
      AND COALESCE(u.share_location_records, false) = true
    ORDER BY ver.achieved_at DESC
    LIMIT 10
  `, [venueId, startDate, endDate]);

  return {
    venueId,
    startDate,
    endDate,
    totalWorkouts,
    uniqueUsers: parseInt(userCount?.count || '0'),
    totalRecordsSet: totalRecords,
    totalVolumeKg: totalVolume,
    totalTu,
    dailyWorkouts,
    dailyUsers,
    dailyRecords,
    dailyVolume,
    exerciseDistribution,
    muscleDistribution,
    hourlyPattern,
    weekdayPattern,
    topContributors: topContributors.map(c => ({
      userId: c.user_id,
      username: c.username,
      avatarUrl: c.avatar_url ?? undefined,
      totalWorkouts: parseInt(c.total_workouts),
      totalVolumeKg: parseFloat(c.total_volume || '0'),
      recordsHeld: parseInt(c.records_held),
    })),
    recentRecords,
  };
}

/**
 * Get regional activity summary across multiple venues
 */
export async function getRegionalActivitySummary(
  options: {
    venueIds?: string[];
    borough?: string;
    latitude?: number;
    longitude?: number;
    radiusMeters?: number;
    startDate: Date;
    endDate: Date;
  }
): Promise<RegionalActivitySummary> {
  const { venueIds, borough, latitude, longitude, radiusMeters = 5000, startDate, endDate } = options;
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  let venueQuery = `SELECT * FROM fitness_venues WHERE is_active = true`;
  const params: (string | number | Date | string[])[] = [];
  let paramIndex = 1;

  if (venueIds && venueIds.length > 0) {
    venueQuery += ` AND id = ANY($${paramIndex}::text[])`;
    params.push(venueIds);
    paramIndex++;
  } else if (borough) {
    venueQuery += ` AND borough = $${paramIndex}`;
    params.push(borough);
    paramIndex++;
  } else if (latitude && longitude) {
    // Haversine distance filter (approximate for speed)
    const latDelta = radiusMeters / 111000; // 1 degree ≈ 111km
    const lngDelta = radiusMeters / (111000 * Math.cos(latitude * Math.PI / 180));

    venueQuery += ` AND latitude BETWEEN $${paramIndex} AND $${paramIndex + 1}
                    AND longitude BETWEEN $${paramIndex + 2} AND $${paramIndex + 3}`;
    params.push(latitude - latDelta, latitude + latDelta, longitude - lngDelta, longitude + lngDelta);
    paramIndex += 4;
  }

  const venues = await db.queryAll<any>(venueQuery, params);

  if (venues.length === 0) {
    return {
      venues: [],
      venueCount: 0,
      totalWorkouts: 0,
      uniqueUsers: 0,
      totalRecordsSet: 0,
      venueComparison: [],
      heatmapData: [],
    };
  }

  const venueIdList = venues.map(v => v.id);

  // Get aggregated stats
  const stats = await db.queryOne<{
    total_workouts: string;
    unique_users: string;
    total_records: string;
  }>(`
    SELECT
      SUM(total_workouts) as total_workouts,
      COUNT(DISTINCT venue_id) as venue_count,
      SUM(records_set) as total_records
    FROM venue_activity_daily
    WHERE venue_id = ANY($1) AND activity_date BETWEEN $2 AND $3
  `, [venueIdList, startStr, endStr]);

  const userCount = await db.queryOne<{ count: string }>(`
    SELECT COUNT(DISTINCT user_id) as count
    FROM venue_activity_log
    WHERE venue_id = ANY($1) AND activity_date BETWEEN $2 AND $3 AND is_public = true
  `, [venueIdList, startStr, endStr]);

  // Per-venue comparison
  const venueStats = await db.queryAll<{
    venue_id: string;
    venue_name: string;
    total_workouts: string;
    unique_users: string;
    total_records: string;
  }>(`
    SELECT
      fv.id as venue_id,
      fv.name as venue_name,
      COALESCE(SUM(vad.total_workouts), 0) as total_workouts,
      COALESCE(SUM(vad.public_users), 0) as unique_users,
      COALESCE(SUM(vad.records_set), 0) as total_records
    FROM fitness_venues fv
    LEFT JOIN venue_activity_daily vad ON vad.venue_id = fv.id
      AND vad.activity_date BETWEEN $2 AND $3
    WHERE fv.id = ANY($1)
    GROUP BY fv.id, fv.name
    ORDER BY total_workouts DESC
  `, [venueIdList, startStr, endStr]);

  // Heatmap data
  const maxWorkouts = Math.max(...venueStats.map(v => parseInt(v.total_workouts || '0')), 1);

  const heatmapData: VenueHeatmapPoint[] = venues.map(v => {
    const venueData = venueStats.find(vs => vs.venue_id === v.id);
    const workouts = parseInt(venueData?.total_workouts || '0');
    return {
      venueId: v.id,
      latitude: parseFloat(v.latitude),
      longitude: parseFloat(v.longitude),
      intensity: workouts / maxWorkouts,
      workouts,
    };
  });

  return {
    venues,
    venueCount: venues.length,
    totalWorkouts: parseInt(stats?.total_workouts || '0'),
    uniqueUsers: parseInt(userCount?.count || '0'),
    totalRecordsSet: parseInt(stats?.total_records || '0'),
    venueComparison: venueStats.map(v => ({
      venueId: v.venue_id,
      venueName: v.venue_name,
      workouts: parseInt(v.total_workouts),
      users: parseInt(v.unique_users),
      records: parseInt(v.total_records),
    })),
    heatmapData,
  };
}

// ============================================
// BACKGROUND JOBS
// ============================================

/**
 * Refresh daily aggregates for a venue
 * Called by background job
 */
export async function refreshDailyAggregate(
  venueId: string,
  date: Date
): Promise<void> {
  const computed = await computeDailyAggregate(venueId, date);

  if (!computed) {
    return;
  }

  const dateStr = date.toISOString().split('T')[0];

  await db.query(`
    INSERT INTO venue_activity_daily (
      venue_id, activity_date, total_users, public_users,
      total_workouts, total_sets, total_reps, total_volume_kg, total_tu,
      exercises_breakdown, muscle_activations, hourly_activity,
      records_set, peak_concurrent_users, busiest_hour,
      last_aggregated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
    ON CONFLICT (venue_id, activity_date)
    DO UPDATE SET
      total_users = EXCLUDED.total_users,
      public_users = EXCLUDED.public_users,
      total_workouts = EXCLUDED.total_workouts,
      total_sets = EXCLUDED.total_sets,
      total_reps = EXCLUDED.total_reps,
      total_volume_kg = EXCLUDED.total_volume_kg,
      total_tu = EXCLUDED.total_tu,
      exercises_breakdown = EXCLUDED.exercises_breakdown,
      muscle_activations = EXCLUDED.muscle_activations,
      hourly_activity = EXCLUDED.hourly_activity,
      records_set = EXCLUDED.records_set,
      peak_concurrent_users = EXCLUDED.peak_concurrent_users,
      busiest_hour = EXCLUDED.busiest_hour,
      last_aggregated_at = NOW(),
      aggregation_version = venue_activity_daily.aggregation_version + 1
  `, [
    venueId, dateStr,
    computed.totalUsers, computed.publicUsers,
    computed.totalWorkouts, computed.totalSets, computed.totalReps,
    computed.totalVolumeKg, computed.totalTu,
    JSON.stringify(computed.exercisesBreakdown.reduce((acc, e) => ({ ...acc, [e.exerciseId]: e.count }), {})),
    JSON.stringify(computed.muscleActivations.reduce((acc, m) => ({ ...acc, [m.muscleId]: m.totalTu }), {})),
    JSON.stringify(computed.hourlyActivity),
    computed.recordsSet, computed.peakConcurrentUsers, computed.busiestHour,
  ]);

  // Clear cache
  const redisClient = getRedis();
  if (redisClient) {
    try {
      await redisClient.del(CACHE_KEYS.dailyActivity(venueId, dateStr));
    } catch (e) {
      log.warn(`Cache clear failed: ${e}`);
    }
  }
}

/**
 * Refresh all daily aggregates for yesterday
 * Called at midnight by cron job
 */
export async function refreshYesterdayAggregates(): Promise<number> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  // Get all venues with activity yesterday
  const venues = await db.queryAll<{ venue_id: string }>(`
    SELECT DISTINCT venue_id
    FROM venue_activity_log
    WHERE activity_date = $1
  `, [dateStr]);

  log.info(`Refreshing daily aggregates for ${venues.length} venues for ${dateStr}`);

  for (const venue of venues) {
    try {
      await refreshDailyAggregate(venue.venue_id, yesterday);
    } catch (e) {
      log.error(`Failed to refresh aggregate for venue ${venue.venue_id}: ${e}`);
    }
  }

  return venues.length;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapDailyRow(row: any): VenueActivityDaily {
  const exercisesBreakdown: ExerciseBreakdownItem[] = [];
  const exercises = row.exercises_breakdown || {};
  const totalEx = Object.values(exercises).reduce((a: number, b: unknown) => a + (b as number), 0);

  for (const [exerciseId, count] of Object.entries(exercises)) {
    exercisesBreakdown.push({
      exerciseId,
      exerciseName: exerciseId, // Would need join for real name
      count: count as number,
      percentage: totalEx > 0 ? ((count as number) / totalEx) * 100 : 0,
    });
  }

  const muscleActivations: MuscleActivationItem[] = [];
  const muscles = row.muscle_activations || {};
  const totalMuscle = Object.values(muscles).reduce((a: number, b: unknown) => a + (b as number), 0);

  for (const [muscleId, value] of Object.entries(muscles)) {
    muscleActivations.push({
      muscleId,
      muscleName: formatMuscleName(muscleId),
      totalTu: value as number,
      percentage: totalMuscle > 0 ? ((value as number) / totalMuscle) * 100 : 0,
    });
  }

  return {
    venueId: row.venue_id,
    activityDate: new Date(row.activity_date),
    totalUsers: row.total_users,
    publicUsers: row.public_users,
    totalWorkouts: row.total_workouts,
    totalSets: row.total_sets,
    totalReps: row.total_reps,
    totalVolumeKg: parseFloat(row.total_volume_kg),
    totalTu: parseFloat(row.total_tu),
    exercisesBreakdown: exercisesBreakdown.sort((a, b) => b.count - a.count),
    muscleActivations: muscleActivations.sort((a, b) => b.totalTu - a.totalTu),
    hourlyActivity: row.hourly_activity || Array(24).fill(0),
    recordsSet: row.records_set,
    peakConcurrentUsers: row.peak_concurrent_users,
    busiestHour: row.busiest_hour,
  };
}

function formatMuscleName(muscleId: string): string {
  return muscleId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Export as named service
export const venueActivityService = {
  logActivity,
  getVenueActivityDaily,
  getVenueActivitySummary,
  getRegionalActivitySummary,
  refreshDailyAggregate,
  refreshYesterdayAggregates,
};
