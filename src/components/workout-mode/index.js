/**
 * Workout Mode Components
 *
 * Immersive fullscreen workout experience with:
 * - Large touch-friendly buttons (64px+)
 * - Swipe gestures for navigation
 * - Ambient effects and animations
 * - Muscle visualization
 * - Rest timer with particle effects
 *
 * @example
 * import { WorkoutMode } from '@/components/workout-mode';
 *
 * <WorkoutMode
 *   workout={workoutPlan}
 *   onComplete={handleComplete}
 *   onClose={handleClose}
 * />
 */

// Main workout mode component
export { WorkoutMode, default } from './WorkoutMode';

// Sub-components
export { ExerciseDisplay, ExercisePanel } from './ExerciseDisplay';
export { SetLogger } from './SetLogger';
export { RestTimer, useAmbientSound } from './RestTimer';
export { WorkoutProgress, WorkoutProgressDetailed } from './WorkoutProgress';
export {
  QuickControls,
  QuickControlsExpanded,
  QuickControlsMinimal,
} from './QuickControls';
export { MusclePreview, MusclePreviewBadge } from './MusclePreview';

// Hooks
export { useWorkoutMode, useSwipeGestures } from './useWorkoutMode';
