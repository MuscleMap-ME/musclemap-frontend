/**
 * Enhanced Community Presence Service
 *
 * Adds advanced features:
 * - Training partner streaks and bonuses
 * - Quick status options
 * - Venue activity heatmaps
 * - Partner compatibility scoring
 * - Recurring training schedules
 */

import { queryAll, queryOne, query } from '../../db/client';
import { loggers } from '../../lib/logger';
import { earningService } from '../economy/earning.service';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

export type QuickStatusType =
  | 'none'
  | 'looking_for_spotter'
  | 'need_workout_buddy'
  | 'open_to_teach'
  | 'want_to_learn'
  | 'warming_up'
  | 'cooling_down'
  | 'taking_a_break'
  | 'last_set';

export interface TrainingPartnership {
  id: string;
  userId1: string;
  userId2: string;
  totalSessions: number;
  currentStreak: number;
  longestStreak: number;
  lastSessionDate: Date | null;
  totalCreditsEarned: number;
  favoriteVenues: string[];
  favoriteWorkoutTypes: string[];
  firstSessionAt: Date | null;
  createdAt: Date;
}

export interface PartnershipSession {
  id: string;
  partnershipId: string;
  sessionId: string | null;
  venueId: string | null;
  workoutType: string | null;
  durationMinutes: number | null;
  creditsAwarded: number;
  streakBonus: number;
  sessionDate: Date;
  createdAt: Date;
}

export interface VenueHourlyActivity {
  venueId: string;
  activityDate: Date;
  hourOfDay: number;
  dayOfWeek: number;
  checkInCount: number;
  uniqueUserCount: number;
  peakConcurrentUsers: number;
  avgSessionDurationMinutes: number;
  openToTrainCount: number;
  trainingSessionsCount: number;
}

export interface VenueWeeklyPattern {
  venueId: string;
  dayOfWeek: number;
  hourOfDay: number;
  avgCheckInCount: number;
  avgUniqueUsers: number;
  avgOpenToTrain: number;
  activityLevel: 'low' | 'medium' | 'high' | 'very_high';
  sampleSize: number;
}

export interface UserTrainingPreferences {
  userId: string;
  preferredExercises: string[];
  preferredMuscleGroups: string[];
  preferredWorkoutTypes: string[];
  typicalWorkoutDurationMinutes: number;
  experienceLevel: string | null;
  goals: string[];
  preferredDays: number[];
  preferredHours: number[];
  timezone: string;
  preferredGroupSize: number;
  openToBeginners: boolean;
  willingToTeach: boolean;
  lookingForMentor: boolean;
  communicationStyle: string | null;
  intensityPreference: string | null;
  favoriteVenueIds: string[];
  maxTravelDistanceKm: number;
}

export interface PartnerCompatibility {
  userId1: string;
  userId2: string;
  overallScore: number;
  scheduleCompatibility: number;
  workoutCompatibility: number;
  experienceCompatibility: number;
  socialCompatibility: number;
  commonExercises: string[];
  commonTimes: string[];
  compatibilityFactors: Record<string, unknown>;
}

export interface RecurringTrainingSchedule {
  id: string;
  creatorId: string;
  venueId: string | null;
  title: string;
  description: string | null;
  workoutType: string | null;
  targetMuscles: string[];
  durationMinutes: number;
  recurrenceType: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  daysOfWeek: number[];
  startTime: string;
  timezone: string;
  maxParticipants: number;
  requireApproval: boolean;
  allowGuests: boolean;
  isActive: boolean;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
}

export interface RecurringScheduleMember {
  id: string;
  scheduleId: string;
  userId: string;
  role: 'creator' | 'admin' | 'member';
  status: 'active' | 'paused' | 'left';
  notifyBeforeSession: boolean;
  notifyMinutesBefore: number;
  joinedAt: Date;
}

// ============================================
// QUICK STATUS CONSTANTS
// ============================================

export const QUICK_STATUS_OPTIONS: Record<QuickStatusType, { label: string; icon: string; defaultDuration: number }> = {
  none: { label: 'No Status', icon: '', defaultDuration: 0 },
  looking_for_spotter: { label: 'Looking for Spotter', icon: '🏋️', defaultDuration: 30 },
  need_workout_buddy: { label: 'Need Workout Buddy', icon: '👥', defaultDuration: 60 },
  open_to_teach: { label: 'Open to Teach', icon: '🎓', defaultDuration: 120 },
  want_to_learn: { label: 'Want to Learn', icon: '📚', defaultDuration: 120 },
  warming_up: { label: 'Warming Up', icon: '🔥', defaultDuration: 15 },
  cooling_down: { label: 'Cooling Down', icon: '❄️', defaultDuration: 15 },
  taking_a_break: { label: 'Taking a Break', icon: '☕', defaultDuration: 10 },
  last_set: { label: 'Last Set!', icon: '💪', defaultDuration: 5 },
};

