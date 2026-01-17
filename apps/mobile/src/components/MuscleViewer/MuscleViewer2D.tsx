/**
 * MuscleViewer2D (Mobile)
 *
 * SVG-based 2D muscle visualization with front/back body views.
 * Optimized for performance on all devices with smooth animations.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { View, Dimensions, Pressable } from 'react-native';
import { YStack, XStack, Text, Button, Card } from 'tamagui';
import Svg, { G, Path, Circle, Defs, LinearGradient, Stop, RadialGradient } from 'react-native-svg';
import type { MuscleViewer2DProps, MuscleActivation, ViewPreset } from './types';

// Size configurations
const SIZES = {
  sm: { width: 140, height: 210 },
  md: { width: 200, height: 300 },
  lg: { width: 280, height: 420 },
  full: {
    width: Dimensions.get('window').width - 48,
    height: (Dimensions.get('window').width - 48) * 1.5,
  },
};

// Muscle ID normalization map
const MUSCLE_ID_MAP: Record<string, string> = {
  chest: 'pectoralis-major',
  pectoralis_major: 'pectoralis-major',
  back: 'latissimus-dorsi',
  upper_back: 'latissimus-dorsi',
  lats: 'latissimus-dorsi',
  shoulders: 'deltoid',
  front_delts: 'deltoid-front',
  rear_delts: 'deltoid-rear',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'forearm',
  abs: 'rectus-abdominis',
  core: 'rectus-abdominis',
  obliques: 'obliques',
  quads: 'quadriceps',
  quadriceps: 'quadriceps',
  hamstrings: 'hamstrings',
  glutes: 'gluteus',
  calves: 'gastrocnemius',
  traps: 'trapezius',
  lower_back: 'erector-spinae',
};

// Normalize muscle ID for matching
function normalizeMuscleId(id: string): string {
  const lowerId = id.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
  return MUSCLE_ID_MAP[id.toLowerCase()] || lowerId;
}

// Get activation color (blue cold -> red hot gradient)
function getActivationColor(intensity: number, isPrimary?: boolean): string {
  // Clamp intensity between 0 and 1
  const i = Math.max(0, Math.min(1, intensity));

  if (isPrimary) {
    // Primary: orange (#FF6600) to red (#FF0033)
    if (i > 0.7) return '#FF0033';
    if (i > 0.4) return '#FF3300';
    return '#FF6600';
  }

  // Secondary: cyan (#00CCFF) to green (#00FF66)
  if (i > 0.7) return '#00FF66';
  if (i > 0.4) return '#00DDAA';
  return '#00CCFF';
}

// Muscle path definitions - FRONT view
const FRONT_MUSCLES: Record<string, { path: string; label: string }> = {
  'pectoralis-major-left': {
    path: 'M28 48 Q32 44 42 46 L43 60 Q35 65 28 60 Z',
    label: 'Left Pec',
  },
  'pectoralis-major-right': {
    path: 'M58 46 Q68 44 72 48 L72 60 Q65 65 57 60 Z',
    label: 'Right Pec',
  },
  'deltoid-left': {
    path: 'M18 45 Q22 40 28 44 L28 58 Q20 55 18 48 Z',
    label: 'Left Delt',
  },
  'deltoid-right': {
    path: 'M72 44 Q78 40 82 45 L82 48 Q80 55 72 58 Z',
    label: 'Right Delt',
  },
  'biceps-left': {
    path: 'M14 58 L22 55 L24 78 L14 80 Z',
    label: 'Left Bicep',
  },
  'biceps-right': {
    path: 'M78 55 L86 58 L86 80 L76 78 Z',
    label: 'Right Bicep',
  },
  'forearm-left': {
    path: 'M10 82 L22 80 L20 105 L8 102 Z',
    label: 'Left Forearm',
  },
  'forearm-right': {
    path: 'M78 80 L90 82 L92 102 L80 105 Z',
    label: 'Right Forearm',
  },
  'rectus-abdominis': {
    path: 'M42 62 L58 62 L58 95 L42 95 Z',
    label: 'Abs',
  },
  'obliques-left': {
    path: 'M28 62 L42 60 L42 95 L30 92 Z',
    label: 'Left Oblique',
  },
  'obliques-right': {
    path: 'M58 60 L72 62 L70 92 L58 95 Z',
    label: 'Right Oblique',
  },
  'quadriceps-left': {
    path: 'M32 98 L46 96 L44 145 L30 148 Z',
    label: 'Left Quad',
  },
  'quadriceps-right': {
    path: 'M54 96 L68 98 L70 148 L56 145 Z',
    label: 'Right Quad',
  },
  'tibialis-left': {
    path: 'M32 150 L44 148 L42 190 L32 192 Z',
    label: 'Left Shin',
  },
  'tibialis-right': {
    path: 'M56 148 L68 150 L68 192 L58 190 Z',
    label: 'Right Shin',
  },
};

// Muscle path definitions - BACK view
const BACK_MUSCLES: Record<string, { path: string; label: string }> = {
  trapezius: {
    path: 'M35 35 L50 28 L65 35 L58 55 L50 48 L42 55 Z',
    label: 'Traps',
  },
  'latissimus-dorsi-left': {
    path: 'M25 55 L42 52 L40 90 L22 85 Z',
    label: 'Left Lat',
  },
  'latissimus-dorsi-right': {
    path: 'M58 52 L75 55 L78 85 L60 90 Z',
    label: 'Right Lat',
  },
  rhomboids: {
    path: 'M42 50 L58 50 L58 70 L42 70 Z',
    label: 'Rhomboids',
  },
  'erector-spinae': {
    path: 'M45 72 L55 72 L55 95 L45 95 Z',
    label: 'Lower Back',
  },
  'gluteus-left': {
    path: 'M30 95 L48 93 L48 115 L28 118 Z',
    label: 'Left Glute',
  },
  'gluteus-right': {
    path: 'M52 93 L70 95 L72 118 L52 115 Z',
    label: 'Right Glute',
  },
  'hamstrings-left': {
    path: 'M30 120 L46 118 L44 160 L28 165 Z',
    label: 'Left Ham',
  },
  'hamstrings-right': {
    path: 'M54 118 L70 120 L72 165 L56 160 Z',
    label: 'Right Ham',
  },
  'gastrocnemius-left': {
    path: 'M30 168 L44 165 L42 198 L30 200 Z',
    label: 'Left Calf',
  },
  'gastrocnemius-right': {
    path: 'M56 165 L70 168 L70 200 L58 198 Z',
    label: 'Right Calf',
  },
  'deltoid-rear-left': {
    path: 'M15 45 L25 42 L25 58 L15 55 Z',
    label: 'Rear Delt L',
  },
  'deltoid-rear-right': {
    path: 'M75 42 L85 45 L85 55 L75 58 Z',
    label: 'Rear Delt R',
  },
  'triceps-left': {
    path: 'M12 58 L22 56 L24 82 L12 85 Z',
    label: 'Left Tri',
  },
  'triceps-right': {
    path: 'M78 56 L88 58 L88 85 L76 82 Z',
    label: 'Right Tri',
  },
};

// Body outline path
const BODY_OUTLINE =
  'M50 8 C62 8 70 18 70 28 C70 38 62 48 50 48 C38 48 30 38 30 28 C30 18 38 8 50 8 M50 48 L50 32 M25 45 C18 45 12 52 12 60 L8 100 C8 108 12 112 20 110 L22 82 M75 45 C82 45 88 52 88 60 L92 100 C92 108 88 112 80 110 L78 82 M30 95 L28 150 L30 205 L35 205 L38 150 L50 140 L62 150 L65 205 L70 205 L72 150 L70 95';

/**
 * Individual muscle path component
 */
