/**
 * Landing Page Components
 *
 * Exports all components used on the landing page.
 * These components are designed to be lazy-loaded for performance.
 */

// Live community stats
export { default as LiveCommunityStats } from './LiveCommunityStats';

// Muscle hero animation
export { default as MuscleHeroAnimation, SIZE_PRESETS, STYLE_PRESETS, SPEED_PRESETS } from './MuscleHeroAnimation';

// Muscle path data utilities
export {
  MUSCLE_PATHS,
  BODY_OUTLINE,
  VIEWBOX,
  DEFAULT_HIGHLIGHT_SEQUENCE,
  GLOW_FILTER_DEF,
  getMusclesForView,
  getMusclePathsForView,
} from './musclePathData';

// Interactive demo components
export { default as InteractiveDemo } from './InteractiveDemo';
export { default as MuscleTrackingDemo } from './MuscleTrackingDemo';
export { default as RPGProgressionDemo } from './RPGProgressionDemo';
export { default as WorkoutLogDemo } from './WorkoutLogDemo';

// New landing page sections (2026 revamp)
export { FreeOpenSourceSection } from './FreeOpenSourceSection';
export { PrivacySecuritySection } from './PrivacySecuritySection';
export { NYCLaunchSection } from './NYCLaunchSection';
export { CommunityContributionSection } from './CommunityContributionSection';
