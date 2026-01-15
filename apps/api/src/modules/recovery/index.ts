/**
 * Recovery Module
 *
 * Sleep tracking and recovery scoring system.
 * Integrates with the workout prescription system to recommend
 * workout intensity based on user's recovery state.
 */

export * from './types';
export * as sleepService from './sleep.service';
export * as recoveryService from './recovery.service';

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
