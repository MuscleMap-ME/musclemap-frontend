/**
 * Sleep Hygiene Service
 *
 * Handles sleep hygiene preferences, tips, assessments, streaks,
 * and credit rewards for good sleep habits.
 */

import { queryOne, queryAll, execute } from '../../db/client';
import { loggers } from '../../lib/logger';
import { creditService } from '../economy/credit.service';
import type {
  SleepHygienePreferences,
  UpdateSleepHygienePreferencesInput,
  SleepHygieneTip,
  SleepHygieneTipWithInteraction,
  SleepHygieneAssessment,
  CreateSleepHygieneAssessmentInput,
  UpdateSleepHygieneAssessmentInput,
  SleepHygieneStreak,
  SleepStreakType,
  SleepCreditAward,
  SleepCreditAwardType,
  SleepHygieneDashboard,
  PreSleepChecklist,
  PostSleepChecklist,
  SleepHygieneTipCategory,
} from './types';
import { SLEEP_CREDIT_AMOUNTS } from './types';

const log = loggers.api;

// ============================================
// PREFERENCES
// ============================================

/**
 * Get or create sleep hygiene preferences for a user
 */
export async function getOrCreatePreferences(userId: string): Promise<SleepHygienePreferences> {
  const existing = await queryOne<any>(
    `SELECT * FROM sleep_hygiene_preferences WHERE user_id = $1`,
    [userId]
  );

  if (existing) {
    return mapRowToPreferences(existing);
  }

  // Create default preferences
  const id = `shp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await execute(
    `INSERT INTO sleep_hygiene_preferences (id, user_id) VALUES ($1, $2)`,
    [id, userId]
  );

  const newPrefs = await queryOne<any>(
    `SELECT * FROM sleep_hygiene_preferences WHERE id = $1`,
    [id]
  );

  return mapRowToPreferences(newPrefs!);
}

/**
 * Update sleep hygiene preferences
 */
export async function updatePreferences(
  userId: string,
  input: UpdateSleepHygienePreferencesInput
): Promise<SleepHygienePreferences> {
  await getOrCreatePreferences(userId); // Ensure exists

  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.enabled !== undefined) {
    updates.push(`enabled = $${paramIndex++}`);
    values.push(input.enabled);
  }
  if (input.showOnDashboard !== undefined) {
    updates.push(`show_on_dashboard = $${paramIndex++}`);
    values.push(input.showOnDashboard);
  }
  if (input.showTips !== undefined) {
    updates.push(`show_tips = $${paramIndex++}`);
    values.push(input.showTips);
  }
  if (input.showAssessments !== undefined) {
    updates.push(`show_assessments = $${paramIndex++}`);
    values.push(input.showAssessments);
  }
  if (input.bedtimeReminderEnabled !== undefined) {
    updates.push(`bedtime_reminder_enabled = $${paramIndex++}`);
    values.push(input.bedtimeReminderEnabled);
  }
  if (input.bedtimeReminderMinutesBefore !== undefined) {
    updates.push(`bedtime_reminder_minutes_before = $${paramIndex++}`);
    values.push(input.bedtimeReminderMinutesBefore);
  }
  if (input.morningCheckInEnabled !== undefined) {
    updates.push(`morning_check_in_enabled = $${paramIndex++}`);
    values.push(input.morningCheckInEnabled);
  }
  if (input.weeklyReportEnabled !== undefined) {
    updates.push(`weekly_report_enabled = $${paramIndex++}`);
    values.push(input.weeklyReportEnabled);
  }
  if (input.earnCreditsEnabled !== undefined) {
    updates.push(`earn_credits_enabled = $${paramIndex++}`);
    values.push(input.earnCreditsEnabled);
  }

  if (updates.length > 0) {
    updates.push(`updated_at = NOW()`);
    values.push(userId);

    await execute(
      `UPDATE sleep_hygiene_preferences SET ${updates.join(', ')} WHERE user_id = $${paramIndex}`,
      values
    );
  }

  return getOrCreatePreferences(userId);
}

/**
 * Enable sleep hygiene for a user
 */
export async function enableSleepHygiene(userId: string): Promise<SleepHygienePreferences> {
  return updatePreferences(userId, { enabled: true });
}

/**
 * Disable sleep hygiene for a user
 */
export async function disableSleepHygiene(userId: string): Promise<SleepHygienePreferences> {
  return updatePreferences(userId, { enabled: false });
}

// ============================================
// TIPS
// ============================================

/**
 * Get all active sleep hygiene tips
 */
export async function getAllTips(): Promise<SleepHygieneTip[]> {
  const rows = await queryAll<any>(
    `SELECT * FROM sleep_hygiene_tips WHERE is_active = TRUE ORDER BY priority DESC, display_order ASC`
  );

  return rows.map(mapRowToTip);
}

/**
 * Get tips by category
 */
export async function getTipsByCategory(category: SleepHygieneTipCategory): Promise<SleepHygieneTip[]> {
  const rows = await queryAll<any>(
    `SELECT * FROM sleep_hygiene_tips WHERE is_active = TRUE AND category = $1 ORDER BY priority DESC, display_order ASC`,
    [category]
  );

  return rows.map(mapRowToTip);
}

/**
 * Get tips with user interaction state
 */
export async function getTipsForUser(
  userId: string,
  options: { category?: SleepHygieneTipCategory; limit?: number } = {}
): Promise<SleepHygieneTipWithInteraction[]> {
  const { category, limit = 20 } = options;

  let sql = `
    SELECT t.*,
           COALESCE(i.is_bookmarked, FALSE) as is_bookmarked,
           COALESCE(i.is_dismissed, FALSE) as is_dismissed,
           COALESCE(i.is_following, FALSE) as is_following,
           COALESCE(i.times_shown, 0) as times_shown
    FROM sleep_hygiene_tips t
    LEFT JOIN sleep_hygiene_tip_interactions i ON t.id = i.tip_id AND i.user_id = $1
    WHERE t.is_active = TRUE
  `;

  const params: unknown[] = [userId];
  let paramIndex = 2;

  if (category) {
    sql += ` AND t.category = $${paramIndex++}`;
    params.push(category);
  }

  sql += ` ORDER BY t.priority DESC, t.display_order ASC LIMIT $${paramIndex}`;
  params.push(limit);

  const rows = await queryAll<any>(sql, params);
  return rows.map(mapRowToTipWithInteraction);
}

/**
 * Get bookmarked tips for user
 */
export async function getBookmarkedTips(userId: string): Promise<SleepHygieneTipWithInteraction[]> {
  const rows = await queryAll<any>(
    `SELECT t.*,
            TRUE as is_bookmarked,
            COALESCE(i.is_dismissed, FALSE) as is_dismissed,
            COALESCE(i.is_following, FALSE) as is_following,
            COALESCE(i.times_shown, 0) as times_shown
     FROM sleep_hygiene_tips t
     INNER JOIN sleep_hygiene_tip_interactions i ON t.id = i.tip_id AND i.user_id = $1
     WHERE t.is_active = TRUE AND i.is_bookmarked = TRUE
     ORDER BY i.bookmarked_at DESC`,
    [userId]
  );

  return rows.map(mapRowToTipWithInteraction);
}

/**
 * Bookmark a tip
 */
export async function bookmarkTip(userId: string, tipId: string): Promise<void> {
  await execute(
    `INSERT INTO sleep_hygiene_tip_interactions (user_id, tip_id, is_bookmarked, bookmarked_at)
     VALUES ($1, $2, TRUE, NOW())
     ON CONFLICT (user_id, tip_id) DO UPDATE SET
       is_bookmarked = TRUE,
       bookmarked_at = NOW(),
       updated_at = NOW()`,
    [userId, tipId]
  );
}

/**
 * Unbookmark a tip
 */
export async function unbookmarkTip(userId: string, tipId: string): Promise<void> {
  await execute(
    `UPDATE sleep_hygiene_tip_interactions
     SET is_bookmarked = FALSE, updated_at = NOW()
     WHERE user_id = $1 AND tip_id = $2`,
    [userId, tipId]
  );
}

/**
 * Mark tip as following (user is actively trying this tip)
 */
export async function followTip(userId: string, tipId: string): Promise<void> {
  await execute(
    `INSERT INTO sleep_hygiene_tip_interactions (user_id, tip_id, is_following, following_since)
     VALUES ($1, $2, TRUE, NOW())
     ON CONFLICT (user_id, tip_id) DO UPDATE SET
       is_following = TRUE,
       following_since = CASE WHEN sleep_hygiene_tip_interactions.is_following = FALSE THEN NOW() ELSE sleep_hygiene_tip_interactions.following_since END,
       updated_at = NOW()`,
    [userId, tipId]
  );
}

/**
 * Stop following a tip
 */
export async function unfollowTip(userId: string, tipId: string): Promise<void> {
  await execute(
    `UPDATE sleep_hygiene_tip_interactions
     SET is_following = FALSE, updated_at = NOW()
     WHERE user_id = $1 AND tip_id = $2`,
    [userId, tipId]
  );
}

/**
 * Mark tip as helpful
 */
export async function markTipHelpful(userId: string, tipId: string, helpful: boolean): Promise<void> {
  const column = helpful ? 'times_helpful' : 'times_not_helpful';
  await execute(
    `INSERT INTO sleep_hygiene_tip_interactions (user_id, tip_id, ${column})
     VALUES ($1, $2, 1)
     ON CONFLICT (user_id, tip_id) DO UPDATE SET
       ${column} = sleep_hygiene_tip_interactions.${column} + 1,
       updated_at = NOW()`,
    [userId, tipId]
  );
}

/**
 * Dismiss a tip
 */
export async function dismissTip(userId: string, tipId: string): Promise<void> {
  await execute(
    `INSERT INTO sleep_hygiene_tip_interactions (user_id, tip_id, is_dismissed)
     VALUES ($1, $2, TRUE)
     ON CONFLICT (user_id, tip_id) DO UPDATE SET
       is_dismissed = TRUE,
       updated_at = NOW()`,
    [userId, tipId]
  );
}

// ============================================
// ASSESSMENTS
// ============================================

/**
 * Get today's assessment for user
 */
export async function getTodayAssessment(userId: string): Promise<SleepHygieneAssessment | null> {
  const today = new Date().toISOString().split('T')[0];
  return getAssessmentByDate(userId, today);
}

/**
 * Get assessment by date
 */
export async function getAssessmentByDate(userId: string, date: string): Promise<SleepHygieneAssessment | null> {
  const row = await queryOne<any>(
    `SELECT * FROM sleep_hygiene_assessments WHERE user_id = $1 AND assessment_date = $2`,
    [userId, date]
  );

  if (!row) return null;
  return mapRowToAssessment(row);
}

/**
 * Get assessment history
 */
export async function getAssessmentHistory(
  userId: string,
  limit: number = 30
): Promise<SleepHygieneAssessment[]> {
  const rows = await queryAll<any>(
    `SELECT * FROM sleep_hygiene_assessments
     WHERE user_id = $1
     ORDER BY assessment_date DESC
     LIMIT $2`,
    [userId, limit]
  );

  return rows.map(mapRowToAssessment);
}

/**
 * Create or update sleep hygiene assessment
 */
export async function upsertAssessment(
  userId: string,
  input: CreateSleepHygieneAssessmentInput
): Promise<{ assessment: SleepHygieneAssessment; creditsAwarded: number }> {
  const assessmentDate = input.assessmentDate || new Date().toISOString().split('T')[0];
  const id = `sha_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Calculate scores
  const preSleepScore = calculatePreSleepScore(input.preSleepChecklist || {});
  const postSleepScore = calculatePostSleepScore(input.postSleepChecklist || {});
  const overallScore = Math.round((preSleepScore + postSleepScore) / 2);

  // Upsert assessment
  await execute(
    `INSERT INTO sleep_hygiene_assessments (
      id, user_id, assessment_date, pre_sleep_checklist, post_sleep_checklist,
      pre_sleep_score, post_sleep_score, overall_score, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (user_id, assessment_date) DO UPDATE SET
      pre_sleep_checklist = COALESCE($4, sleep_hygiene_assessments.pre_sleep_checklist),
      post_sleep_checklist = COALESCE($5, sleep_hygiene_assessments.post_sleep_checklist),
      pre_sleep_score = $6,
      post_sleep_score = $7,
      overall_score = $8,
      notes = COALESCE($9, sleep_hygiene_assessments.notes),
      updated_at = NOW()`,
    [
      id,
      userId,
      assessmentDate,
      JSON.stringify(input.preSleepChecklist || {}),
      JSON.stringify(input.postSleepChecklist || {}),
      preSleepScore,
      postSleepScore,
      overallScore,
      input.notes || null,
    ]
  );

  // Award credits based on assessment
  const creditsAwarded = await awardAssessmentCredits(userId, assessmentDate, overallScore);

  // Get updated assessment
  const assessment = await getAssessmentByDate(userId, assessmentDate);

  // Update streaks
  await updateSleepStreaks(userId, assessmentDate, {
    hasChecklist: Object.keys(input.preSleepChecklist || {}).length > 0,
    isPerfect: overallScore === 100,
    avoidedScreens: input.preSleepChecklist?.avoidedScreens1hr === true,
  });

  return {
    assessment: assessment!,
    creditsAwarded,
  };
}

