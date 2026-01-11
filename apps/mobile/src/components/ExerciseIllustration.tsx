/**
 * Exercise Illustration Component (React Native)
 *
 * Displays exercise SVG illustrations with muscle highlighting
 * for the mobile app using react-native-svg.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import Svg, { G, Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import {
  getExerciseIllustration,
  hasExerciseIllustration,
  getActivationColor,
  ACTIVATION_COLORS,
} from '@musclemap/shared';

interface ExerciseIllustrationProps {
  exerciseId: string;
  exerciseName?: string;
  primaryMuscles?: string[];
  size?: 'sm' | 'md' | 'lg';
  showMuscleLabels?: boolean;
  interactive?: boolean;
  onMusclePress?: (muscleId: string, data: any) => void;
  style?: any;
}

// Size configurations
const SIZES = {
  sm: { width: 120, height: 100 },
  md: { width: 200, height: 160 },
  lg: { width: 280, height: 220 },
};

// Muscle activation colors
const ACTIVATION_LEVEL_COLORS = {
  primary: { fill: '#EF4444', opacity: 0.9 },   // Red for primary muscles
  secondary: { fill: '#F97316', opacity: 0.7 }, // Orange for secondary
  stabilizer: { fill: '#14B8A6', opacity: 0.5 }, // Teal for stabilizers
  inactive: { fill: '#475569', opacity: 0.2 },  // Gray for inactive
};

// Simplified body outline for fallback
function BodyOutlineFallback({ width, height }: { width: number; height: number }) {
  const scale = Math.min(width / 100, height / 150);
  const offsetX = (width - 100 * scale) / 2;
  const offsetY = (height - 150 * scale) / 2;

  return (
    <G transform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}>
      {/* Head */}
      <Path
        d="M50 10 C60 10 65 20 65 30 C65 40 60 50 50 50 C40 50 35 40 35 30 C35 20 40 10 50 10"
        fill="#1E293B"
        stroke="#334155"
        strokeWidth={1}
      />
      {/* Torso */}
      <Path
        d="M35 50 L25 55 L20 90 L30 130 L50 140 L70 130 L80 90 L75 55 L65 50"
        fill="#1E293B"
        stroke="#334155"
        strokeWidth={1}
      />
      {/* Arms */}
      <Path
        d="M20 55 L10 70 L5 90 L15 95 L25 80 L25 55"
        fill="#1E293B"
        stroke="#334155"
        strokeWidth={1}
      />
      <Path
        d="M80 55 L90 70 L95 90 L85 95 L75 80 L75 55"
        fill="#1E293B"
        stroke="#334155"
        strokeWidth={1}
      />
      {/* Legs */}
      <Path
        d="M35 130 L30 180 L25 210 L35 215 L45 180 L50 140"
        fill="#1E293B"
        stroke="#334155"
        strokeWidth={1}
      />
      <Path
        d="M65 130 L70 180 L75 210 L65 215 L55 180 L50 140"
        fill="#1E293B"
        stroke="#334155"
        strokeWidth={1}
      />
    </G>
  );
}

// Muscle region path generator (simplified)
function MuscleRegion({
  muscleId,
  isActive,
  activationLevel,
  onPress,
  scale,
  offsetX,
  offsetY,
}: {
  muscleId: string;
  isActive: boolean;
  activationLevel: 'primary' | 'secondary' | 'stabilizer' | 'inactive';
  onPress?: () => void;
  scale: number;
  offsetX: number;
  offsetY: number;
}) {
  // Simplified muscle region paths based on muscle ID
  const muscleRegions: Record<string, { path: string; label: string }> = {
    'pectoralis-major': { path: 'M30 55 L50 50 L70 55 L70 75 L50 80 L30 75 Z', label: 'Chest' },
    'deltoid-anterior': { path: 'M20 50 L30 45 L30 65 L20 70 Z', label: 'Front Delt' },
    'deltoid-posterior': { path: 'M70 45 L80 50 L80 70 L70 65 Z', label: 'Rear Delt' },
    'biceps-brachii': { path: 'M15 70 L25 65 L25 90 L15 95 Z', label: 'Biceps' },
    'triceps-brachii': { path: 'M75 65 L85 70 L85 95 L75 90 Z', label: 'Triceps' },
    'rectus-abdominis': { path: 'M40 80 L60 80 L60 120 L40 120 Z', label: 'Abs' },
    'quadriceps': { path: 'M35 130 L50 125 L50 170 L35 175 Z', label: 'Quads' },
    'hamstrings': { path: 'M50 130 L65 125 L65 175 L50 170 Z', label: 'Hams' },
    'latissimus-dorsi': { path: 'M25 60 L35 55 L35 90 L20 95 Z', label: 'Lats' },
    'gluteus-maximus': { path: 'M35 120 L65 120 L65 135 L35 135 Z', label: 'Glutes' },
  };

  const region = muscleRegions[muscleId];
  if (!region) return null;

  const colors = ACTIVATION_LEVEL_COLORS[activationLevel];

  return (
    <G transform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}>
      <Path
        d={region.path}
        fill={colors.fill}
        fillOpacity={colors.opacity}
        stroke={isActive ? '#FFFFFF' : colors.fill}
        strokeWidth={isActive ? 2 : 0}
        onPress={onPress}
      />
    </G>
  );
}

