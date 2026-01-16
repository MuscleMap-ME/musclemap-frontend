/**
 * Daily Challenges Module
 *
 * Components, hooks, and utilities for the daily challenge system.
 *
 * @example
 * import {
 *   DailyChallenges,
 *   ChallengeCard,
 *   ChallengeTimer,
 *   ChallengeProgress,
 *   ChallengeReward,
 *   useChallenges,
 *   useDailyChallenges,
 *   CHALLENGE_TYPES,
 *   DIFFICULTY,
 * } from '@/components/challenges';
 */

// Main components
export { DailyChallenges } from './DailyChallenges';
export { ChallengeCard } from './ChallengeCard';
export { ChallengeTimer, ChallengeTimerCompact } from './ChallengeTimer';
export { ChallengeProgress } from './ChallengeProgress';
export { ChallengeReward, RewardBadge } from './ChallengeReward';

// Hooks
export { useChallenges } from './useChallenges';
export { useDailyChallenges } from './useDailyChallenges';

// Definitions and utilities
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
} from './challengeDefinitions';

// Default export
export { DailyChallenges as default } from './DailyChallenges';
