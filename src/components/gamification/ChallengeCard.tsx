/**
 * ChallengeCard Component (Gamification Module)
 *
 * Re-exports the ChallengeCard component from the challenges module.
 * Provides a gamification-focused API for individual challenge display.
 *
 * @example
 * import { ChallengeCard } from '@/components/gamification';
 *
 * <ChallengeCard
 *   challenge={challenge}
 *   progress={75}
 *   onClaim={handleClaim}
 *   completed={false}
 * />
 */

// Re-export from challenges module
export { ChallengeCard, default } from '../challenges/ChallengeCard';
