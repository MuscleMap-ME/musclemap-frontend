/**
 * useCelebration Hook
 *
 * A unified hook to trigger various celebration effects (confetti, level up, streak, achievement).
 * Returns trigger functions and a CelebrationPortal component to render the effects.
 *
 * @example
 * const {
 *   triggerConfetti,
 *   triggerLevelUp,
 *   triggerStreak,
 *   triggerAchievement,
 *   CelebrationPortal
 * } = useCelebration();
 *
 * // Trigger celebrations
 * triggerConfetti({ origin: { x: 0.5, y: 0.5 } });
 * triggerLevelUp(5);
 * triggerStreak(7);
 * triggerAchievement({ name: 'First Workout', icon: '💪', rarity: 'common' });
 *
 * // Render the portal (must be included in component tree)
 * return (
 *   <div>
 *     <YourContent />
 *     <CelebrationPortal />
 *   </div>
 * );
 */

import { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Confetti from './Confetti';
import LevelUpEffect from './LevelUpEffect';
import StreakFire from './StreakFire';
import AchievementBurst from './AchievementBurst';

// ============================================
// TYPES / DEFAULTS
// ============================================

const DEFAULT_CONFETTI_OPTIONS = {
  origin: { x: 0.5, y: 0.5 },
  particleCount: 80,
  spread: 360,
  duration: 3000,
  colors: undefined, // Use default colors
  gravity: 0.15,
};

const DEFAULT_STREAK_OPTIONS = {
  intensity: 'medium',
};

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useCelebration() {
  // State for each celebration type
  const [confettiState, setConfettiState] = useState({
    active: false,
    options: DEFAULT_CONFETTI_OPTIONS,
  });

  const [levelUpState, setLevelUpState] = useState({
    active: false,
    level: 1,
    enableSound: true,
  });

  const [streakState, setStreakState] = useState({
    active: false,
    count: 0,
    intensity: 'medium',
  });

  const [achievementState, setAchievementState] = useState({
    active: false,
    achievement: null,
  });

  // ============================================
  // TRIGGER FUNCTIONS
  // ============================================

  /**
   * Trigger confetti celebration
   * @param {Object} options - Confetti options
   * @param {Object} options.origin - Origin point { x: 0-1, y: 0-1 }
   * @param {number} options.particleCount - Number of particles
   * @param {number} options.spread - Spread angle in degrees
   * @param {number} options.duration - Duration in milliseconds
   * @param {string[]} options.colors - Array of colors
   * @param {number} options.gravity - Gravity multiplier
   */
  const triggerConfetti = useCallback((options = {}) => {
    setConfettiState({
      active: true,
      options: { ...DEFAULT_CONFETTI_OPTIONS, ...options },
    });

    // Auto-reset after duration
    const duration = options.duration || DEFAULT_CONFETTI_OPTIONS.duration;
    setTimeout(() => {
      setConfettiState(prev => ({ ...prev, active: false }));
    }, duration + 500);
  }, []);

  /**
   * Trigger level up celebration
   * @param {number} level - The new level
   * @param {Object} options - Additional options
   * @param {boolean} options.enableSound - Enable sound effect
   */
  const triggerLevelUp = useCallback((level, options = {}) => {
    setLevelUpState({
      active: true,
      level,
      enableSound: options.enableSound !== false,
    });
  }, []);

  /**
   * Trigger streak fire celebration
   * @param {number} count - The streak count
   * @param {Object} options - Additional options
   * @param {string} options.intensity - 'low' | 'medium' | 'high'
   */
  const triggerStreak = useCallback((count, options = {}) => {
    setStreakState({
      active: true,
      count,
      intensity: options.intensity || DEFAULT_STREAK_OPTIONS.intensity,
    });

    // Auto-hide after 4 seconds
    setTimeout(() => {
      setStreakState(prev => ({ ...prev, active: false }));
    }, 4000);
  }, []);

  /**
   * Trigger achievement burst celebration
   * @param {Object} achievement - Achievement details
   * @param {string} achievement.name - Achievement name
   * @param {string} achievement.icon - Emoji or icon
   * @param {string} achievement.rarity - 'common' | 'rare' | 'epic' | 'legendary'
   */
  const triggerAchievement = useCallback((achievement) => {
    setAchievementState({
      active: true,
      achievement: {
        name: achievement.name || 'Achievement Unlocked',
        icon: achievement.icon || '🏆',
        rarity: achievement.rarity || 'common',
      },
    });
  }, []);

  // ============================================
  // COMPLETION HANDLERS
  // ============================================

  const handleLevelUpComplete = useCallback(() => {
    setLevelUpState(prev => ({ ...prev, active: false }));
  }, []);

  const handleStreakComplete = useCallback(() => {
    setStreakState(prev => ({ ...prev, active: false }));
  }, []);

  const handleAchievementComplete = useCallback(() => {
    setAchievementState(prev => ({ ...prev, active: false }));
  }, []);

  // ============================================
  // CELEBRATION PORTAL COMPONENT
  // ============================================

  const CelebrationPortal = useMemo(() => {
    function Portal() {
      // Only render in browser environment
      if (typeof document === 'undefined') return null;

      return createPortal(
        <>
          {/* Confetti */}
          <Confetti
            active={confettiState.active}
            origin={confettiState.options.origin}
            particleCount={confettiState.options.particleCount}
            spread={confettiState.options.spread}
            duration={confettiState.options.duration}
            colors={confettiState.options.colors}
            gravity={confettiState.options.gravity}
          />

          {/* Level Up */}
          {levelUpState.active && (
            <LevelUpEffect
              level={levelUpState.level}
              active={levelUpState.active}
              enableSound={levelUpState.enableSound}
              onComplete={handleLevelUpComplete}
            />
          )}

          {/* Streak Fire */}
          {streakState.active && (
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
              <StreakFire
                streakCount={streakState.count}
                active={streakState.active}
                intensity={streakState.intensity}
              />
            </div>
          )}

          {/* Achievement */}
          {achievementState.active && achievementState.achievement && (
            <AchievementBurst
              achievement={achievementState.achievement}
              active={achievementState.active}
              onComplete={handleAchievementComplete}
            />
          )}
        </>,
        document.body
      );
    }

    return Portal;
  }, [
    confettiState,
    levelUpState,
    streakState,
    achievementState,
    handleLevelUpComplete,
    handleAchievementComplete,
  ]);

  // ============================================
  // RETURN VALUE
  // ============================================

  return {
    triggerConfetti,
    triggerLevelUp,
    triggerStreak,
    triggerAchievement,
    CelebrationPortal,

    // Additional utilities
    isConfettiActive: confettiState.active,
    isLevelUpActive: levelUpState.active,
    isStreakActive: streakState.active,
    isAchievementActive: achievementState.active,

    // Manual dismissal functions
    dismissLevelUp: handleLevelUpComplete,
    dismissStreak: handleStreakComplete,
    dismissAchievement: handleAchievementComplete,
  };
}

export default useCelebration;
