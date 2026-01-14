/**
 * Celebration & Feedback Animation Components
 *
 * A collection of animated components for user feedback and celebrations.
 * All components follow the MuscleMap bioluminescent design aesthetic.
 *
 * @example
 * import {
 *   Confetti,
 *   SuccessBurst,
 *   useConfetti,
 *   ConfettiProvider,
 *   LevelUpCelebration,
 *   StreakFlame
 * } from '@/components/celebrations';
 *
 * // Using the useConfetti hook (simplest approach)
 * const { fireConfetti } = useConfetti();
 * fireConfetti({ preset: 'achievement', origin: { x: 0.5, y: 0.5 } });
 *
 * // Using SuccessBurst via ref
 * const burstRef = useRef();
 * burstRef.current.fire({ preset: 'workout' });
 * <SuccessBurst ref={burstRef} />
 *
 * // Full-screen level up celebration
 * <LevelUpCelebration
 *   level={newLevel}
 *   isVisible={showLevelUp}
 *   onComplete={() => setShowLevelUp(false)}
 * />
 *
 * // Streak flame indicator
 * <StreakFlame intensity={7} size="md" />
 * <StreakFlame streak={30} size="lg" animate />
 */

// Confetti component (trigger-based)
export { Confetti } from './Confetti';

// Success burst with hook and provider
export {
  SuccessBurst,
  useConfetti,
  ConfettiProvider,
  CONFETTI_PRESETS,
} from './SuccessBurst';

// Level up celebration
export { LevelUpCelebration } from './LevelUpCelebration';

// Streak flame
export {
  StreakFlame,
  getIntensityFromStreak,
  getFlameLevel,
  FLAME_COLORS,
} from './StreakFlame';

// Default export for convenience
export { Confetti as default } from './Confetti';
