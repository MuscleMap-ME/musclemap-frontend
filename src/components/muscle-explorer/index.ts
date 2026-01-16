/**
 * Muscle Explorer Components
 *
 * Interactive 3D-like muscle model explorer for MuscleMap.
 *
 * Components:
 * - MuscleExplorer: Main explorer with SVG body diagram
 * - MuscleRegion: Individual clickable muscle region
 * - MuscleDetail: Slide-in detail panel for selected muscle
 * - MuscleStats: Quick stats card for muscle group
 * - MuscleModel: SVG-based body visualization
 * - MuscleControls: View/zoom/rotation controls
 * - MuscleHistory: 7-day activation history chart
 *
 * Hooks:
 * - useMuscleExplorer: State management for the explorer
 *
 * Data:
 * - MUSCLE_DATA: Complete muscle definitions
 * - MUSCLE_IDS: All muscle identifiers
 * - MUSCLE_REGIONS: Muscles organized by body region
 *
 * @module muscle-explorer
 */

// Main components
export { default as MuscleExplorer } from './MuscleExplorer';
export { default as MuscleRegion, MuscleRegionGroup, COLOR_SCHEMES } from './MuscleRegion';
export { default as MuscleDetail } from './MuscleDetail';
export { default as MuscleStats, MuscleStatsMini } from './MuscleStats';
export { default as MuscleModel } from './MuscleModel';
export { default as MuscleControls } from './MuscleControls';
export { default as MuscleInfo } from './MuscleInfo';
export { default as MuscleInfoPanel } from './MuscleInfoPanel';
export {
  default as MuscleHistory,
  MuscleHistoryCompact,
  MuscleHistorySparkline,
} from './MuscleHistory';

// Hooks
export { default as useMuscleExplorer, VIEW_PRESETS } from './useMuscleExplorer';

// Data and utilities
export {
  MUSCLE_DATA,
  MUSCLE_IDS,
  MUSCLE_REGIONS,
  VIEWBOX,
  BODY_OUTLINE,
  GLOW_FILTER_DEF,
  ACTIVATION_COLORS,
  DEFAULT_HIGHLIGHT_SEQUENCE,
  getMuscleData,
  getMusclesByGroup,
  getMusclesForView,
  getMusclePathsForView,
  getAntagonist,
  getSynergists,
  getMusclesForExercise,
  searchMuscles,
  getActivationColor,
} from './muscleData';

// Default export is the main MuscleExplorer component
export { default } from './MuscleExplorer';