/**
 * Update an existing assessment
 */
export async function updateAssessment(
  userId: string,
  date: string,
  input: UpdateSleepHygieneAssessmentInput
): Promise<SleepHygieneAssessment | null> {
  const existing = await getAssessmentByDate(userId, date);
  if (!existing) return null;

  // Merge checklists
  const preSleepChecklist = { ...existing.preSleepChecklist, ...(input.preSleepChecklist || {}) };
  const postSleepChecklist = { ...existing.postSleepChecklist, ...(input.postSleepChecklist || {}) };

  // Recalculate scores
  const preSleepScore = calculatePreSleepScore(preSleepChecklist);
  const postSleepScore = calculatePostSleepScore(postSleepChecklist);
  const overallScore = Math.round((preSleepScore + postSleepScore) / 2);

  await execute(
    `UPDATE sleep_hygiene_assessments SET
      pre_sleep_checklist = $1,
      post_sleep_checklist = $2,
      pre_sleep_score = $3,
      post_sleep_score = $4,
      overall_score = $5,
      notes = COALESCE($6, notes),
      updated_at = NOW()
     WHERE user_id = $7 AND assessment_date = $8`,
    [
      JSON.stringify(preSleepChecklist),
      JSON.stringify(postSleepChecklist),
      preSleepScore,
      postSleepScore,
      overallScore,
      input.notes || null,
      userId,
      date,
    ]
  );

  return getAssessmentByDate(userId, date);
}

