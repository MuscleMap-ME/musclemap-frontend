/**
 * MuscleViewer (Mobile)
 *
 * Unified muscle visualization component that automatically switches
 * between 3D and 2D rendering based on device capabilities and user preferences.
 *
 * @example
 * <MuscleViewer
 *   muscles={[
 *     { id: 'chest', intensity: 1.0, isPrimary: true },
 *     { id: 'triceps', intensity: 0.6, isPrimary: false },
 *   ]}
 *   mode="card"
 * />
 */
import React, { useMemo, useState, useCallback, Suspense } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, Button } from 'tamagui';
import { Box, LayoutGrid } from '@tamagui/lucide-icons';
import { useMobileVisualization } from '../../hooks/useMobileVisualization';
import { MuscleViewer3D } from './MuscleViewer3D';
import { MuscleViewer2D } from './MuscleViewer2D';
import type { MuscleActivation, MuscleViewerProps, MuscleViewerMode } from './types';

// Re-export types and subcomponents
export * from './types';
export { MuscleViewer3D } from './MuscleViewer3D';
export { MuscleViewer2D } from './MuscleViewer2D';
export { MuscleActivationBadge } from './MuscleActivationBadge';

// Size configurations for different modes
const MODE_HEIGHTS: Record<MuscleViewerMode, number> = {
  compact: 150,
  card: 250,
  fullscreen: 450,
  inline: 100,
};

/**
 * Loading skeleton component
 */
function MuscleViewerSkeleton({ mode = 'card' }: { mode?: MuscleViewerMode }) {
  const height = MODE_HEIGHTS[mode];

  return (
    <View style={[styles.skeleton, { height }]}>
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text color="$gray11" fontSize="$2" marginTop="$2">
        Loading muscle visualization...
      </Text>
    </View>
  );
}

/**
 * Error fallback component
 */
function MuscleViewerError({
  onRetry,
  message,
}: {
  onRetry?: () => void;
  message: string;
}) {
  return (
    <YStack
      backgroundColor="$red2"
      padding="$4"
      borderRadius="$4"
      alignItems="center"
      space="$2"
    >
      <Text color="$red10" fontSize="$3">
        Failed to load visualization
      </Text>
      <Text color="$gray11" fontSize="$2">
        {message}
      </Text>
      {onRetry && (
        <Button size="$2" onPress={onRetry} marginTop="$2">
          Retry
        </Button>
      )}
    </YStack>
  );
}

/**
 * MuscleViewer - Unified mobile muscle visualization component
 */
export function MuscleViewer({
  muscles,
  mode = 'card',
  interactive = true,
  showLabels = true,
  autoRotate = false,
  initialView = 'front',
  forceMode,
  showModeToggle = false,
  onMusclePress,
  style,
}: MuscleViewerProps): React.ReactElement {
  const { use3D, mode: detectedMode, supports3D, setPreference } = useMobileVisualization();
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState<'2d' | '3d' | null>(null);

  // Determine actual mode to use
  const actualMode = useMemo(() => {
    if (forceMode) return forceMode;
    if (manualMode) return manualMode;
    return use3D ? '3d' : '2d';
  }, [forceMode, manualMode, use3D]);

  const height = MODE_HEIGHTS[mode];

  // Toggle between 2D and 3D
  const toggleMode = useCallback(() => {
    const newMode = actualMode === '3d' ? '2d' : '3d';
    setManualMode(newMode);
  }, [actualMode]);

  // Handle 3D render error
  const handleError = useCallback((err: Error) => {
    setError(err.message);
    setManualMode('2d'); // Fallback to 2D on error
  }, []);

  // Reset error and retry
  const handleRetry = useCallback(() => {
    setError(null);
    setManualMode(null);
  }, []);

  // Show error state
  if (error && actualMode === '2d') {
    return <MuscleViewerError onRetry={handleRetry} message={error} />;
  }

  return (
    <YStack style={style}>
      {/* Mode Toggle (optional) */}
      {showModeToggle && supports3D && (
        <XStack space="$2" justifyContent="center" marginBottom="$2">
          <Button
            size="$2"
            icon={<LayoutGrid size={14} />}
            chromeless={actualMode !== '2d'}
            backgroundColor={actualMode === '2d' ? '$blue8' : '$gray4'}
            onPress={() => setManualMode('2d')}
          >
            <Text fontSize={11} color={actualMode === '2d' ? 'white' : '$gray11'}>
              2D
            </Text>
          </Button>
          <Button
            size="$2"
            icon={<Box size={14} />}
            chromeless={actualMode !== '3d'}
            backgroundColor={actualMode === '3d' ? '$blue8' : '$gray4'}
            onPress={() => setManualMode('3d')}
          >
            <Text fontSize={11} color={actualMode === '3d' ? 'white' : '$gray11'}>
              3D
            </Text>
          </Button>
        </XStack>
      )}

      {/* Visualization */}
      <View style={[styles.container, { height }]}>
        {actualMode === '3d' ? (
          <Suspense fallback={<MuscleViewerSkeleton mode={mode} />}>
            <MuscleViewer3D
              muscles={muscles}
              height={height}
              interactive={interactive}
              autoRotate={autoRotate}
              onError={handleError}
            />
          </Suspense>
        ) : (
          <MuscleViewer2D
            muscles={muscles}
            view={initialView}
            size={mode === 'fullscreen' ? 'full' : mode === 'compact' ? 'sm' : 'lg'}
            showLabels={showLabels}
            interactive={interactive}
            onMusclePress={onMusclePress}
          />
        )}
      </View>
    </YStack>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  skeleton: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 12,
  },
});

export default MuscleViewer;
