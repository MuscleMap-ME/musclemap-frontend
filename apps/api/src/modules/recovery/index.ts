/**
 * Recovery Module
 *
 * Sleep tracking and recovery scoring system.
 * Integrates with the workout prescription system to recommend
 * workout intensity based on user's recovery state.
 *
 * Also includes Sleep Hygiene features:
 * - Sleep hygiene preferences
 * - Sleep hygiene tips library
 * - Sleep hygiene assessments
 * - Sleep streaks with credit rewards
 */

export * from './types';
export * as sleepService from './sleep.service';
export * as recoveryService from './recovery.service';
export * as sleepHygieneService from './sleep-hygiene.service';

// Re-export commonly used functions for convenience
export {
  logSleep,
  getSleepLog,
  getSleepHistory,
  updateSleepLog,
  deleteSleepLog,
  getLastSleep,
  getSleepStats,
  getWeeklySleepStats,
  getActiveSleepGoal,
  upsertSleepGoal,
  updateSleepGoal,
  deleteSleepGoal,
} from './sleep.service';

export {
  getRecoveryScore,
  calculateRecoveryScore,
  generateRecommendations,
  getActiveRecommendations,
  acknowledgeRecommendation,
  getRecoveryStatus,
  getRecoveryHistory,
} from './recovery.service';

// Sleep Hygiene exports
export {
  getOrCreatePreferences as getSleepHygienePreferences,
  updatePreferences as updateSleepHygienePreferences,
  enableSleepHygiene,
  disableSleepHygiene,
  getAllTips as getAllSleepHygieneTips,
  getTipsForUser as getSleepHygieneTipsForUser,
  getBookmarkedTips as getSleepHygieneBookmarkedTips,
  bookmarkTip as bookmarkSleepHygieneTip,
  unbookmarkTip as unbookmarkSleepHygieneTip,
  followTip as followSleepHygieneTip,
  unfollowTip as unfollowSleepHygieneTip,
  getTodayAssessment as getSleepHygieneTodayAssessment,
  getAssessmentHistory as getSleepHygieneAssessmentHistory,
  upsertAssessment as upsertSleepHygieneAssessment,
  updateAssessment as updateSleepHygieneAssessment,
  getStreaks as getSleepHygieneStreaks,
  awardSleepCredits,
  awardSleepLogCredits,
  getCreditAwards as getSleepHygieneCreditAwards,
  getTotalCreditsEarned as getSleepHygieneTotalCreditsEarned,
  getTodayCreditsEarned as getSleepHygieneTodayCreditsEarned,
  getDashboard as getSleepHygieneDashboard,
} from './sleep-hygiene.service';