// ============================================
// STREAKS
// ============================================

/**
 * Get all streaks for user
 */
export async function getStreaks(userId: string): Promise<SleepHygieneStreak[]> {
  const rows = await queryAll<any>(
    `SELECT * FROM sleep_hygiene_streaks WHERE user_id = $1 ORDER BY current_streak DESC`,
    [userId]
  );

  return rows.map(mapRowToStreak);
}

/**
 * Get a specific streak
 */
export async function getStreak(userId: string, streakType: SleepStreakType): Promise<SleepHygieneStreak | null> {
  const row = await queryOne<any>(
    `SELECT * FROM sleep_hygiene_streaks WHERE user_id = $1 AND streak_type = $2`,
    [userId, streakType]
  );

  if (!row) return null;
  return mapRowToStreak(row);
}

/**
 * Update streaks based on sleep activity
 * Called after logging sleep or completing assessment
 */
export async function updateSleepStreaks(
  userId: string,
  activityDate: string,
  context: {
    hasChecklist?: boolean;
    isPerfect?: boolean;
    avoidedScreens?: boolean;
    sleepQuality?: number;
    metDurationTarget?: boolean;
    wasConsistentBedtime?: boolean;
  }
): Promise<void> {
  const streakTypes: SleepStreakType[] = [];

  // Always update sleep_logged streak
  streakTypes.push('sleep_logged');

  if (context.hasChecklist) {
    streakTypes.push('hygiene_checklist');
  }

  if (context.isPerfect) {
    streakTypes.push('perfect_hygiene');
  }

  if (context.avoidedScreens) {
    streakTypes.push('no_screens');
  }

  if (context.sleepQuality && context.sleepQuality >= 4) {
    streakTypes.push('good_quality');
  }

  if (context.sleepQuality && context.sleepQuality === 5) {
    streakTypes.push('excellent_quality');
  }

  if (context.metDurationTarget) {
    streakTypes.push('target_duration_met');
  }

  if (context.wasConsistentBedtime) {
    streakTypes.push('consistent_bedtime');
  }

  for (const streakType of streakTypes) {
    await updateStreak(userId, streakType, activityDate);
  }
}