interface MusclePathProps {
  muscleId: string;
  path: string;
  label: string;
  intensity: number;
  isPrimary?: boolean;
  isSelected: boolean;
  interactive: boolean;
  scale: number;
  onPress: () => void;
}

function MusclePath({
  muscleId,
  path,
  intensity,
  isPrimary,
  isSelected,
  interactive,
  scale,
  onPress,
}: MusclePathProps) {
  const fillColor = intensity > 0 ? getActivationColor(intensity, isPrimary) : '#1E293B';
  const fillOpacity = intensity > 0 ? 0.4 + intensity * 0.5 : 0.2;
  const strokeColor = isSelected ? '#FFFFFF' : intensity > 0.5 ? '#FFFFFF' : '#334155';
  const strokeWidth = isSelected ? 2.5 : 1;

  return (
    <G onPress={interactive ? onPress : undefined}>
      <Path
        d={path}
        fill={fillColor}
        fillOpacity={fillOpacity}
        stroke={strokeColor}
        strokeWidth={strokeWidth / scale}
      />
    </G>
  );
}

/**
 * MuscleViewer2D - 2D SVG muscle visualization
 */
export function MuscleViewer2D({
  muscles,
  view = 'front',
  size = 'lg',
  showLabels = false,
  interactive = true,
  onMusclePress,
  style,
}: MuscleViewer2DProps) {
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewPreset>(view);

  const { width, height } = SIZES[size];
  const muscleMap = currentView === 'front' ? FRONT_MUSCLES : BACK_MUSCLES;

  // ViewBox dimensions
  const viewBoxWidth = 100;
  const viewBoxHeight = 210;
  const scale = Math.min(width / viewBoxWidth, height / viewBoxHeight);

  // Build activation lookup from muscles array
  const activationMap = useMemo(() => {
    const map = new Map<string, { intensity: number; isPrimary: boolean }>();

    for (const muscle of muscles) {
      const normalizedId = normalizeMuscleId(muscle.id);

      // Direct match
      map.set(normalizedId, { intensity: muscle.intensity, isPrimary: muscle.isPrimary ?? false });

      // Left/right variants
      map.set(`${normalizedId}-left`, {
        intensity: muscle.intensity,
        isPrimary: muscle.isPrimary ?? false,
      });
      map.set(`${normalizedId}-right`, {
        intensity: muscle.intensity,
        isPrimary: muscle.isPrimary ?? false,
      });
    }

    return map;
  }, [muscles]);

  // Get activation for a muscle path ID
  const getActivation = useCallback(
    (muscleId: string): { intensity: number; isPrimary: boolean } => {
      // Try direct match
      if (activationMap.has(muscleId)) {
        return activationMap.get(muscleId)!;
      }

      // Try without left/right suffix
      const baseName = muscleId.replace(/-left$|-right$/, '');
      if (activationMap.has(baseName)) {
        return activationMap.get(baseName)!;
      }

      return { intensity: 0, isPrimary: false };
    },
    [activationMap]
  );

  const handleMusclePress = useCallback(
    (muscleId: string) => {
      if (!interactive) return;

      setSelectedMuscle(muscleId === selectedMuscle ? null : muscleId);
      onMusclePress?.(muscleId);
    },
    [interactive, selectedMuscle, onMusclePress]
  );

  return (
    <YStack space="$2" style={style}>
      {/* View toggle */}
      <XStack justifyContent="center" space="$2">
        <Button
          size="$2"
          chromeless={currentView !== 'front'}
          backgroundColor={currentView === 'front' ? '$blue8' : '$gray4'}
          onPress={() => {
            setCurrentView('front');
            setSelectedMuscle(null);
          }}
        >
          <Text fontSize={11} color={currentView === 'front' ? 'white' : '$gray11'}>
            Front
          </Text>
        </Button>
        <Button
          size="$2"
          chromeless={currentView !== 'back'}
          backgroundColor={currentView === 'back' ? '$blue8' : '$gray4'}
          onPress={() => {
            setCurrentView('back');
            setSelectedMuscle(null);
          }}
        >
          <Text fontSize={11} color={currentView === 'back' ? 'white' : '$gray11'}>
            Back
          </Text>
        </Button>
      </XStack>

      {/* SVG Body Map */}
      <View style={{ width, height, alignSelf: 'center' }}>
        <Svg width={width} height={height} viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}>
          {/* Gradients */}
          <Defs>
            <LinearGradient id="bgGradient2d" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#0F172A" />
              <Stop offset="100%" stopColor="#1E293B" />
            </LinearGradient>
            <RadialGradient id="glowGradient2d" cx="50%" cy="30%" r="70%">
              <Stop offset="0%" stopColor="#3B82F6" stopOpacity={0.15} />
              <Stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
            </RadialGradient>
          </Defs>

          {/* Background */}
          <Path d={`M0 0 H${viewBoxWidth} V${viewBoxHeight} H0 Z`} fill="url(#bgGradient2d)" />
          <Circle cx={50} cy={60} r={80} fill="url(#glowGradient2d)" />

          {/* Body outline - subtle fill for visibility */}
          <Path d={BODY_OUTLINE} fill="rgba(71, 85, 105, 0.08)" stroke="#334155" strokeWidth={0.8} opacity={0.6} />

          {/* Muscle regions */}
          {Object.entries(muscleMap).map(([muscleId, muscle]) => {
            const activation = getActivation(muscleId);
            return (
              <MusclePath
                key={muscleId}
                muscleId={muscleId}
                path={muscle.path}
                label={muscle.label}
                intensity={activation.intensity}
                isPrimary={activation.isPrimary}
                isSelected={selectedMuscle === muscleId}
                interactive={interactive}
                scale={scale}
                onPress={() => handleMusclePress(muscleId)}
              />
            );
          })}
        </Svg>
      </View>

      {/* Selected muscle info */}
      {selectedMuscle && muscleMap[selectedMuscle] && (
        <Card padding="$3" backgroundColor="$gray2" borderRadius="$4">
          <XStack justifyContent="space-between" alignItems="center">
            <YStack>
              <Text fontWeight="bold" fontSize={13}>
                {muscleMap[selectedMuscle].label}
              </Text>
            </YStack>
            <YStack alignItems="flex-end">
              <Text
                fontWeight="bold"
                fontSize={16}
                color={
                  getActivation(selectedMuscle).intensity > 0.5
                    ? '$red10'
                    : getActivation(selectedMuscle).intensity > 0.2
                      ? '$orange10'
                      : '$gray11'
                }
              >
                {Math.round(getActivation(selectedMuscle).intensity * 100)}%
              </Text>
              <Text color="$gray11" fontSize={10}>
                activation
              </Text>
            </YStack>
          </XStack>
        </Card>
      )}
    </YStack>
  );
}

export default MuscleViewer2D;
