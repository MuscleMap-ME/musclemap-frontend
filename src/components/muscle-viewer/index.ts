/**
 * MuscleViewer Components
 *
 * Unified muscle visualization system with automatic 2D/3D switching
 *
 * @example
 * // Basic usage
 * import { MuscleViewer } from '@/components/muscle-viewer';
 *
 * <MuscleViewer
 *   muscles={[
 *     { id: 'chest', intensity: 1.0, isPrimary: true },
 *     { id: 'triceps', intensity: 0.6, isPrimary: false },
 *   ]}
 *   mode="card"
 * />
 *
 * @example
 * // Compact badge for lists
 * import { MuscleActivationBadge } from '@/components/muscle-viewer';
 *
 * <MuscleActivationBadge
 *   muscles={exercise.muscles}
 *   size={32}
 * />
 *
 * @example
 * // Full heatmap for stats
 * import { MuscleHeatmap } from '@/components/muscle-viewer';
 *
 * <MuscleHeatmap
 *   muscles={weeklyMuscles}
 *   timeRange="Last 7 days"
 *   showComparison
 *   previousMuscles={lastWeekMuscles}
 * />
 */

// Main unified component
export { MuscleViewer, default } from './MuscleViewer';

// Direct access to 2D/3D components
export { MuscleViewer2D } from './MuscleViewer2D';
export { MuscleViewer3D } from './MuscleViewer3D';

// Specialized components
export { MuscleHeatmap } from './MuscleHeatmap';
export { MuscleActivationBadge } from './MuscleActivationBadge';
export { MuscleViewerSkeleton } from './MuscleViewerSkeleton';

// Types
export type {
  MuscleActivation,
  MuscleViewerMode,
  MuscleViewerProps,
  MuscleViewer2DProps,
  MuscleViewer3DProps,
  MuscleHeatmapProps,
  MuscleActivationBadgeProps,
  MuscleViewerSkeletonProps,
  ViewPreset,
  VisualizationPreference,
  VisualizationSettings,
  ColorScheme,
} from './types';