/**
 * Update a single streak
 */
async function updateStreak(userId: string, streakType: SleepStreakType, activityDate: string): Promise<void> {
  const id = `shs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Get existing streak
  const existing = await getStreak(userId, streakType);

  if (!existing) {
    // Create new streak
    await execute(
      `INSERT INTO sleep_hygiene_streaks (id, user_id, streak_type, current_streak, current_streak_start, best_streak, best_streak_start, last_activity_date)
       VALUES ($1, $2, $3, 1, $4, 1, $4, $4)`,
      [id, userId, streakType, activityDate]
    );

    // Check for streak milestones (1 day = new streak started)
    await checkStreakMilestones(userId, streakType, 1);
    return;
  }

  // Check if continuing streak or breaking
  const lastDate = existing.lastActivityDate;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const isConsecutive = lastDate === yesterdayStr || lastDate === activityDate;

  if (isConsecutive && lastDate !== activityDate) {
    // Continuing streak
    const newStreak = existing.currentStreak + 1;
    const isBest = newStreak > existing.bestStreak;

    await execute(
      `UPDATE sleep_hygiene_streaks SET
        current_streak = $1,
        best_streak = GREATEST(best_streak, $1),
        best_streak_start = CASE WHEN $1 > best_streak THEN current_streak_start ELSE best_streak_start END,
        best_streak_end = CASE WHEN $1 > best_streak THEN $2 ELSE best_streak_end END,
        last_activity_date = $2,
        updated_at = NOW()
       WHERE user_id = $3 AND streak_type = $4`,
      [newStreak, activityDate, userId, streakType]
    );

    // Check for milestones
    await checkStreakMilestones(userId, streakType, newStreak);

    if (isBest) {
      log.info({ userId, streakType, newStreak }, 'New best sleep streak');
    }
  } else if (lastDate !== activityDate) {
    // Streak broken, start new
    await execute(
      `UPDATE sleep_hygiene_streaks SET
        current_streak = 1,
        current_streak_start = $1,
        last_activity_date = $1,
        updated_at = NOW()
       WHERE user_id = $2 AND streak_type = $3`,
      [activityDate, userId, streakType]
    );
  }
  // If same day, don't update
}

// ============================================
// CREDIT AWARDS
// ============================================

/**
 * Award credits for sleep-related activities
 */
export async function awardSleepCredits(
  userId: string,
  awardType: SleepCreditAwardType,
  context: {
    awardDate?: string;
    sleepLogId?: string;
    assessmentId?: string;
    streakId?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<number> {
  const { awardDate = new Date().toISOString().split('T')[0] } = context;

  // Check if already awarded today for this type
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM sleep_credit_awards
     WHERE user_id = $1 AND award_date = $2 AND award_type = $3`,
    [userId, awardDate, awardType]
  );

  if (existing) {
    return 0; // Already awarded
  }

  // Check if user has credits enabled
  const prefs = await getOrCreatePreferences(userId);
  if (!prefs.earnCreditsEnabled) {
    return 0;
  }

  const credits = SLEEP_CREDIT_AMOUNTS[awardType];
  const id = `sca_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Add credits to user balance
  const result = await creditService.addCredits(
    userId,
    credits,
    `sleep_hygiene_${awardType}`,
    { awardType, ...context.metadata },
    `sleep_${awardType}_${userId}_${awardDate}`
  );

  // Record the award
  await execute(
    `INSERT INTO sleep_credit_awards (id, user_id, award_date, award_type, credits, sleep_log_id, assessment_id, streak_id, metadata, ledger_entry_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      userId,
      awardDate,
      awardType,
      credits,
      context.sleepLogId || null,
      context.assessmentId || null,
      context.streakId || null,
      context.metadata ? JSON.stringify(context.metadata) : null,
      result.ledgerEntryId || null,
    ]
  );

  log.info({ userId, awardType, credits }, 'Sleep hygiene credits awarded');

  return credits;
}

