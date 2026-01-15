/**
 * Challenge Definitions (Gamification Module)
 *
 * Re-exports challenge type definitions and utilities from the challenges module.
 * Provides 20+ challenge templates with varying difficulty and rewards.
 *
 * Challenge Types:
 * - "Complete X sets" (workout volume)
 * - "Train [muscle group]" (specific targeting)
 * - "Log a workout" (daily activity)
 * - "Earn X XP" (progression)
 * - "High five 3 people" (social)
 * - "Try a new exercise" (exploration)
 * - And many more...
 *
 * @example
 * import {
 *   CHALLENGE_TYPES,
 *   DIFFICULTY,
 *   selectDailyChallenges,
 *   formatChallengeDescription
 * } from '@/components/gamification';
 *
 * // Get today's challenges for a user
 * const challenges = selectDailyChallenges('user123', new Date());
 */

// Re-export all definitions from challenges module
export {
  CHALLENGE_TYPES,
  CHALLENGE_TYPE_IDS,
  DIFFICULTY,
  DEFAULT_PROGRESS,
  formatChallengeDescription,
  getChallengeRewards,
  getChallengeTarget,
  selectDailyChallenges,
  getDailySeed,
  getTimeUntilMidnight,
  isToday,
  default,
} from '../challenges/challengeDefinitions';
