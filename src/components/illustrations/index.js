/**
 * Illustration Components
 *
 * 2D SVG-based muscle and exercise visualization components
 */

// Main components
export { default as ExerciseIllustration, ExerciseIllustrationCard, ExerciseIllustrationModal } from './ExerciseIllustration';
export { default as BodyMuscleMap, BodyMuscleMapCard, MiniBodyMap } from './BodyMuscleMap';
export { default as MuscleDetailPopover, MuscleDetailSheet, useMuscleDetail } from './MuscleDetailPopover';

// Re-export utilities from shared
export {
  getActivationColor,
  getActivationLevel,
  getExerciseIllustration,
  hasExerciseIllustration,
  getBodyIllustrationPath,
  getMuscleIllustrationIds,
  ACTIVATION_COLORS,
  MUSCLE_GROUP_COLORS,
} from '@musclemap/shared';