/**
 * Award credits based on assessment score
 */
async function awardAssessmentCredits(
  userId: string,
  assessmentDate: string,
  overallScore: number
): Promise<number> {
  let totalCredits = 0;

  // Award for completing checklist
  totalCredits += await awardSleepCredits(userId, 'hygiene_checklist', { awardDate: assessmentDate });

  // Bonus for perfect hygiene
  if (overallScore === 100) {
    totalCredits += await awardSleepCredits(userId, 'perfect_hygiene', { awardDate: assessmentDate });
  }

  return totalCredits;
}

/**
 * Award credits when sleep is logged (called from sleep.service)
 */
export async function awardSleepLogCredits(
  userId: string,
  sleepLogId: string,
  context: {
    quality: number;
    durationMinutes: number;
    targetMinutes: number;
    wasConsistentBedtime: boolean;
  }
): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  let totalCredits = 0;

  // Daily log credit
  totalCredits += await awardSleepCredits(userId, 'daily_log', {
    awardDate: today,
    sleepLogId,
  });

  // Target met credit
  if (context.durationMinutes >= context.targetMinutes * 0.9) { // Within 90% of target
    totalCredits += await awardSleepCredits(userId, 'target_met', {
      awardDate: today,
      sleepLogId,
    });
  }

  // Quality credits
  if (context.quality >= 4) {
    totalCredits += await awardSleepCredits(userId, 'good_quality', {
      awardDate: today,
      sleepLogId,
    });
  }

  if (context.quality === 5) {
    totalCredits += await awardSleepCredits(userId, 'excellent_quality', {
      awardDate: today,
      sleepLogId,
    });
  }

  // Update streaks
  await updateSleepStreaks(userId, today, {
    sleepQuality: context.quality,
    metDurationTarget: context.durationMinutes >= context.targetMinutes * 0.9,
    wasConsistentBedtime: context.wasConsistentBedtime,
  });

  return totalCredits;
}

