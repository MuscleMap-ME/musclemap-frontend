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
