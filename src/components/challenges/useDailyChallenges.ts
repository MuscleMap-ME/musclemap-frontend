/**
 * useDailyChallenges Hook
 *
 * Manages daily challenge state including selection, progress tracking,
 * and reward claiming. Persists state to localStorage with automatic
 * daily reset at midnight.
 *
 * @example
 * const {
 *   challenges,
 *   progress,
 *   updateProgress,
 *   claimReward,
 *   claimAll,
 *   timeUntilReset,
 *   allComplete,
 *   allClaimed
 * } = useDailyChallenges();
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  selectDailyChallenges,
  DEFAULT_PROGRESS,
  getTimeUntilMidnight,
  isToday,
  CHALLENGE_TYPES,
} from './challengeDefinitions';

const STORAGE_KEY = 'musclemap_daily_challenges';

/**
 * Reconstruct challenge type reference from typeId
 * When challenges are loaded from localStorage, the `type` property
 * (which is a reference to CHALLENGE_TYPES) may be missing or incomplete.
 * This function reconstructs it from the typeId.
 * @param {Object} challenge - Challenge object from localStorage
 * @returns {Object} Challenge with reconstructed type reference
 */
function reconstructChallengeType(challenge) {
  if (!challenge || !challenge.typeId) return challenge;

  // Find the matching challenge type by typeId
  const challengeType = Object.values(CHALLENGE_TYPES).find(
    (ct) => ct.id === challenge.typeId
  );

  if (challengeType) {
    return { ...challenge, type: challengeType };
  }

  return challenge;
}

/**
 * Get stored challenge state from localStorage
 * @returns {Object|null} Stored state or null if invalid/expired
 */
function getStoredState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const state = JSON.parse(stored);

    // Check if stored state is from today
    if (!isToday(state.date)) {
      return null; // Expired, will regenerate
    }

    // Reconstruct type references for challenges loaded from localStorage
    if (state.challenges && Array.isArray(state.challenges)) {
      state.challenges = state.challenges.map(reconstructChallengeType);
    }

    return state;
  } catch {
    return null;
  }
}

/**
 * Save challenge state to localStorage
 * @param {Object} state - State to save
 */
function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save daily challenges state:', e);
  }
}

/**
 * useDailyChallenges Hook
 *
 * @param {Object} options
 * @param {string} options.userId - User ID for personalized challenge selection
 * @param {Function} options.onChallengeComplete - Callback when a challenge is completed
 * @param {Function} options.onRewardClaimed - Callback when a reward is claimed
 * @returns {Object} Challenge state and actions
 */