/**
 * Check and award streak milestone credits
 */
async function checkStreakMilestones(userId: string, streakType: SleepStreakType, currentStreak: number): Promise<void> {
  const milestones: [number, SleepCreditAwardType][] = [
    [7, 'streak_milestone_7'],
    [14, 'streak_milestone_14'],
    [30, 'streak_milestone_30'],
    [60, 'streak_milestone_60'],
    [90, 'streak_milestone_90'],
  ];

  // Get streak record for ID
  const streak = await getStreak(userId, streakType);

  for (const [days, awardType] of milestones) {
    if (currentStreak === days) {
      await awardSleepCredits(userId, awardType, {
        streakId: streak?.id,
        metadata: { streakType, days },
      });
    }
  }
}

/**
 * Get credit awards for user
 */
export async function getCreditAwards(
  userId: string,
  options: { limit?: number; startDate?: string; endDate?: string } = {}
): Promise<SleepCreditAward[]> {
  const { limit = 50, startDate, endDate } = options;
  let sql = `SELECT * FROM sleep_credit_awards WHERE user_id = $1`;
  const params: unknown[] = [userId];
  let paramIndex = 2;

  if (startDate) {
    sql += ` AND award_date >= $${paramIndex++}`;
    params.push(startDate);
  }

  if (endDate) {
    sql += ` AND award_date <= $${paramIndex++}`;
    params.push(endDate);
  }

  sql += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
  params.push(limit);

  const rows = await queryAll<any>(sql, params);
  return rows.map(mapRowToCreditAward);
}