// ============================================
// STREAK EARNING RULES
// ============================================

const STREAK_EARNING_RULES: Record<number, string> = {
  3: 'presence_streak_3',
  7: 'presence_streak_7',
  14: 'presence_streak_14',
  21: 'presence_streak_21',
  30: 'presence_streak_30',
};

// ============================================
// QUICK STATUS FUNCTIONS
// ============================================

/**
 * Set quick status for a user
 */
export async function setQuickStatus(
  userId: string,
  status: QuickStatusType,
  message?: string,
  durationMinutes?: number
): Promise<void> {
  const statusConfig = QUICK_STATUS_OPTIONS[status];
  const duration = durationMinutes || statusConfig.defaultDuration;
  const expiresAt = duration > 0 ? new Date(Date.now() + duration * 60000) : null;

  await query(
    `UPDATE user_presence SET
      quick_status = $2,
      quick_status_message = $3,
      quick_status_expires_at = $4,
      last_active_at = NOW()
     WHERE user_id = $1`,
    [userId, status, message, expiresAt]
  );

  // If no presence record exists, create one
  const existing = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM user_presence WHERE user_id = $1`,
    [userId]
  );

  if (!existing) {
    await query(
      `INSERT INTO user_presence (user_id, state, quick_status, quick_status_message, quick_status_expires_at)
       VALUES ($1, 'visible', $2, $3, $4)`,
      [userId, status, message, expiresAt]
    );
  }
}

/**
 * Clear expired quick statuses (call periodically)
 */
export async function clearExpiredQuickStatuses(): Promise<number> {
  const result = await query(
    `UPDATE user_presence SET
      quick_status = 'none',
      quick_status_message = NULL,
      quick_status_expires_at = NULL
     WHERE quick_status != 'none'
       AND quick_status_expires_at IS NOT NULL
       AND quick_status_expires_at < NOW()`
  );
  return result.rowCount || 0;
}

/**
 * Get users with a specific quick status nearby
 */
export async function getUsersWithQuickStatus(
  status: QuickStatusType,
  venueId?: string
): Promise<Array<{
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  quickStatusMessage: string | null;
  checkedInAt: Date | null;
}>> {
  let queryStr = `
    SELECT
      up.user_id,
      u.username,
      u.display_name,
      u.avatar_url,
      up.quick_status_message,
      vc.checked_in_at
    FROM user_presence up
    JOIN users u ON up.user_id = u.id
    LEFT JOIN venue_checkins vc ON up.user_id = vc.user_id AND vc.is_active = TRUE
    WHERE up.quick_status = $1
      AND (up.quick_status_expires_at IS NULL OR up.quick_status_expires_at > NOW())
  `;
  const params: unknown[] = [status];

  if (venueId) {
    queryStr += ` AND vc.venue_id = $2`;
    params.push(venueId);
  }

  const rows = await queryAll<{
    user_id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    quick_status_message: string | null;
    checked_in_at: Date | null;
  }>(queryStr, params);

  return rows.map(row => ({
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    quickStatusMessage: row.quick_status_message,
    checkedInAt: row.checked_in_at,
  }));
}

// ============================================
// TRAINING PARTNERSHIP FUNCTIONS
// ============================================

/**
 * Get or create a training partnership between two users
 */
export async function getOrCreatePartnership(
  userId1: string,
  userId2: string
): Promise<TrainingPartnership> {
  // Ensure consistent ordering
  const [user1, user2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

  let partnership = await queryOne<{
    id: string;
    user_id_1: string;
    user_id_2: string;
    total_sessions: number;
    current_streak: number;
    longest_streak: number;
    last_session_date: Date | null;
    total_credits_earned: number;
    favorite_venues: string[];
    favorite_workout_types: string[];
    first_session_at: Date | null;
    created_at: Date;
  }>(
    `SELECT * FROM training_partnerships WHERE user_id_1 = $1 AND user_id_2 = $2`,
    [user1, user2]
  );

  if (!partnership) {
    partnership = await queryOne(
      `INSERT INTO training_partnerships (user_id_1, user_id_2)
       VALUES ($1, $2)
       RETURNING *`,
      [user1, user2]
    );
  }

  return {
    id: partnership!.id,
    userId1: partnership!.user_id_1,
    userId2: partnership!.user_id_2,
    totalSessions: partnership!.total_sessions,
    currentStreak: partnership!.current_streak,
    longestStreak: partnership!.longest_streak,
    lastSessionDate: partnership!.last_session_date,
    totalCreditsEarned: partnership!.total_credits_earned,
    favoriteVenues: partnership!.favorite_venues || [],
    favoriteWorkoutTypes: partnership!.favorite_workout_types || [],
    firstSessionAt: partnership!.first_session_at,
    createdAt: partnership!.created_at,
  };
}

/**
 * Record a training session between partners
 */
export async function recordPartnershipSession(
  userId1: string,
  userId2: string,
  options: {
    sessionId?: string;
    venueId?: string;
    workoutType?: string;
    durationMinutes?: number;
  }
): Promise<{
  partnership: TrainingPartnership;
  session: PartnershipSession;
  streakMilestoneReached?: number;
  bonusCredits: number;
}> {
  const partnership = await getOrCreatePartnership(userId1, userId2);

  // Calculate streak bonus based on current streak (will be incremented by trigger)
  const newStreak = partnership.currentStreak + 1;
  const streakBonus = calculateStreakBonus(newStreak);

  // Base credits for training with a partner
  const baseCredits = 10;

  // Insert partnership session (trigger will update streak)
  const sessionRow = await queryOne<{
    id: string;
    partnership_id: string;
    session_id: string | null;
    venue_id: string | null;
    workout_type: string | null;
    duration_minutes: number | null;
    credits_awarded: number;
    streak_bonus: number;
    session_date: Date;
    created_at: Date;
  }>(
    `INSERT INTO partnership_sessions (
      partnership_id, session_id, venue_id, workout_type, duration_minutes,
      credits_awarded, streak_bonus, session_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
    RETURNING *`,
    [
      partnership.id,
      options.sessionId || null,
      options.venueId || null,
      options.workoutType || null,
      options.durationMinutes || null,
      baseCredits,
      streakBonus,
    ]
  );

  // Award credits to both users
  const totalCredits = baseCredits + streakBonus;
  await Promise.all([
    awardPartnershipCredits(userId1, totalCredits, partnership.id, newStreak),
    awardPartnershipCredits(userId2, totalCredits, partnership.id, newStreak),
  ]);

  // Check for streak milestone
  let streakMilestoneReached: number | undefined;
  if (STREAK_EARNING_RULES[newStreak]) {
    streakMilestoneReached = newStreak;
    // Award milestone bonus
    await Promise.all([
      awardStreakMilestone(userId1, newStreak, partnership.id),
      awardStreakMilestone(userId2, newStreak, partnership.id),
    ]);
  }

  // Refresh partnership data
  const updatedPartnership = await getOrCreatePartnership(userId1, userId2);

  return {
    partnership: updatedPartnership,
    session: {
      id: sessionRow!.id,
      partnershipId: sessionRow!.partnership_id,
      sessionId: sessionRow!.session_id,
      venueId: sessionRow!.venue_id,
      workoutType: sessionRow!.workout_type,
      durationMinutes: sessionRow!.duration_minutes,
      creditsAwarded: sessionRow!.credits_awarded,
      streakBonus: sessionRow!.streak_bonus,
      sessionDate: sessionRow!.session_date,
      createdAt: sessionRow!.created_at,
    },
    streakMilestoneReached,
    bonusCredits: streakBonus,
  };
}

/**
 * Get all training partnerships for a user
 */
export async function getUserPartnerships(
  userId: string
): Promise<Array<TrainingPartnership & { partnerUserId: string; partnerUsername: string }>> {
  const rows = await queryAll<{
    id: string;
    user_id_1: string;
    user_id_2: string;
    total_sessions: number;
    current_streak: number;
    longest_streak: number;
    last_session_date: Date | null;
    total_credits_earned: number;
    favorite_venues: string[];
    favorite_workout_types: string[];
    first_session_at: Date | null;
    created_at: Date;
    partner_id: string;
    partner_username: string;
  }>(
    `SELECT
      tp.*,
      CASE WHEN tp.user_id_1 = $1 THEN tp.user_id_2 ELSE tp.user_id_1 END AS partner_id,
      u.username AS partner_username
     FROM training_partnerships tp
     JOIN users u ON u.id = CASE WHEN tp.user_id_1 = $1 THEN tp.user_id_2 ELSE tp.user_id_1 END
     WHERE tp.user_id_1 = $1 OR tp.user_id_2 = $1
     ORDER BY tp.current_streak DESC, tp.total_sessions DESC`,
    [userId]
  );

  return rows.map(row => ({
    id: row.id,
    userId1: row.user_id_1,
    userId2: row.user_id_2,
    totalSessions: row.total_sessions,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastSessionDate: row.last_session_date,
    totalCreditsEarned: row.total_credits_earned,
    favoriteVenues: row.favorite_venues || [],
    favoriteWorkoutTypes: row.favorite_workout_types || [],
    firstSessionAt: row.first_session_at,
    createdAt: row.created_at,
    partnerUserId: row.partner_id,
    partnerUsername: row.partner_username,
  }));
}

// ============================================
// VENUE HEATMAP FUNCTIONS
// ============================================

/**
 * Get hourly activity data for a venue
 */
export async function getVenueHourlyActivity(
  venueId: string,
  startDate: Date,
  endDate: Date
): Promise<VenueHourlyActivity[]> {
  const rows = await queryAll<{
    venue_id: string;
    activity_date: Date;
    hour_of_day: number;
    day_of_week: number;
    check_in_count: number;
    unique_user_count: number;
    peak_concurrent_users: number;
    avg_session_duration_minutes: number;
    open_to_train_count: number;
    training_sessions_count: number;
  }>(
    `SELECT * FROM venue_hourly_activity
     WHERE venue_id = $1 AND activity_date BETWEEN $2 AND $3
     ORDER BY activity_date, hour_of_day`,
    [venueId, startDate, endDate]
  );

  return rows.map(row => ({
    venueId: row.venue_id,
    activityDate: row.activity_date,
    hourOfDay: row.hour_of_day,
    dayOfWeek: row.day_of_week,
    checkInCount: row.check_in_count,
    uniqueUserCount: row.unique_user_count,
    peakConcurrentUsers: row.peak_concurrent_users,
    avgSessionDurationMinutes: row.avg_session_duration_minutes,
    openToTrainCount: row.open_to_train_count,
    trainingSessionsCount: row.training_sessions_count,
  }));
}

/**
 * Get weekly patterns for a venue (predicted activity)
 */
export async function getVenueWeeklyPatterns(venueId: string): Promise<VenueWeeklyPattern[]> {
  const rows = await queryAll<{
    venue_id: string;
    day_of_week: number;
    hour_of_day: number;
    avg_check_in_count: number;
    avg_unique_users: number;
    avg_open_to_train: number;
    activity_level: string;
    sample_size: number;
  }>(
    `SELECT * FROM venue_weekly_patterns
     WHERE venue_id = $1
     ORDER BY day_of_week, hour_of_day`,
    [venueId]
  );

  return rows.map(row => ({
    venueId: row.venue_id,
    dayOfWeek: row.day_of_week,
    hourOfDay: row.hour_of_day,
    avgCheckInCount: Number(row.avg_check_in_count),
    avgUniqueUsers: Number(row.avg_unique_users),
    avgOpenToTrain: Number(row.avg_open_to_train),
    activityLevel: row.activity_level as VenueWeeklyPattern['activityLevel'],
    sampleSize: row.sample_size,
  }));
}

/**
 * Get best times to visit a venue (based on user preference)
 */
export async function getVenueBestTimes(
  venueId: string,
  preference: 'busy' | 'quiet' | 'social'
): Promise<Array<{ dayOfWeek: number; hourOfDay: number; score: number }>> {
  const patterns = await getVenueWeeklyPatterns(venueId);

  // Score each time slot based on preference
  const scored = patterns.map(pattern => {
    let score = 0;
    switch (preference) {
      case 'busy':
        score = pattern.avgCheckInCount * 10;
        break;
      case 'quiet':
        score = 100 - pattern.avgCheckInCount * 10;
        break;
      case 'social':
        score = pattern.avgOpenToTrain * 20 + pattern.avgCheckInCount * 5;
        break;
    }
    return {
      dayOfWeek: pattern.dayOfWeek,
      hourOfDay: pattern.hourOfDay,
      score: Math.max(0, Math.min(100, score)),
    };
  });

  // Sort by score descending and return top 10
  return scored.sort((a, b) => b.score - a.score).slice(0, 10);
}

/**
 * Trigger hourly activity aggregation
 */
export async function aggregateHourlyActivity(): Promise<void> {
  await query(`SELECT aggregate_venue_hourly_activity()`);
}

/**
 * Update weekly patterns from historical data
 */
export async function updateWeeklyPatterns(): Promise<void> {
  await query(`SELECT update_venue_weekly_patterns()`);
}

// ============================================
// PARTNER COMPATIBILITY FUNCTIONS
// ============================================

/**
 * Get or update training preferences for a user
 */
export async function upsertTrainingPreferences(
  userId: string,
  prefs: Partial<UserTrainingPreferences>
): Promise<UserTrainingPreferences> {
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM user_training_preferences WHERE user_id = $1`,
    [userId]
  );

  if (existing) {
    await query(
      `UPDATE user_training_preferences SET
        preferred_exercises = COALESCE($2, preferred_exercises),
        preferred_muscle_groups = COALESCE($3, preferred_muscle_groups),
        preferred_workout_types = COALESCE($4, preferred_workout_types),
        typical_workout_duration_minutes = COALESCE($5, typical_workout_duration_minutes),
        experience_level = COALESCE($6, experience_level),
        goals = COALESCE($7, goals),
        preferred_days = COALESCE($8, preferred_days),
        preferred_hours = COALESCE($9, preferred_hours),
        timezone = COALESCE($10, timezone),
        preferred_group_size = COALESCE($11, preferred_group_size),
        open_to_beginners = COALESCE($12, open_to_beginners),
        willing_to_teach = COALESCE($13, willing_to_teach),
        looking_for_mentor = COALESCE($14, looking_for_mentor),
        communication_style = COALESCE($15, communication_style),
        intensity_preference = COALESCE($16, intensity_preference),
        favorite_venue_ids = COALESCE($17, favorite_venue_ids),
        max_travel_distance_km = COALESCE($18, max_travel_distance_km),
        updated_at = NOW()
       WHERE user_id = $1`,
      [
        userId,
        prefs.preferredExercises ? JSON.stringify(prefs.preferredExercises) : null,
        prefs.preferredMuscleGroups ? JSON.stringify(prefs.preferredMuscleGroups) : null,
        prefs.preferredWorkoutTypes ? JSON.stringify(prefs.preferredWorkoutTypes) : null,
        prefs.typicalWorkoutDurationMinutes,
        prefs.experienceLevel,
        prefs.goals ? JSON.stringify(prefs.goals) : null,
        prefs.preferredDays ? JSON.stringify(prefs.preferredDays) : null,
        prefs.preferredHours ? JSON.stringify(prefs.preferredHours) : null,
        prefs.timezone,
        prefs.preferredGroupSize,
        prefs.openToBeginners,
        prefs.willingToTeach,
        prefs.lookingForMentor,
        prefs.communicationStyle,
        prefs.intensityPreference,
        prefs.favoriteVenueIds ? JSON.stringify(prefs.favoriteVenueIds) : null,
        prefs.maxTravelDistanceKm,
      ]
    );
  } else {
    await query(
      `INSERT INTO user_training_preferences (
        user_id, preferred_exercises, preferred_muscle_groups, preferred_workout_types,
        typical_workout_duration_minutes, experience_level, goals, preferred_days, preferred_hours,
        timezone, preferred_group_size, open_to_beginners, willing_to_teach, looking_for_mentor,
        communication_style, intensity_preference, favorite_venue_ids, max_travel_distance_km
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        userId,
        JSON.stringify(prefs.preferredExercises || []),
        JSON.stringify(prefs.preferredMuscleGroups || []),
        JSON.stringify(prefs.preferredWorkoutTypes || []),
        prefs.typicalWorkoutDurationMinutes || 60,
        prefs.experienceLevel || null,
        JSON.stringify(prefs.goals || []),
        JSON.stringify(prefs.preferredDays || []),
        JSON.stringify(prefs.preferredHours || []),
        prefs.timezone || 'America/New_York',
        prefs.preferredGroupSize || 2,
        prefs.openToBeginners ?? true,
        prefs.willingToTeach ?? false,
        prefs.lookingForMentor ?? false,
        prefs.communicationStyle || null,
        prefs.intensityPreference || null,
        JSON.stringify(prefs.favoriteVenueIds || []),
        prefs.maxTravelDistanceKm || 10,
      ]
    );
  }

  return getTrainingPreferences(userId) as Promise<UserTrainingPreferences>;
}

/**
 * Get training preferences for a user
 */
export async function getTrainingPreferences(userId: string): Promise<UserTrainingPreferences | null> {
  const row = await queryOne<{
    user_id: string;
    preferred_exercises: string[];
    preferred_muscle_groups: string[];
    preferred_workout_types: string[];
    typical_workout_duration_minutes: number;
    experience_level: string | null;
    goals: string[];
    preferred_days: number[];
    preferred_hours: number[];
    timezone: string;
    preferred_group_size: number;
    open_to_beginners: boolean;
    willing_to_teach: boolean;
    looking_for_mentor: boolean;
    communication_style: string | null;
    intensity_preference: string | null;
    favorite_venue_ids: string[];
    max_travel_distance_km: number;
  }>(
    `SELECT * FROM user_training_preferences WHERE user_id = $1`,
    [userId]
  );

  if (!row) return null;

  return {
    userId: row.user_id,
    preferredExercises: row.preferred_exercises || [],
    preferredMuscleGroups: row.preferred_muscle_groups || [],
    preferredWorkoutTypes: row.preferred_workout_types || [],
    typicalWorkoutDurationMinutes: row.typical_workout_duration_minutes,
    experienceLevel: row.experience_level,
    goals: row.goals || [],
    preferredDays: row.preferred_days || [],
    preferredHours: row.preferred_hours || [],
    timezone: row.timezone,
    preferredGroupSize: row.preferred_group_size,
    openToBeginners: row.open_to_beginners,
    willingToTeach: row.willing_to_teach,
    lookingForMentor: row.looking_for_mentor,
    communicationStyle: row.communication_style,
    intensityPreference: row.intensity_preference,
    favoriteVenueIds: row.favorite_venue_ids || [],
    maxTravelDistanceKm: row.max_travel_distance_km,
  };
}

/**
 * Calculate compatibility between two users
 */
export async function calculateCompatibility(
  userId1: string,
  userId2: string
): Promise<PartnerCompatibility> {
  const [prefs1, prefs2] = await Promise.all([
    getTrainingPreferences(userId1),
    getTrainingPreferences(userId2),
  ]);

  // Default preferences if none set
  const defaultPrefs: UserTrainingPreferences = {
    userId: '',
    preferredExercises: [],
    preferredMuscleGroups: [],
    preferredWorkoutTypes: [],
    typicalWorkoutDurationMinutes: 60,
    experienceLevel: 'intermediate',
    goals: [],
    preferredDays: [],
    preferredHours: [],
    timezone: 'America/New_York',
    preferredGroupSize: 2,
    openToBeginners: true,
    willingToTeach: false,
    lookingForMentor: false,
    communicationStyle: 'balanced',
    intensityPreference: 'moderate',
    favoriteVenueIds: [],
    maxTravelDistanceKm: 10,
  };

  const p1 = prefs1 || { ...defaultPrefs, userId: userId1 };
  const p2 = prefs2 || { ...defaultPrefs, userId: userId2 };

  // Calculate schedule compatibility (overlapping days/hours)
  const commonDays = p1.preferredDays.filter(d => p2.preferredDays.includes(d));
  const commonHours = p1.preferredHours.filter(h => p2.preferredHours.includes(h));
  const maxScheduleMatches = Math.max(p1.preferredDays.length, p2.preferredDays.length, 1) *
                             Math.max(p1.preferredHours.length, p2.preferredHours.length, 1);
  const scheduleMatches = commonDays.length * Math.max(commonHours.length, 1);
  const scheduleCompatibility = maxScheduleMatches > 0 ? (scheduleMatches / maxScheduleMatches) * 100 : 50;

  // Calculate workout compatibility
  const commonExercises = p1.preferredExercises.filter(e => p2.preferredExercises.includes(e));
  const commonWorkoutTypes = p1.preferredWorkoutTypes.filter(w => p2.preferredWorkoutTypes.includes(w));
  const commonMuscleGroups = p1.preferredMuscleGroups.filter(m => p2.preferredMuscleGroups.includes(m));
  const workoutOverlap = (commonExercises.length + commonWorkoutTypes.length * 2 + commonMuscleGroups.length) /
                         Math.max(p1.preferredExercises.length + p2.preferredExercises.length, 1);
  const workoutCompatibility = Math.min(100, workoutOverlap * 100 + 30); // Base 30%

  // Experience compatibility
  const expLevels: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
  const exp1 = expLevels[p1.experienceLevel || 'intermediate'] || 2;
  const exp2 = expLevels[p2.experienceLevel || 'intermediate'] || 2;
  const expDiff = Math.abs(exp1 - exp2);
  let experienceCompatibility = 100 - expDiff * 25;

  // Bonus if one wants to teach and other wants to learn
  if ((p1.willingToTeach && p2.lookingForMentor) || (p2.willingToTeach && p1.lookingForMentor)) {
    experienceCompatibility = Math.min(100, experienceCompatibility + 20);
  }

  // Penalty if beginner and other not open to beginners
  if (exp1 === 1 && !p2.openToBeginners || exp2 === 1 && !p1.openToBeginners) {
    experienceCompatibility = Math.max(0, experienceCompatibility - 30);
  }

  // Social compatibility
  let socialCompatibility = 50;
  if (p1.communicationStyle === p2.communicationStyle) socialCompatibility += 20;
  if (p1.intensityPreference === p2.intensityPreference) socialCompatibility += 20;
  if (Math.abs(p1.preferredGroupSize - p2.preferredGroupSize) <= 1) socialCompatibility += 10;
  socialCompatibility = Math.min(100, socialCompatibility);

  // Overall score (weighted average)
  const overallScore = (
    scheduleCompatibility * 0.3 +
    workoutCompatibility * 0.3 +
    experienceCompatibility * 0.25 +
    socialCompatibility * 0.15
  );

  const compatibility: PartnerCompatibility = {
    userId1,
    userId2,
    overallScore: Math.round(overallScore * 10) / 10,
    scheduleCompatibility: Math.round(scheduleCompatibility * 10) / 10,
    workoutCompatibility: Math.round(workoutCompatibility * 10) / 10,
    experienceCompatibility: Math.round(experienceCompatibility * 10) / 10,
    socialCompatibility: Math.round(socialCompatibility * 10) / 10,
    commonExercises,
    commonTimes: commonDays.map(d => `Day ${d}`),
    compatibilityFactors: {
      commonWorkoutTypes,
      commonMuscleGroups,
      teacherLearnerMatch: (p1.willingToTeach && p2.lookingForMentor) || (p2.willingToTeach && p1.lookingForMentor),
      intensityMatch: p1.intensityPreference === p2.intensityPreference,
    },
  };

  // Cache the result
  await cacheCompatibility(compatibility);

  return compatibility;
}

/**
 * Get suggested training partners for a user
 */
export async function getSuggestedPartners(
  userId: string,
  venueId?: string,
  limit: number = 10
): Promise<Array<PartnerCompatibility & { username: string; avatarUrl: string | null }>> {
  // Get users at the same venue or nearby
  let candidateQuery = `
    SELECT DISTINCT u.id, u.username, u.avatar_url
    FROM users u
    JOIN user_presence up ON u.id = up.user_id
    WHERE u.id != $1
      AND up.state != 'invisible'
  `;
  const params: unknown[] = [userId];

  if (venueId) {
    candidateQuery += ` AND up.venue_id = $2`;
    params.push(venueId);
  }

  candidateQuery += ` LIMIT 50`;

  const candidates = await queryAll<{
    id: string;
    username: string;
    avatar_url: string | null;
  }>(candidateQuery, params);

  // Calculate compatibility for each candidate
  const results: Array<PartnerCompatibility & { username: string; avatarUrl: string | null }> = [];

  for (const candidate of candidates) {
    try {
      const compatibility = await calculateCompatibility(userId, candidate.id);
      results.push({
        ...compatibility,
        username: candidate.username,
        avatarUrl: candidate.avatar_url,
      });
    } catch (err) {
      log.warn({ error: err, candidateId: candidate.id }, 'Failed to calculate compatibility');
    }
  }

  // Sort by overall score and return top matches
  return results.sort((a, b) => b.overallScore - a.overallScore).slice(0, limit);
}

// ============================================
// RECURRING SCHEDULE FUNCTIONS
// ============================================

/**
 * Create a recurring training schedule
 */
export async function createRecurringSchedule(
  creatorId: string,
  schedule: Omit<RecurringTrainingSchedule, 'id' | 'createdAt'>
): Promise<RecurringTrainingSchedule> {
  const result = await queryOne<{ id: string }>(
    `INSERT INTO recurring_training_schedules (
      creator_id, venue_id, title, description, workout_type, target_muscles,
      duration_minutes, recurrence_type, days_of_week, start_time, timezone,
      max_participants, require_approval, allow_guests, is_active, start_date, end_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING id`,
    [
      creatorId,
      schedule.venueId,
      schedule.title,
      schedule.description,
      schedule.workoutType,
      JSON.stringify(schedule.targetMuscles || []),
      schedule.durationMinutes,
      schedule.recurrenceType,
      JSON.stringify(schedule.daysOfWeek),
      schedule.startTime,
      schedule.timezone,
      schedule.maxParticipants,
      schedule.requireApproval,
      schedule.allowGuests,
      schedule.isActive,
      schedule.startDate,
      schedule.endDate,
    ]
  );

  // Add creator as a member with 'creator' role
  await query(
    `INSERT INTO recurring_schedule_members (schedule_id, user_id, role)
     VALUES ($1, $2, 'creator')`,
    [result!.id, creatorId]
  );

  return getRecurringSchedule(result!.id) as Promise<RecurringTrainingSchedule>;
}

/**
 * Get a recurring schedule by ID
 */
export async function getRecurringSchedule(scheduleId: string): Promise<RecurringTrainingSchedule | null> {
  const row = await queryOne<{
    id: string;
    creator_id: string;
    venue_id: string | null;
    title: string;
    description: string | null;
    workout_type: string | null;
    target_muscles: string[];
    duration_minutes: number;
    recurrence_type: string;
    days_of_week: number[];
    start_time: string;
    timezone: string;
    max_participants: number;
    require_approval: boolean;
    allow_guests: boolean;
    is_active: boolean;
    start_date: Date;
    end_date: Date | null;
    created_at: Date;
  }>(
    `SELECT * FROM recurring_training_schedules WHERE id = $1`,
    [scheduleId]
  );

  if (!row) return null;

  return {
    id: row.id,
    creatorId: row.creator_id,
    venueId: row.venue_id,
    title: row.title,
    description: row.description,
    workoutType: row.workout_type,
    targetMuscles: row.target_muscles || [],
    durationMinutes: row.duration_minutes,
    recurrenceType: row.recurrence_type as RecurringTrainingSchedule['recurrenceType'],
    daysOfWeek: row.days_of_week || [],
    startTime: row.start_time,
    timezone: row.timezone,
    maxParticipants: row.max_participants,
    requireApproval: row.require_approval,
    allowGuests: row.allow_guests,
    isActive: row.is_active,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
  };
}

/**
 * Get recurring schedules for a user
 */
export async function getUserRecurringSchedules(userId: string): Promise<RecurringTrainingSchedule[]> {
  const rows = await queryAll<{ schedule_id: string }>(
    `SELECT schedule_id FROM recurring_schedule_members
     WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );

  const schedules: RecurringTrainingSchedule[] = [];
  for (const row of rows) {
    const schedule = await getRecurringSchedule(row.schedule_id);
    if (schedule && schedule.isActive) {
      schedules.push(schedule);
    }
  }

  return schedules;
}

/**
 * Join a recurring schedule
 */
export async function joinRecurringSchedule(
  scheduleId: string,
  userId: string
): Promise<RecurringScheduleMember> {
  const schedule = await getRecurringSchedule(scheduleId);
  if (!schedule) {
    throw new Error('Schedule not found');
  }

  // Check current member count
  const memberCount = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM recurring_schedule_members
     WHERE schedule_id = $1 AND status = 'active'`,
    [scheduleId]
  );

  if (memberCount && memberCount.count >= schedule.maxParticipants) {
    throw new Error('Schedule is full');
  }

  const result = await queryOne<{
    id: string;
    schedule_id: string;
    user_id: string;
    role: string;
    status: string;
    notify_before_session: boolean;
    notify_minutes_before: number;
    joined_at: Date;
  }>(
    `INSERT INTO recurring_schedule_members (schedule_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (schedule_id, user_id) DO UPDATE SET
       status = 'active',
       joined_at = NOW()
     RETURNING *`,
    [scheduleId, userId]
  );

  return {
    id: result!.id,
    scheduleId: result!.schedule_id,
    userId: result!.user_id,
    role: result!.role as RecurringScheduleMember['role'],
    status: result!.status as RecurringScheduleMember['status'],
    notifyBeforeSession: result!.notify_before_session,
    notifyMinutesBefore: result!.notify_minutes_before,
    joinedAt: result!.joined_at,
  };
}

/**
 * Leave a recurring schedule
 */
export async function leaveRecurringSchedule(
  scheduleId: string,
  userId: string
): Promise<void> {
  await query(
    `UPDATE recurring_schedule_members SET
      status = 'left',
      left_at = NOW()
     WHERE schedule_id = $1 AND user_id = $2`,
    [scheduleId, userId]
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate streak bonus based on current streak
 */
function calculateStreakBonus(streak: number): number {
  if (streak >= 30) return 100;
  if (streak >= 21) return 75;
  if (streak >= 14) return 50;
  if (streak >= 7) return 25;
  if (streak >= 3) return 10;
  return 0;
}

/**
 * Award credits for partnership session
 */
async function awardPartnershipCredits(
  userId: string,
  amount: number,
  partnershipId: string,
  currentStreak: number
): Promise<void> {
  try {
    await earningService.processEarning({
      userId,
      ruleCode: 'presence_training_partner',
      sourceType: 'training_partnership',
      sourceId: partnershipId,
      metadata: { currentStreak, amount },
    });
  } catch (err) {
    log.warn({ error: err, userId, partnershipId }, 'Failed to award partnership credits');
  }
}

/**
 * Award credits for streak milestone
 */
async function awardStreakMilestone(
  userId: string,
  streak: number,
  partnershipId: string
): Promise<void> {
  const ruleCode = STREAK_EARNING_RULES[streak];
  if (!ruleCode) return;

  try {
    await earningService.processEarning({
      userId,
      ruleCode,
      sourceType: 'training_partnership',
      sourceId: partnershipId,
      metadata: { streak },
    });
  } catch (err) {
    log.warn({ error: err, userId, streak }, 'Failed to award streak milestone credits');
  }
}

/**
 * Cache compatibility score
 */
async function cacheCompatibility(compatibility: PartnerCompatibility): Promise<void> {
  const [user1, user2] = compatibility.userId1 < compatibility.userId2
    ? [compatibility.userId1, compatibility.userId2]
    : [compatibility.userId2, compatibility.userId1];

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  try {
    await query(
      `INSERT INTO partner_compatibility_cache (
        user_id_1, user_id_2, overall_score, schedule_compatibility,
        workout_compatibility, experience_compatibility, social_compatibility,
        common_exercises, common_times, compatibility_factors, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id_1, user_id_2) DO UPDATE SET
        overall_score = EXCLUDED.overall_score,
        schedule_compatibility = EXCLUDED.schedule_compatibility,
        workout_compatibility = EXCLUDED.workout_compatibility,
        experience_compatibility = EXCLUDED.experience_compatibility,
        social_compatibility = EXCLUDED.social_compatibility,
        common_exercises = EXCLUDED.common_exercises,
        common_times = EXCLUDED.common_times,
        compatibility_factors = EXCLUDED.compatibility_factors,
        calculated_at = NOW(),
        expires_at = EXCLUDED.expires_at`,
      [
        user1,
        user2,
        compatibility.overallScore,
        compatibility.scheduleCompatibility,
        compatibility.workoutCompatibility,
        compatibility.experienceCompatibility,
        compatibility.socialCompatibility,
        JSON.stringify(compatibility.commonExercises),
        JSON.stringify(compatibility.commonTimes),
        JSON.stringify(compatibility.compatibilityFactors),
        expiresAt,
      ]
    );
  } catch (err) {
    log.warn({ error: err }, 'Failed to cache compatibility');
  }
}
