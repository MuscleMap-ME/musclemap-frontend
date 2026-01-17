/**
 * MuscleViewer
 * Unified muscle visualization component with automatic 2D/3D switching
 *
 * This is the main entry point for muscle visualization throughout the app.
 * It automatically selects between 3D and 2D rendering based on device
 * capabilities and user preferences.
 *
 * @example
 * // Basic usage with exercise muscles
 * <MuscleViewer
 *   muscles={[
 *     { id: 'chest', intensity: 1.0, isPrimary: true },
 *     { id: 'triceps', intensity: 0.6, isPrimary: false },
 *   ]}
 *   mode="card"
 * />
 *
 * @example
 * // Fullscreen with interaction
 * <MuscleViewer
 *   muscles={muscles}
 *   mode="fullscreen"
 *   interactive
 *   onMuscleClick={(id) => showMuscleDetails(id)}
 * />
 */

import React, { Suspense, lazy, useMemo } from 'react';
import clsx from 'clsx';
import ErrorBoundary from '../ErrorBoundary';
import { useAdaptiveVisualization } from '../../hooks/useAdaptiveVisualization';
import MuscleViewerSkeleton from './MuscleViewerSkeleton';
import MuscleViewer2D from './MuscleViewer2D';
import type { MuscleViewerProps } from './types';

// Lazy load the 3D component since it's heavy
const MuscleViewer3D = lazy(() => import('./MuscleViewer3D'));

/**
 * Fallback component when 3D rendering fails
 */
function MuscleViewer3DErrorFallback({
  muscles,
  mode,
  className,
  ...props
}: MuscleViewerProps) {
  return (
    <div className={clsx('relative', className)}>
      <MuscleViewer2D muscles={muscles} mode={mode} {...props} />
      <div className="absolute top-2 right-2 px-2 py-1 text-[10px] bg-yellow-500/20 text-yellow-300 rounded">
        2D Fallback
      </div>
    </div>
  );
}

/**
 * MuscleViewer - Unified muscle visualization component
 *
 * Automatically switches between 3D and 2D rendering based on:
 * - Device capability (WebGL support, GPU, memory)
 * - Network conditions (slow connections use 2D)
 * - User preference (can be overridden in settings)
 * - Force mode prop (for testing or specific use cases)
 */
export function MuscleViewer({
  muscles,
  mode = 'card',
  interactive = true,
  showLabels = true,
  autoRotate = false,
  initialView = 'front',
  colorScheme = 'heatmap',
  forceLod,
  forceMode,
  onMuscleClick,
  onMuscleHover,
  className,
  style,
}: MuscleViewerProps): React.ReactElement {
  // Get adaptive visualization settings
  const { use3D, lod } = useAdaptiveVisualization();

  // Determine actual mode to use
  const shouldUse3D = useMemo(() => {
    if (forceMode === '2d') return false;
    if (forceMode === '3d') return true;
    return use3D;
  }, [forceMode, use3D]);

  // Determine LOD level
  const actualLod = forceLod || lod;

  // Common props for both viewers
  const viewerProps = {
    muscles,
    mode,
    interactive,
    showLabels,
    autoRotate,
    initialView,
    colorScheme,
    onMuscleClick,
    onMuscleHover,
    className,
    style,
  };

  // Render 2D version
  if (!shouldUse3D) {
    return <MuscleViewer2D {...viewerProps} />;
  }

  // Render 3D version with error boundary and suspense
  return (
    <ErrorBoundary
      name="MuscleViewer3D"
      fallback={<MuscleViewer3DErrorFallback {...viewerProps} />}
    >
      <Suspense fallback={<MuscleViewerSkeleton mode={mode} className={className} />}>
        <MuscleViewer3D {...viewerProps} lod={actualLod} />
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Export subcomponents for direct use when needed
 */
export { MuscleViewer2D } from './MuscleViewer2D';
export { MuscleViewer3D } from './MuscleViewer3D';
export { MuscleViewerSkeleton } from './MuscleViewerSkeleton';

export default MuscleViewer;
