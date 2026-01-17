/**
 * MuscleViewer Types
 * Shared types for the unified muscle visualization components
 */

import type { LODLevel } from '../../lib/anatomy/types';

/**
 * Muscle activation data
 */
export interface MuscleActivation {
  /** Muscle ID (e.g., 'chest', 'biceps', 'quads') */
  id: string;
  /** Activation intensity from 0 to 1 */
  intensity: number;
  /** Whether this is a primary muscle (vs secondary) */
  isPrimary?: boolean;
}

/**
 * Display mode for the muscle viewer
 */
export type MuscleViewerMode = 'compact' | 'card' | 'fullscreen' | 'inline';

/**
 * View angle presets
 */
export type ViewPreset = 'front' | 'back' | 'left' | 'right' | 'isometric';

/**
 * Visualization preference (user setting)
 */
export type VisualizationPreference = 'auto' | 'always-3d' | 'always-2d';

/**
 * Color scheme for muscle visualization
 */
export type ColorScheme = 'heatmap' | 'anatomical' | 'monochrome' | 'custom';

/**
 * Props for the main MuscleViewer component
 */
export interface MuscleViewerProps {
  /** Array of muscle activations to display */
  muscles: MuscleActivation[];
  /** Display mode */
  mode?: MuscleViewerMode;
  /** Allow user interaction (click, rotate, zoom) */
  interactive?: boolean;
  /** Show muscle name labels */
  showLabels?: boolean;
  /** Auto-rotate the model */
  autoRotate?: boolean;
  /** Initial view angle */
  initialView?: ViewPreset;
  /** Color scheme for intensity visualization */
  colorScheme?: ColorScheme;
  /** Force a specific LOD level (overrides auto-detection) */
  forceLod?: LODLevel;
  /** Force 2D or 3D mode (overrides auto-detection) */
  forceMode?: '2d' | '3d';
  /** Callback when a muscle is clicked */
  onMuscleClick?: (muscleId: string) => void;
  /** Callback when a muscle is hovered */
  onMuscleHover?: (muscleId: string | null) => void;
  /** Additional CSS classes */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * Props for the 3D viewer component
 */
export interface MuscleViewer3DProps extends Omit<MuscleViewerProps, 'forceMode'> {
  /** LOD level to use */
  lod: LODLevel;
}

/**
 * Props for the 2D viewer component
 */
export interface MuscleViewer2DProps extends Omit<MuscleViewerProps, 'forceMode' | 'forceLod'> {}

/**
 * Props for the muscle heatmap component
 */
export interface MuscleHeatmapProps {
  /** Array of muscle activations */
  muscles: MuscleActivation[];
  /** Time range label (e.g., "Last 7 days") */
  timeRange?: string;
  /** Show comparison with previous period */
  showComparison?: boolean;
  /** Previous period activations for comparison */
  previousMuscles?: MuscleActivation[];
  /** View mode */
  view?: 'front' | 'back' | 'both';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for the compact muscle activation badge
 */
export interface MuscleActivationBadgeProps {
  /** Primary muscles to display */
  muscles: MuscleActivation[];
  /** Size in pixels */
  size?: number;
  /** Show glow effect for high activation */
  showGlow?: boolean;
  /** Tooltip text */
  tooltip?: string;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

/**
 * Props for the skeleton loading state
 */
export interface MuscleViewerSkeletonProps {
  /** Display mode to match */
  mode?: MuscleViewerMode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Visualization settings from adaptive hook
 */
export interface VisualizationSettings {
  /** Whether to use 3D (true) or 2D (false) */
  use3D: boolean;
  /** LOD level to use if 3D */
  lod: LODLevel;
  /** User's preference setting */
  preference: VisualizationPreference;
  /** Whether device supports 3D */
  supportsWebGL: boolean;
  /** Reason for current setting */
  reason: string;
}
