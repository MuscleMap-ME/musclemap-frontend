/**
 * MuscleViewer Types (Mobile)
 * Shared types for the mobile muscle visualization components
 */

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
export type ViewPreset = 'front' | 'back' | 'left' | 'right';

/**
 * Props for the main MuscleViewer component
 */
export interface MuscleViewerProps {
  /** Array of muscle activations to display */
  muscles: MuscleActivation[];
  /** Display mode */
  mode?: MuscleViewerMode;
  /** Allow user interaction (tap, rotate, zoom) */
  interactive?: boolean;
  /** Show muscle name labels */
  showLabels?: boolean;
  /** Auto-rotate the model (3D only) */
  autoRotate?: boolean;
  /** Initial view angle */
  initialView?: ViewPreset;
  /** Force 2D or 3D mode (overrides auto-detection) */
  forceMode?: '2d' | '3d';
  /** Show toggle button for 2D/3D switching */
  showModeToggle?: boolean;
  /** Callback when a muscle is pressed */
  onMusclePress?: (muscleId: string) => void;
  /** Additional styles */
  style?: object;
}

/**
 * Props for the 3D viewer component
 */
export interface MuscleViewer3DProps {
  /** Array of muscle activations to display */
  muscles: MuscleActivation[];
  /** Height of the canvas */
  height?: number;
  /** Allow user interaction */
  interactive?: boolean;
  /** Auto-rotate the model */
  autoRotate?: boolean;
  /** Error callback */
  onError?: (error: Error) => void;
}

/**
 * Props for the 2D viewer component
 */
export interface MuscleViewer2DProps {
  /** Array of muscle activations to display */
  muscles: MuscleActivation[];
  /** View angle */
  view?: ViewPreset;
  /** Size preset */
  size?: 'sm' | 'md' | 'lg' | 'full';
  /** Show muscle labels */
  showLabels?: boolean;
  /** Allow interaction */
  interactive?: boolean;
  /** Callback when muscle is pressed */
  onMusclePress?: (muscleId: string) => void;
  /** Additional styles */
  style?: object;
}

/**
 * Muscle position for 3D rendering
 */
export interface MusclePosition {
  x: number;
  y: number;
  z: number;
  scale: number;
}

/**
 * Props for compact muscle activation badge
 */
export interface MuscleActivationBadgeProps {
  /** Primary muscles to display */
  muscles: MuscleActivation[];
  /** Size in pixels */
  size?: number;
  /** Show glow effect for high activation */
  showGlow?: boolean;
  /** Press handler */
  onPress?: () => void;
}
