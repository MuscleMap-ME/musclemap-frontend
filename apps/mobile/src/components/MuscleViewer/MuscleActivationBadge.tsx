/**
 * MuscleActivationBadge (Mobile)
 *
 * Compact inline muscle preview badge (32-64px).
 * Shows primary muscles with glow effect.
 * Used in exercise cards, workout lists, and feed items.
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Svg, { Circle, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { MuscleActivationBadgeProps, MuscleActivation } from './types';

// Compact muscle positions (relative to center)
const BADGE_MUSCLE_POSITIONS: Record<string, { x: number; y: number }> = {
  // Upper body
  chest: { x: 0, y: -0.2 },
  shoulders: { x: 0.4, y: -0.35 },
  front_delts: { x: 0.35, y: -0.35 },
  rear_delts: { x: 0.35, y: -0.35 },
  back: { x: 0, y: -0.25 },
  upper_back: { x: 0, y: -0.3 },
  lats: { x: 0.25, y: -0.1 },
  traps: { x: 0, y: -0.45 },

  // Arms
  biceps: { x: 0.5, y: -0.15 },
  triceps: { x: 0.5, y: -0.15 },
  forearms: { x: 0.55, y: 0.1 },

  // Core
  abs: { x: 0, y: 0.1 },
  core: { x: 0, y: 0.1 },
  obliques: { x: 0.2, y: 0.1 },
  lower_back: { x: 0, y: 0.1 },

  // Lower body
  quads: { x: 0.15, y: 0.4 },
  hamstrings: { x: 0.15, y: 0.4 },
  glutes: { x: 0.2, y: 0.25 },
  calves: { x: 0.12, y: 0.6 },
  hip_flexors: { x: 0.2, y: 0.25 },
  adductors: { x: 0.08, y: 0.35 },
};

// Get position for muscle ID
function getMusclePosition(muscleId: string): { x: number; y: number } | null {
  const normalized = muscleId.toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');
  return BADGE_MUSCLE_POSITIONS[normalized] || null;
}

// Get color based on intensity
function getIntensityColor(intensity: number, isPrimary?: boolean): string {
  if (isPrimary || intensity > 0.7) {
    return '#FF3366'; // Hot pink/red
  }
  if (intensity > 0.4) {
    return '#FF9933'; // Orange
  }
  return '#00CCFF'; // Cyan
}

/**
 * MuscleActivationBadge - Compact muscle preview
 */
export function MuscleActivationBadge({
  muscles,
  size = 48,
  showGlow = true,
  onPress,
}: MuscleActivationBadgeProps) {
  // Filter to top 6 muscles for visibility
  const displayMuscles = useMemo(() => {
    return muscles
      .filter((m) => m.intensity > 0.1)
      .sort((a, b) => {
        // Primary muscles first, then by intensity
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return b.intensity - a.intensity;
      })
      .slice(0, 6);
  }, [muscles]);

  // Calculate dot size based on badge size
  const dotRadius = size * 0.12;
  const center = size / 2;

  const content = (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="badgeBg" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#1E293B" stopOpacity={0.9} />
            <Stop offset="100%" stopColor="#0F172A" stopOpacity={0.95} />
          </RadialGradient>
          {showGlow && (
            <RadialGradient id="glowEffect" cx="50%" cy="50%" r="60%">
              <Stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
              <Stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
            </RadialGradient>
          )}
        </Defs>

        {/* Background */}
        <Circle cx={center} cy={center} r={center - 1} fill="url(#badgeBg)" />

        {/* Glow effect for active muscles */}
        {showGlow && displayMuscles.some((m) => m.intensity > 0.5) && (
          <Circle cx={center} cy={center} r={center - 2} fill="url(#glowEffect)" />
        )}

        {/* Body outline (simplified) */}
        <Circle
          cx={center}
          cy={center * 0.55}
          r={size * 0.12}
          fill="none"
          stroke="#475569"
          strokeWidth={0.5}
          opacity={0.4}
        />
        <Circle
          cx={center}
          cy={center}
          r={size * 0.2}
          fill="none"
          stroke="#475569"
          strokeWidth={0.5}
          opacity={0.3}
        />
        <Circle
          cx={center}
          cy={center * 1.35}
          r={size * 0.15}
          fill="none"
          stroke="#475569"
          strokeWidth={0.5}
          opacity={0.3}
        />

        {/* Muscle activation dots */}
        <G>
          {displayMuscles.map((muscle, index) => {
            const position = getMusclePosition(muscle.id);
            if (!position) return null;

            const x = center + position.x * size * 0.7;
            const y = center + position.y * size * 0.7;
            const color = getIntensityColor(muscle.intensity, muscle.isPrimary);
            const radius = dotRadius * (0.7 + muscle.intensity * 0.5);

            return (
              <G key={`${muscle.id}-${index}`}>
                {/* Glow halo for primary/high intensity */}
                {(muscle.isPrimary || muscle.intensity > 0.6) && showGlow && (
                  <Circle
                    cx={x}
                    cy={y}
                    r={radius * 1.8}
                    fill={color}
                    opacity={0.25}
                  />
                )}
                {/* Main dot */}
                <Circle cx={x} cy={y} r={radius} fill={color} opacity={0.85} />
                {/* Mirror for bilateral muscles */}
                {position.x !== 0 && (
                  <>
                    {(muscle.isPrimary || muscle.intensity > 0.6) && showGlow && (
                      <Circle
                        cx={center - position.x * size * 0.7}
                        cy={y}
                        r={radius * 1.8}
                        fill={color}
                        opacity={0.25}
                      />
                    )}
                    <Circle
                      cx={center - position.x * size * 0.7}
                      cy={y}
                      r={radius}
                      fill={color}
                      opacity={0.85}
                    />
                  </>
                )}
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.pressable}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  pressable: {
    borderRadius: 999,
  },
});

export default MuscleActivationBadge;
