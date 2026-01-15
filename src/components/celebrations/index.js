/**
 * Celebration & Feedback Animation Components
 *
 * A collection of animated components for user feedback and celebrations.
 * All components follow the MuscleMap bioluminescent design aesthetic,
 * respect prefers-reduced-motion, and clean up properly.
 *
 * @example
 * // Using the useCelebration hook (recommended)
 * import { useCelebration } from '@/components/celebrations';
 *
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
 * // Include portal in component tree
 * return (
 *   <div>
 *     <YourContent />
 *     <CelebrationPortal />
 *   </div>
 * );
 *
 * @example
 * // Using individual components directly
 * import { Confetti, LevelUpEffect, StreakFire, AchievementBurst } from '@/components/celebrations';
 *
 * <Confetti active={showConfetti} origin={{ x: 0.5, y: 0.5 }} />
 *
 * <LevelUpEffect
 *   level={newLevel}
 *   active={showLevelUp}
 *   onComplete={() => setShowLevelUp(false)}
 * />
 *
 * <StreakFire streakCount={30} active intensity="high" />
 *
 * <AchievementBurst
 *   achievement={{ name: 'Iron Will', icon: '🏆', rarity: 'legendary' }}
 *   active={showAchievement}
 *   onComplete={() => setShowAchievement(false)}
 * />
 */

// ============================================
// MAIN CELEBRATION HOOK
// ============================================

export { useCelebration } from './useCelebration';

// ============================================
// INDIVIDUAL CELEBRATION COMPONENTS
// ============================================

// Confetti - Canvas-based confetti burst
export { Confetti } from './Confetti';

// Level Up Effect - Full-screen level up celebration
export { LevelUpEffect } from './LevelUpEffect';

// Streak Fire - CSS-based fire animation for streaks
export { StreakFire } from './StreakFire';

// Achievement Burst - Badge unlock animation
export { AchievementBurst } from './AchievementBurst';

// ============================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================

// LevelUpCelebration (alias for LevelUpEffect)
export { LevelUpCelebration } from './LevelUpCelebration';

// StreakFlame (alias for StreakFire with different API)
export {
  StreakFlame,
  getIntensityFromStreak,
  getFlameLevel,
  FLAME_COLORS,
} from './StreakFlame';

// SuccessBurst and related
export {
  SuccessBurst,
  useConfetti,
  ConfettiProvider,
  CONFETTI_PRESETS,
} from './SuccessBurst';

// ============================================
// DEFAULT EXPORT
// ============================================

export { useCelebration as default } from './useCelebration';
