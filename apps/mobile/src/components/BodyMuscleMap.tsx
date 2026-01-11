/**
 * Body Muscle Map Component (React Native)
 *
 * Interactive 2D body silhouette with muscle activation visualization
 * for the mobile app using react-native-svg.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { View, TouchableOpacity, Dimensions } from 'react-native';
import { YStack, XStack, Text, Button, Card } from 'tamagui';
import Svg, { G, Path, Circle, Defs, LinearGradient, Stop, RadialGradient } from 'react-native-svg';
import {
  getActivationColor,
  ACTIVATION_COLORS,
  MUSCLE_GROUP_COLORS,
  getMuscleIllustrationIds,
} from '@musclemap/shared';

interface MuscleActivations {
  [muscleId: string]: number; // 0-100 activation percentage
}

interface BodyMuscleMapProps {
  muscleActivations?: MuscleActivations;
  view?: 'front' | 'back';
  size?: 'sm' | 'md' | 'lg' | 'full';
  showLabels?: boolean;
  interactive?: boolean;
  onMusclePress?: (muscleId: string, data: any) => void;
  style?: any;
}

// Size configurations
const SIZES = {
  sm: { width: 120, height: 180 },
  md: { width: 180, height: 270 },
  lg: { width: 240, height: 360 },
  full: { width: Dimensions.get('window').width - 32, height: Dimensions.get('window').width * 1.5 - 48 },
};

// Muscle path definitions for front view (SVG paths)
const FRONT_MUSCLES: Record<string, { path: string; label: string; group: string }> = {
  // Head & Neck
  'neck': {
    path: 'M45 32 L55 32 L57 45 L43 45 Z',
    label: 'Neck',
    group: 'neck',
  },

  // Chest
  'pectoralis-major-left': {
    path: 'M28 48 Q32 44 42 46 L43 60 Q35 65 28 60 Z',
    label: 'Left Pec',
    group: 'chest',
  },
  'pectoralis-major-right': {
    path: 'M58 46 Q68 44 72 48 L72 60 Q65 65 57 60 Z',
    label: 'Right Pec',
    group: 'chest',
  },

  // Shoulders
  'deltoid-left': {
    path: 'M18 45 Q22 40 28 44 L28 58 Q20 55 18 48 Z',
    label: 'Left Delt',
    group: 'shoulders',
  },
  'deltoid-right': {
    path: 'M72 44 Q78 40 82 45 L82 48 Q80 55 72 58 Z',
    label: 'Right Delt',
    group: 'shoulders',
  },

  // Arms
  'biceps-left': {
    path: 'M14 58 L22 55 L24 78 L14 80 Z',
    label: 'Left Bicep',
    group: 'arms',
  },
  'biceps-right': {
    path: 'M78 55 L86 58 L86 80 L76 78 Z',
    label: 'Right Bicep',
    group: 'arms',
  },
  'forearm-left': {
    path: 'M10 82 L22 80 L20 105 L8 102 Z',
    label: 'Left Forearm',
    group: 'arms',
  },
  'forearm-right': {
    path: 'M78 80 L90 82 L92 102 L80 105 Z',
    label: 'Right Forearm',
    group: 'arms',
  },

  // Core
  'rectus-abdominis': {
    path: 'M42 62 L58 62 L58 95 L42 95 Z',
    label: 'Abs',
    group: 'core',
  },
  'obliques-left': {
    path: 'M28 62 L42 60 L42 95 L30 92 Z',
    label: 'Left Oblique',
    group: 'core',
  },
  'obliques-right': {
    path: 'M58 60 L72 62 L70 92 L58 95 Z',
    label: 'Right Oblique',
    group: 'core',
  },

  // Legs
  'quadriceps-left': {
    path: 'M32 98 L46 96 L44 145 L30 148 Z',
    label: 'Left Quad',
    group: 'legs',
  },
  'quadriceps-right': {
    path: 'M54 96 L68 98 L70 148 L56 145 Z',
    label: 'Right Quad',
    group: 'legs',
  },
  'tibialis-left': {
    path: 'M32 150 L44 148 L42 185 L32 188 Z',
    label: 'Left Shin',
    group: 'legs',
  },
  'tibialis-right': {
    path: 'M56 148 L68 150 L68 188 L58 185 Z',
    label: 'Right Shin',
    group: 'legs',
  },
};

// Muscle path definitions for back view
const BACK_MUSCLES: Record<string, { path: string; label: string; group: string }> = {
  // Traps
  'trapezius': {
    path: 'M35 35 L50 28 L65 35 L58 55 L50 48 L42 55 Z',
    label: 'Traps',
    group: 'back',
  },

  // Back
  'latissimus-dorsi-left': {
    path: 'M25 55 L42 52 L40 90 L22 85 Z',
    label: 'Left Lat',
    group: 'back',
  },
  'latissimus-dorsi-right': {
    path: 'M58 52 L75 55 L78 85 L60 90 Z',
    label: 'Right Lat',
    group: 'back',
  },
  'rhomboids': {
    path: 'M42 50 L58 50 L58 70 L42 70 Z',
    label: 'Rhomboids',
    group: 'back',
  },
  'erector-spinae': {
    path: 'M45 72 L55 72 L55 95 L45 95 Z',
    label: 'Lower Back',
    group: 'back',
  },

  // Glutes
  'gluteus-left': {
    path: 'M30 95 L48 93 L48 115 L28 118 Z',
    label: 'Left Glute',
    group: 'glutes',
  },
  'gluteus-right': {
    path: 'M52 93 L70 95 L72 118 L52 115 Z',
    label: 'Right Glute',
    group: 'glutes',
  },

  // Hamstrings
  'hamstrings-left': {
    path: 'M30 120 L46 118 L44 160 L28 165 Z',
    label: 'Left Ham',
    group: 'legs',
  },
  'hamstrings-right': {
    path: 'M54 118 L70 120 L72 165 L56 160 Z',
    label: 'Right Ham',
    group: 'legs',
  },

  // Calves
  'gastrocnemius-left': {
    path: 'M30 168 L44 165 L42 195 L30 198 Z',
    label: 'Left Calf',
    group: 'legs',
  },
  'gastrocnemius-right': {
    path: 'M56 165 L70 168 L70 198 L58 195 Z',
    label: 'Right Calf',
    group: 'legs',
  },

  // Rear Delts
  'rear-delt-left': {
    path: 'M15 45 L25 42 L25 58 L15 55 Z',
    label: 'Rear Delt L',
    group: 'shoulders',
  },
  'rear-delt-right': {
    path: 'M75 42 L85 45 L85 55 L75 58 Z',
    label: 'Rear Delt R',
    group: 'shoulders',
  },

  // Triceps
  'triceps-left': {
    path: 'M12 58 L22 56 L24 82 L12 85 Z',
    label: 'Left Tri',
    group: 'arms',
  },
  'triceps-right': {
    path: 'M78 56 L88 58 L88 85 L76 82 Z',
    label: 'Right Tri',
    group: 'arms',
  },
};

// Body outline path
const BODY_OUTLINE = {
  front: 'M50 8 C62 8 70 18 70 28 C70 38 62 48 50 48 C38 48 30 38 30 28 C30 18 38 8 50 8 M50 48 L50 32 M25 45 C18 45 12 52 12 60 L8 100 C8 108 12 112 20 110 L22 82 M75 45 C82 45 88 52 88 60 L92 100 C92 108 88 112 80 110 L78 82 M30 95 L28 150 L30 200 L35 200 L38 150 L50 140 L62 150 L65 200 L70 200 L72 150 L70 95',
  back: 'M50 8 C62 8 70 18 70 28 C70 38 62 48 50 48 C38 48 30 38 30 28 C30 18 38 8 50 8 M50 48 L50 32 M25 45 C18 45 12 52 12 60 L8 100 C8 108 12 112 20 110 L22 82 M75 45 C82 45 88 52 88 60 L92 100 C92 108 88 112 80 110 L78 82 M30 95 L28 150 L30 200 L35 200 L38 150 L50 140 L62 150 L65 200 L70 200 L72 150 L70 95',
};

interface MusclePathProps {
  muscleId: string;
  path: string;
  label: string;
  group: string;
  activation: number;
  isSelected: boolean;
  interactive: boolean;
  showLabel: boolean;
  onPress: () => void;
  scale: number;
}

function MusclePath({
  muscleId,
  path,
  label,
  group,
  activation,
  isSelected,
  interactive,
  showLabel,
  onPress,
  scale,
}: MusclePathProps) {
  const fillColor = activation > 0 ? getActivationColor(activation) : '#1E293B';
  const fillOpacity = activation > 0 ? 0.5 + (activation / 100) * 0.5 : 0.3;
  const strokeColor = isSelected ? '#FFFFFF' : activation > 50 ? '#FFFFFF' : '#334155';
  const strokeWidth = isSelected ? 2 : 1;

  return (
    <G onPress={interactive ? onPress : undefined}>
      <Path
        d={path}
        fill={fillColor}
        fillOpacity={fillOpacity}
        stroke={strokeColor}
        strokeWidth={strokeWidth / scale}
      />
      {isSelected && activation > 0 && (
        <Circle
          cx={50}
          cy={50}
          r={3 / scale}
          fill="#FFFFFF"
        />
      )}
    </G>
  );
}

export function BodyMuscleMap({
  muscleActivations = {},
  view = 'front',
  size = 'md',
  showLabels = false,
  interactive = true,
  onMusclePress,
  style,
}: BodyMuscleMapProps) {
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState(view);

  const { width, height } = SIZES[size];
  const muscles = currentView === 'front' ? FRONT_MUSCLES : BACK_MUSCLES;

  // Calculate scale to fit
  const viewBoxWidth = 100;
  const viewBoxHeight = 210;
  const scale = Math.min(width / viewBoxWidth, height / viewBoxHeight);

  const handleMusclePress = useCallback((muscleId: string, muscleData: any) => {
    if (!interactive) return;

    setSelectedMuscle(muscleId === selectedMuscle ? null : muscleId);

    if (onMusclePress) {
      onMusclePress(muscleId, {
        ...muscleData,
        activation: muscleActivations[muscleId] || 0,
        isSelected: muscleId !== selectedMuscle,
      });
    }
  }, [interactive, selectedMuscle, muscleActivations, onMusclePress]);

  const toggleView = useCallback(() => {
    setCurrentView(v => v === 'front' ? 'back' : 'front');
    setSelectedMuscle(null);
  }, []);

  // Get overall muscle group stats
  const groupStats = useMemo(() => {
    const stats: Record<string, { total: number; count: number }> = {};
    Object.entries(muscles).forEach(([muscleId, muscle]) => {
      const activation = muscleActivations[muscleId] || 0;
      if (!stats[muscle.group]) {
        stats[muscle.group] = { total: 0, count: 0 };
      }
      stats[muscle.group].total += activation;
      stats[muscle.group].count += 1;
    });
    return Object.entries(stats).map(([group, data]) => ({
      group,
      average: data.count > 0 ? Math.round(data.total / data.count) : 0,
    })).filter(s => s.average > 0).sort((a, b) => b.average - a.average);
  }, [muscles, muscleActivations]);

  return (
    <YStack space="$2" style={style}>
      {/* View toggle */}
      <XStack justifyContent="center" space="$2">
        <Button
          size="$2"
          chromeless={currentView !== 'front'}
          backgroundColor={currentView === 'front' ? '$blue8' : '$gray4'}
          onPress={() => setCurrentView('front')}
        >
          <Text fontSize={12} color={currentView === 'front' ? 'white' : '$gray11'}>Front</Text>
        </Button>
        <Button
          size="$2"
          chromeless={currentView !== 'back'}
          backgroundColor={currentView === 'back' ? '$blue8' : '$gray4'}
          onPress={() => setCurrentView('back')}
        >
          <Text fontSize={12} color={currentView === 'back' ? 'white' : '$gray11'}>Back</Text>
        </Button>
      </XStack>

      {/* Body Map SVG */}
      <View style={{ width, height, alignSelf: 'center' }}>
        <Svg width={width} height={height} viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}>
          {/* Background gradient */}
          <Defs>
            <LinearGradient id="bgGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#0F172A" />
              <Stop offset="100%" stopColor="#1E293B" />
            </LinearGradient>
            <RadialGradient id="glowGradient" cx="50%" cy="30%" r="70%">
              <Stop offset="0%" stopColor="#3B82F6" stopOpacity={0.1} />
              <Stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
            </RadialGradient>
          </Defs>

          {/* Background */}
          <Path d={`M0 0 H${viewBoxWidth} V${viewBoxHeight} H0 Z`} fill="url(#bgGradient)" />
          <Circle cx={50} cy={60} r={80} fill="url(#glowGradient)" />

          {/* Body outline */}
          <Path
            d={BODY_OUTLINE[currentView]}
            fill="none"
            stroke="#334155"
            strokeWidth={0.5}
            opacity={0.5}
          />

          {/* Muscle regions */}
          {Object.entries(muscles).map(([muscleId, muscle]) => (
            <MusclePath
              key={muscleId}
              muscleId={muscleId}
              path={muscle.path}
              label={muscle.label}
              group={muscle.group}
              activation={muscleActivations[muscleId] || 0}
              isSelected={selectedMuscle === muscleId}
              interactive={interactive}
              showLabel={showLabels}
              onPress={() => handleMusclePress(muscleId, muscle)}
              scale={scale}
            />
          ))}
        </Svg>
      </View>

      {/* Selected muscle info */}
      {selectedMuscle && muscles[selectedMuscle] && (
        <Card padding="$3" backgroundColor="$gray2" borderRadius="$4">
          <XStack justifyContent="space-between" alignItems="center">
            <YStack>
              <Text fontWeight="bold" fontSize={14}>
                {muscles[selectedMuscle].label}
              </Text>
              <Text color="$gray11" fontSize={12}>
                {muscles[selectedMuscle].group.charAt(0).toUpperCase() + muscles[selectedMuscle].group.slice(1)}
              </Text>
            </YStack>
            <YStack alignItems="flex-end">
              <Text
                fontWeight="bold"
                fontSize={18}
                color={muscleActivations[selectedMuscle] > 50 ? '$red10' : muscleActivations[selectedMuscle] > 20 ? '$orange10' : '$gray11'}
              >
                {muscleActivations[selectedMuscle] || 0}%
              </Text>
              <Text color="$gray11" fontSize={10}>
                activation
              </Text>
            </YStack>
          </XStack>
        </Card>
      )}

      {/* Group stats (optional) */}
      {showLabels && groupStats.length > 0 && (
        <XStack flexWrap="wrap" justifyContent="center" gap="$2">
          {groupStats.slice(0, 4).map(({ group, average }) => (
            <View
              key={group}
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
              }}
            >
              <Text fontSize={10} color="$blue11">
                {group}: {average}%
              </Text>
            </View>
          ))}
        </XStack>
      )}
    </YStack>
  );
}

export default BodyMuscleMap;
