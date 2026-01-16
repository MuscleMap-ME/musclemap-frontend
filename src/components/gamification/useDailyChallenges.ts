/**
 * useDailyChallenges Hook (Gamification Module)
 *
 * Re-exports the useDailyChallenges hook from the challenges module
 * with additional gamification context.
 *
 * @example
 * import { useDailyChallenges } from '@/components/gamification';
 *
 * const {
 *   challenges,
 *   progress,
 *   updateProgress,
 *   claimReward,
 *   claimAll,
 *   timeUntilReset,
 *   allComplete,
 *   allClaimed
 * } = useDailyChallenges({ userId: 'user123' });
 */

// Re-export from challenges module
export { useDailyChallenges, default } from '../challenges/useDailyChallenges';