export function ExerciseIllustration({
  exerciseId,
  exerciseName,
  primaryMuscles = [],
  size = 'md',
  showMuscleLabels = false,
  interactive = false,
  onMusclePress,
  style,
}: ExerciseIllustrationProps) {
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  const { width, height } = SIZES[size];

  useEffect(() => {
    // Check if illustration exists
    if (hasExerciseIllustration(exerciseId)) {
      const illustration = getExerciseIllustration(exerciseId);
      if (illustration?.frontUrl) {
        setImageUrl(illustration.frontUrl);
      }
    }
    setLoading(false);
  }, [exerciseId]);

  const handleMusclePress = useCallback((muscleId: string) => {
    if (!interactive) return;
    setSelectedMuscle(muscleId === selectedMuscle ? null : muscleId);
    if (onMusclePress) {
      onMusclePress(muscleId, {
        isSelected: muscleId !== selectedMuscle,
        isPrimary: primaryMuscles.includes(muscleId),
      });
    }
  }, [interactive, selectedMuscle, onMusclePress, primaryMuscles]);

  const getActivationLevel = (muscleId: string): 'primary' | 'secondary' | 'stabilizer' | 'inactive' => {
    if (primaryMuscles.includes(muscleId)) return 'primary';
    // Could add secondary/stabilizer logic based on exercise data
    return 'inactive';
  };

  // If loading
  if (loading) {
    return (
      <View style={[{ width, height, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }, style]}>
        <ActivityIndicator color="#3B82F6" />
      </View>
    );
  }

  // If we have a real image URL, show it
  if (imageUrl) {
    return (
      <View style={[{ width, height, overflow: 'hidden' }, style]}>
        <Image
          source={{ uri: imageUrl }}
          style={{ width, height, resizeMode: 'contain' }}
          onError={() => setImageUrl(null)} // Fall back to SVG on error
        />
        {showMuscleLabels && primaryMuscles.length > 0 && (
          <View style={{ position: 'absolute', bottom: 4, left: 4, right: 4 }}>
            <XStack flexWrap="wrap" gap="$1">
              {primaryMuscles.slice(0, 3).map((muscle) => (
                <View
                  key={muscle}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}
                >
                  <Text fontSize={10} color="white">
                    {muscle.replace(/-/g, ' ')}
                  </Text>
                </View>
              ))}
            </XStack>
          </View>
        )}
      </View>
    );
  }

  // Fallback to SVG-rendered body with muscle highlights
  const scale = Math.min(width / 100, height / 150) * 0.8;
  const offsetX = (width - 100 * scale) / 2;
  const offsetY = (height - 150 * scale) / 2;

  return (
    <View style={[{ width, height, backgroundColor: '#0F172A', borderRadius: 8 }, style]}>
      <Svg width={width} height={height}>
        {/* Gradient definitions */}
        <Defs>
          <LinearGradient id="bodyGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#1E293B" />
            <Stop offset="100%" stopColor="#0F172A" />
          </LinearGradient>
        </Defs>

        {/* Background */}
        <Rect x="0" y="0" width={width} height={height} fill="url(#bodyGradient)" />

        {/* Body outline */}
        <BodyOutlineFallback width={width} height={height} />

        {/* Muscle regions */}
        {primaryMuscles.map((muscleId) => (
          <MuscleRegion
            key={muscleId}
            muscleId={muscleId}
            isActive={selectedMuscle === muscleId}
            activationLevel={getActivationLevel(muscleId)}
            onPress={interactive ? () => handleMusclePress(muscleId) : undefined}
            scale={scale}
            offsetX={offsetX}
            offsetY={offsetY}
          />
        ))}
      </Svg>

      {/* Exercise name overlay */}
      {exerciseName && size !== 'sm' && (
        <View style={{ position: 'absolute', bottom: 8, left: 8, right: 8 }}>
          <Text fontSize={12} color="$gray11" numberOfLines={1}>
            {exerciseName}
          </Text>
        </View>
      )}

      {/* Selected muscle info */}
      {selectedMuscle && interactive && (
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 8,
            borderRadius: 8,
          }}
        >
          <Text fontSize={14} fontWeight="bold" color="white">
            {selectedMuscle.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </Text>
          <Text fontSize={12} color="$gray11">
            {primaryMuscles.includes(selectedMuscle) ? 'Primary muscle' : 'Secondary muscle'}
          </Text>
        </View>
      )}
    </View>
  );
}

export default ExerciseIllustration;