export function useDailyChallenges({
  userId = 'anonymous',
  onChallengeComplete,
  onRewardClaimed,
} = {}) {
  // Initialize state from localStorage or generate new
  const [state, setState] = useState(() => {
    const stored = getStoredState();
    if (stored && stored.userId === userId) {
      return stored;
    }

    // Generate new challenges for today
    const today = new Date();
    const challenges = selectDailyChallenges(userId, today);
    return {
      date: today.toISOString(),
      userId,
      challenges,
      progress: { ...DEFAULT_PROGRESS },
      claimed: {}, // { challengeId: boolean }
    };
  });

  // Time until reset
  const [timeUntilReset, setTimeUntilReset] = useState(getTimeUntilMidnight());

  // Ref to track if callbacks should fire
  const lastCompletedRef = useRef(new Set());

  // Update countdown timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      const time = getTimeUntilMidnight();
      setTimeUntilReset(time);

      // Check if we've crossed midnight
      if (time.totalMs > 23 * 60 * 60 * 1000) {
        // Crossed midnight, regenerate challenges
        const today = new Date();
        const challenges = selectDailyChallenges(userId, today);
        setState({
          date: today.toISOString(),
          userId,
          challenges,
          progress: { ...DEFAULT_PROGRESS },
          claimed: {},
        });
        lastCompletedRef.current = new Set();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [userId]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Compute challenge completion status
  const challengeStatus = useMemo(() => {
    return state.challenges.map((challenge) => {
      // Safely access trackingKey with fallback
      const trackingKey = challenge.type?.trackingKey;
      const currentProgress = trackingKey ? (state.progress[trackingKey] || 0) : 0;
      const target = challenge.target || 1; // Prevent division by zero
      const isComplete = currentProgress >= target;
      const isClaimed = state.claimed[challenge.id] || false;
      return {
        ...challenge,
        currentProgress,
        isComplete,
        isClaimed,
        percentage: Math.min(100, (currentProgress / target) * 100),
      };
    });
  }, [state.challenges, state.progress, state.claimed]);

  // Check if all challenges are complete
  const allComplete = useMemo(
    () => challengeStatus.every((c) => c.isComplete),
    [challengeStatus]
  );

  // Check if all challenges are claimed
  const allClaimed = useMemo(
    () => challengeStatus.every((c) => c.isClaimed),
    [challengeStatus]
  );

  // Count completed but unclaimed challenges
  const unclaimedComplete = useMemo(
    () => challengeStatus.filter((c) => c.isComplete && !c.isClaimed).length,
    [challengeStatus]
  );

  // Fire completion callbacks
  useEffect(() => {
    challengeStatus.forEach((challenge) => {
      if (challenge.isComplete && !lastCompletedRef.current.has(challenge.id)) {
        lastCompletedRef.current.add(challenge.id);
        onChallengeComplete?.(challenge);
      }
    });
  }, [challengeStatus, onChallengeComplete]);

  /**
   * Update progress for a specific tracking key
   * @param {string} trackingKey - The progress key to update (e.g., 'setsLogged')
   * @param {number} amount - Amount to add (or set if absolute=true)
   * @param {boolean} absolute - If true, set value instead of adding
   */
  const updateProgress = useCallback((trackingKey, amount, absolute = false) => {
    setState((prev) => {
      const currentValue = prev.progress[trackingKey] || 0;
      const newValue = absolute ? amount : currentValue + amount;

      return {
        ...prev,
        progress: {
          ...prev.progress,
          [trackingKey]: Math.max(0, newValue),
        },
      };
    });
  }, []);

  /**
   * Claim reward for a completed challenge
   * @param {string} challengeId - ID of the challenge to claim
   * @returns {Object|null} Claimed rewards { xp, credits } or null if not claimable
   */
  const claimReward = useCallback(
    (challengeId) => {
      const challenge = challengeStatus.find((c) => c.id === challengeId);
      if (!challenge || !challenge.isComplete || challenge.isClaimed) {
        return null;
      }

      setState((prev) => ({
        ...prev,
        claimed: {
          ...prev.claimed,
          [challengeId]: true,
        },
      }));

      const rewards = challenge.rewards;
      onRewardClaimed?.(challenge, rewards);
      return rewards;
    },
    [challengeStatus, onRewardClaimed]
  );

  /**
   * Claim all completed but unclaimed challenges
   * @returns {Object} Total rewards { xp, credits }
   */
  const claimAll = useCallback(() => {
    const toClaim = challengeStatus.filter((c) => c.isComplete && !c.isClaimed);
    if (toClaim.length === 0) {
      return { xp: 0, credits: 0 };
    }

    const claimedIds = {};
    let totalXp = 0;
    let totalCredits = 0;

    toClaim.forEach((challenge) => {
      claimedIds[challenge.id] = true;
      totalXp += challenge.rewards.xp;
      totalCredits += challenge.rewards.credits;
      onRewardClaimed?.(challenge, challenge.rewards);
    });

    setState((prev) => ({
      ...prev,
      claimed: {
        ...prev.claimed,
        ...claimedIds,
      },
    }));

    return { xp: totalXp, credits: totalCredits };
  }, [challengeStatus, onRewardClaimed]);

  /**
   * Reset all progress (for testing)
   */
  const resetProgress = useCallback(() => {
    setState((prev) => ({
      ...prev,
      progress: { ...DEFAULT_PROGRESS },
      claimed: {},
    }));
    lastCompletedRef.current = new Set();
  }, []);

  /**
   * Manually regenerate challenges (for testing)
   */
  const regenerateChallenges = useCallback(() => {
    const today = new Date();
    const challenges = selectDailyChallenges(userId, today);
    setState({
      date: today.toISOString(),
      userId,
      challenges,
      progress: { ...DEFAULT_PROGRESS },
      claimed: {},
    });
    lastCompletedRef.current = new Set();
  }, [userId]);

  return {
    // Today's challenges with computed status
    challenges: challengeStatus,
    // Raw progress values
    progress: state.progress,
    // Actions
    updateProgress,
    claimReward,
    claimAll,
    resetProgress,
    regenerateChallenges,
    // Time state
    timeUntilReset,
    // Computed flags
    allComplete,
    allClaimed,
    unclaimedComplete,
  };
}

export default useDailyChallenges;