/**
 * Get total credits earned from sleep hygiene
 */
export async function getTotalCreditsEarned(userId: string): Promise<number> {
  const result = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(credits), 0) as total FROM sleep_credit_awards WHERE user_id = $1`,
    [userId]
  );

  return parseInt(result?.total || '0');
}

/**
 * Get credits earned today
 */
export async function getTodayCreditsEarned(userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const result = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(credits), 0) as total FROM sleep_credit_awards WHERE user_id = $1 AND award_date = $2`,
    [userId, today]
  );

  return parseInt(result?.total || '0');
}

// ============================================
// DASHBOARD
// ============================================

/**
 * Get comprehensive sleep hygiene dashboard
 */
export async function getDashboard(userId: string): Promise<SleepHygieneDashboard> {
  const [
    preferences,
    todayAssessment,
    streaks,
    recentTips,
    bookmarkedTips,
    todayCreditsEarned,
    totalCreditsEarned,
    weeklyStats,
  ] = await Promise.all([
    getOrCreatePreferences(userId),
    getTodayAssessment(userId),
    getStreaks(userId),
    getTipsForUser(userId, { limit: 5 }),
    getBookmarkedTips(userId),
    getTodayCreditsEarned(userId),
    getTotalCreditsEarned(userId),
    getWeeklyStats(userId),
  ]);

  return {
    preferences,
    todayAssessment: todayAssessment || undefined,
    streaks,
    recentTips,
    bookmarkedTips,
    todayCreditsEarned,
    totalCreditsEarned,
    weeklyStats,
  };
}

/**
 * Get weekly stats
 */
