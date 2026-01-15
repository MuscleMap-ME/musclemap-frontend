/**
 * useChallenges Hook
 *
 * Convenience wrapper around useDailyChallenges with additional
 * helper functions and event tracking.
 *
 * @module useChallenges
 *
 * @example
 * const {
 *   challenges,
 *   progress,
 *   updateProgress,
 *   claimReward,
 *   claimAll,
 *   timeUntilReset,
 *   formatTimeRemaining,
 *   isLowOnTime,
 *   getChallengeById,
 *   getCompletedChallenges,
 *   getPendingChallenges,
 * } = useChallenges({ userId: 'user123' });
 */

import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useDailyChallenges } from './useDailyChallenges';

/**
 * Format time remaining as readable string
 * @param {Object} time - { hours, minutes, seconds }
 * @returns {string} Formatted string like "5h 30m" or "15m 45s"
 */
function formatTimeRemaining(time) {
  const { hours, minutes, seconds } = time;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * useChallenges Hook
 *
 * @param {Object} options
 * @param {string} options.userId - User ID for personalized challenges
 * @param {Function} options.onChallengeComplete - Callback when challenge completes
 * @param {Function} options.onRewardClaimed - Callback when reward is claimed
 * @param {Function} options.onAllComplete - Callback when all challenges complete
 * @returns {Object} Challenge state, actions, and helpers
 */
export function useChallenges({
  userId = 'anonymous',
  onChallengeComplete,
  onRewardClaimed,
  onAllComplete,
} = {}) {
  // Track previous allComplete state for callback
  const prevAllCompleteRef = { current: false };

  // Wrap onChallengeComplete to check for all complete
  const handleChallengeComplete = useCallback(
    (challenge) => {
      onChallengeComplete?.(challenge);
    },
    [onChallengeComplete]
  );

  // Use the base hook
  const {
    challenges,
    progress,
    updateProgress,
    claimReward,
    claimAll: baseClaimAll,
    resetProgress,
    regenerateChallenges,
    timeUntilReset,
    allComplete,
    allClaimed,
    unclaimedComplete,
  } = useDailyChallenges({
    userId,
    onChallengeComplete: handleChallengeComplete,
    onRewardClaimed,
  });

  // Fire allComplete callback when transitioning to all complete
  // Using useEffect instead of useMemo since we're firing side effects
  useEffect(() => {
    if (allComplete && !prevAllCompleteRef.current) {
      onAllComplete?.();
    }
    prevAllCompleteRef.current = allComplete;
  }, [allComplete, onAllComplete]);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  /**
   * Get a challenge by its ID
   */
  const getChallengeById = useCallback(
    (challengeId) => {
      return challenges.find((c) => c.id === challengeId);
    },
    [challenges]
  );

  /**
   * Get all completed challenges (claimed or not)
   */
  const getCompletedChallenges = useCallback(() => {
    return challenges.filter((c) => c.isComplete);
  }, [challenges]);

  /**
   * Get all pending (incomplete) challenges
   */
  const getPendingChallenges = useCallback(() => {
    return challenges.filter((c) => !c.isComplete);
  }, [challenges]);

  /**
   * Get all claimable challenges (complete but not claimed)
   */
  const getClaimableChallenges = useCallback(() => {
    return challenges.filter((c) => c.isComplete && !c.isClaimed);
  }, [challenges]);

  /**
   * Get challenges by category
   */
  const getChallengesByCategory = useCallback(
    (category) => {
      return challenges.filter((c) => c.type.category === category);
    },
    [challenges]
  );

  /**
   * Get challenges by difficulty
   */
  const getChallengesByDifficulty = useCallback(
    (difficulty) => {
      return challenges.filter((c) => c.difficulty === difficulty);
    },
    [challenges]
  );

  /**
   * Calculate overall progress percentage
   */
  const overallProgress = useMemo(() => {
    if (challenges.length === 0) return 0;
    const totalPercentage = challenges.reduce((sum, c) => sum + c.percentage, 0);
    return Math.round(totalPercentage / challenges.length);
  }, [challenges]);

  /**
   * Calculate total potential rewards
   */
  const totalPotentialRewards = useMemo(() => {
    return challenges.reduce(
      (acc, c) => ({
        xp: acc.xp + c.rewards.xp,
        credits: acc.credits + c.rewards.credits,
      }),
      { xp: 0, credits: 0 }
    );
  }, [challenges]);

  /**
   * Calculate unclaimed rewards
   */
  const unclaimedRewards = useMemo(() => {
    return challenges
      .filter((c) => c.isComplete && !c.isClaimed)
      .reduce(
        (acc, c) => ({
          xp: acc.xp + c.rewards.xp,
          credits: acc.credits + c.rewards.credits,
        }),
        { xp: 0, credits: 0 }
      );
  }, [challenges]);

  /**
   * Check if time is running low (less than 1 hour)
   */
  const isLowOnTime = useMemo(() => {
    return timeUntilReset.hours === 0;
  }, [timeUntilReset]);

  /**
   * Check if time is critical (less than 15 minutes)
   */
  const isCriticalTime = useMemo(() => {
    return timeUntilReset.hours === 0 && timeUntilReset.minutes < 15;
  }, [timeUntilReset]);

  /**
   * Enhanced claim all with return value
   */
  const claimAll = useCallback(() => {
    const rewards = baseClaimAll();
    return rewards;
  }, [baseClaimAll]);

  /**
   * Update multiple progress values at once
   */
  const batchUpdateProgress = useCallback(
    (updates) => {
      Object.entries(updates).forEach(([key, value]) => {
        updateProgress(key, value);
      });
    },
    [updateProgress]
  );

  /**
   * Increment progress by 1 for a tracking key
   */
  const incrementProgress = useCallback(
    (trackingKey) => {
      updateProgress(trackingKey, 1);
    },
    [updateProgress]
  );

  // ============================================
  // RETURN VALUE
  // ============================================

  return {
    // Core state
    challenges,
    progress,
    timeUntilReset,

    // Status flags
    allComplete,
    allClaimed,
    unclaimedComplete,
    isLowOnTime,
    isCriticalTime,

    // Computed values
    overallProgress,
    totalPotentialRewards,
    unclaimedRewards,

    // Actions
    updateProgress,
    incrementProgress,
    batchUpdateProgress,
    claimReward,
    claimAll,
    resetProgress,
    regenerateChallenges,

    // Getters
    getChallengeById,
    getCompletedChallenges,
    getPendingChallenges,
    getClaimableChallenges,
    getChallengesByCategory,
    getChallengesByDifficulty,

    // Formatters
    formatTimeRemaining: () => formatTimeRemaining(timeUntilReset),
  };
}

export default useChallenges;