async function getWeeklyStats(userId: string): Promise<{ daysLogged: number; avgHygieneScore: number; creditsEarned: number }> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];

  const stats = await queryOne<{
    days_logged: string;
    avg_score: string;
    credits_earned: string;
  }>(
    `SELECT
       COUNT(DISTINCT a.assessment_date) as days_logged,
       COALESCE(AVG(a.overall_score), 0) as avg_score,
       COALESCE(SUM(c.credits), 0) as credits_earned
     FROM sleep_hygiene_assessments a
     LEFT JOIN sleep_credit_awards c ON c.user_id = a.user_id AND c.award_date >= $2
     WHERE a.user_id = $1 AND a.assessment_date >= $2`,
    [userId, weekAgoStr]
  );

  return {
    daysLogged: parseInt(stats?.days_logged || '0'),
    avgHygieneScore: parseFloat(stats?.avg_score || '0'),
    creditsEarned: parseInt(stats?.credits_earned || '0'),
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculatePreSleepScore(checklist: PreSleepChecklist): number {
  const items: (keyof PreSleepChecklist)[] = [
    'avoidedCaffeine',
    'avoidedAlcohol',
    'avoidedScreens1hr',
    'coolRoom',
    'darkRoom',
    'windDownRoutine',
    'consistentBedtime',
    'lightDinner',
    'noLateExercise',
    'relaxationPractice',
  ];

  const completed = items.filter(item => checklist[item] === true).length;
  const total = items.filter(item => checklist[item] !== undefined).length;

  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

function calculatePostSleepScore(checklist: PostSleepChecklist): number {
  const items: (keyof PostSleepChecklist)[] = [
    'fellAsleepEasily',
    'stayedAsleep',
    'wokeRefreshed',
    'noGrogginess',
    'goodEnergy',
    'noMidnightWaking',
  ];

  const completed = items.filter(item => checklist[item] === true).length;
  const total = items.filter(item => checklist[item] !== undefined).length;

  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

function mapRowToPreferences(row: any): SleepHygienePreferences {
  return {
    id: row.id,
    userId: row.user_id,
    enabled: row.enabled,
    showOnDashboard: row.show_on_dashboard,
    showTips: row.show_tips,
    showAssessments: row.show_assessments,
    bedtimeReminderEnabled: row.bedtime_reminder_enabled,
    bedtimeReminderMinutesBefore: row.bedtime_reminder_minutes_before || undefined,
    morningCheckInEnabled: row.morning_check_in_enabled,
    weeklyReportEnabled: row.weekly_report_enabled,
    earnCreditsEnabled: row.earn_credits_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToTip(row: any): SleepHygieneTip {
  return {
    id: row.id,
    category: row.category,
    priority: row.priority,
    title: row.title,
    description: row.description,
    detailedExplanation: row.detailed_explanation || undefined,
    icon: row.icon,
    evidenceLevel: row.evidence_level || undefined,
    sourceReferences: row.source_references || undefined,
    applicableToArchetypes: row.applicable_to_archetypes || undefined,
    applicableToIssues: row.applicable_to_issues || undefined,
    isActive: row.is_active,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToTipWithInteraction(row: any): SleepHygieneTipWithInteraction {
  return {
    ...mapRowToTip(row),
    isBookmarked: row.is_bookmarked || false,
    isDismissed: row.is_dismissed || false,
    isFollowing: row.is_following || false,
    timesShown: row.times_shown || 0,
  };
}

function mapRowToAssessment(row: any): SleepHygieneAssessment {
  let preSleepChecklist: PreSleepChecklist = {};
  let postSleepChecklist: PostSleepChecklist = {};

  try {
    preSleepChecklist = typeof row.pre_sleep_checklist === 'string'
      ? JSON.parse(row.pre_sleep_checklist)
      : row.pre_sleep_checklist || {};
  } catch {
    preSleepChecklist = {};
  }

  try {
    postSleepChecklist = typeof row.post_sleep_checklist === 'string'
      ? JSON.parse(row.post_sleep_checklist)
      : row.post_sleep_checklist || {};
  } catch {
    postSleepChecklist = {};
  }

  return {
    id: row.id,
    userId: row.user_id,
    assessmentDate: row.assessment_date,
    preSleepChecklist,
    postSleepChecklist,
    preSleepScore: row.pre_sleep_score || undefined,
    postSleepScore: row.post_sleep_score || undefined,
    overallScore: row.overall_score || undefined,
    creditsAwarded: row.credits_awarded || 0,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToStreak(row: any): SleepHygieneStreak {
  return {
    id: row.id,
    userId: row.user_id,
    streakType: row.streak_type,
    currentStreak: row.current_streak,
    currentStreakStart: row.current_streak_start || undefined,
    bestStreak: row.best_streak,
    bestStreakStart: row.best_streak_start || undefined,
    bestStreakEnd: row.best_streak_end || undefined,
    lastActivityDate: row.last_activity_date || undefined,
    totalCreditsEarned: row.total_credits_earned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToCreditAward(row: any): SleepCreditAward {
  let metadata: Record<string, unknown> | undefined;
  try {
    metadata = row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : undefined;
  } catch {
    metadata = undefined;
  }

  return {
    id: row.id,
    userId: row.user_id,
    awardDate: row.award_date,
    awardType: row.award_type,
    credits: row.credits,
    sleepLogId: row.sleep_log_id || undefined,
    assessmentId: row.assessment_id || undefined,
    streakId: row.streak_id || undefined,
    metadata,
    ledgerEntryId: row.ledger_entry_id || undefined,
    createdAt: row.created_at,
  };
}
