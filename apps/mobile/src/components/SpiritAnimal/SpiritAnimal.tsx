/**
 * Spirit Animal Component
 *
 * Displays the user's Spirit Animal companion with:
 * - Species-specific visuals
 * - Evolution stage rendering
 * - Cosmetic overlays
 * - Mood-based animations
 * - Wealth tier indicators
 *
 * Uses Lottie animations when available, falls back to static images.
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { YStack, XStack, Text, type ColorTokens } from 'tamagui';
import {
  useSpiritAnimalDisplay,
  SPIRIT_ANIMAL_SPECIES,
  type SpiritAnimalSpecies,
  type EvolutionStage,
  type SpiritAnimalCosmetics,
  type WealthTier,
} from '@/stores';

// ============================================================================
// Types
// ============================================================================

export interface SpiritAnimalProps {
  /** Override species (defaults to store value) */
  species?: SpiritAnimalSpecies;
  /** Override stage (defaults to store value) */
  stage?: EvolutionStage;
  /** Override cosmetics (defaults to store value) */
  cosmetics?: SpiritAnimalCosmetics;
  /** Override wealth tier (defaults to store value) */
  wealthTier?: WealthTier;
  /** Override mood for animation */
  mood?: 'idle' | 'happy' | 'encouraging' | 'cheering' | 'celebrating' | 'sleeping' | 'concerned';
  /** Size preset */
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  /** Whether to show the wealth indicator ring */
  showWealthIndicator?: boolean;
  /** Whether to show the name label */
  showLabel?: boolean;
  /** Whether to show the XP progress bar */
  showProgress?: boolean;
  /** Enable tap interaction */
  onPress?: () => void;
  /** Custom style */
  style?: ViewStyle;
}

// Size configurations
const SIZES = {
  small: { container: 64, icon: 48, ring: 4 },
  medium: { container: 120, icon: 96, ring: 6 },
  large: { container: 180, icon: 144, ring: 8 },
  xlarge: { container: 240, icon: 192, ring: 10 },
};

// Wealth tier colors
const WEALTH_COLORS: Record<WealthTier, { primary: string; glow: string }> = {
  0: { primary: 'transparent', glow: 'transparent' },
  1: { primary: '#CD7F32', glow: 'rgba(205, 127, 50, 0.3)' }, // Bronze
  2: { primary: '#C0C0C0', glow: 'rgba(192, 192, 192, 0.4)' }, // Silver
  3: { primary: '#FFD700', glow: 'rgba(255, 215, 0, 0.5)' }, // Gold
  4: { primary: '#E5E4E2', glow: 'rgba(229, 228, 226, 0.6)' }, // Platinum
  5: { primary: '#B9F2FF', glow: 'rgba(185, 242, 255, 0.7)' }, // Diamond
  6: { primary: '#0D0D0D', glow: 'rgba(255, 0, 0, 0.8)' }, // Obsidian with flames
};

// Species emoji placeholders (until we have Lottie animations)
const SPECIES_EMOJI: Record<SpiritAnimalSpecies, string> = {
  phoenix: '🔥',
  golem: '🗿',
  wolf: '🐺',
  owl: '🦉',
  fox: '🦊',
  serpent: '🐍',
  lion: '🦁',
  raven: '🐦‍⬛',
};

// ============================================================================
// Component
// ============================================================================

export function SpiritAnimal({
  species: speciesProp,
  stage: stageProp,
  cosmetics: cosmeticsProp,
  wealthTier: wealthTierProp,
  mood: moodProp,
  size = 'medium',
  showWealthIndicator = true,
  showLabel = false,
  showProgress = false,
  onPress,
  style,
}: SpiritAnimalProps) {
  // Get values from store or props
  const storeData = useSpiritAnimalDisplay();
  const species = speciesProp ?? storeData.species;
  const stage = stageProp ?? storeData.stage;
  const cosmetics = cosmeticsProp ?? storeData.cosmetics;
  const wealthTier = wealthTierProp ?? storeData.wealthTier;
  const mood = moodProp ?? storeData.mood;
  const progress = storeData.progress;

  const speciesData = SPIRIT_ANIMAL_SPECIES[species];
  const sizeConfig = SIZES[size];
  const wealthColors = WEALTH_COLORS[wealthTier];

  // Animation values
  const breatheScale = useSharedValue(1);
  const bounceY = useSharedValue(0);
  const glowOpacity = useSharedValue(0.5);
  const rotation = useSharedValue(0);

  // Idle breathing animation
  useEffect(() => {
    breatheScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    return () => cancelAnimation(breatheScale);
  }, []);

  // Mood-based animations
  useEffect(() => {
    switch (mood) {
      case 'happy':
      case 'cheering':
        bounceY.value = withRepeat(
          withSequence(
            withSpring(-8, { damping: 10 }),
            withSpring(0, { damping: 10 }),
          ),
          -1,
          false,
        );
        break;

      case 'celebrating':
        bounceY.value = withRepeat(
          withSequence(
            withSpring(-12, { damping: 8 }),
            withSpring(0, { damping: 8 }),
          ),
          -1,
          false,
        );
        rotation.value = withRepeat(
          withSequence(
            withTiming(-5, { duration: 200 }),
            withTiming(5, { duration: 200 }),
          ),
          3,
          true,
        );
        break;

      case 'sleeping':
        breatheScale.value = withRepeat(
          withSequence(
            withTiming(1.04, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.98, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        );
        break;

      case 'encouraging':
        glowOpacity.value = withRepeat(
          withSequence(
            withTiming(0.8, { duration: 800 }),
            withTiming(0.3, { duration: 800 }),
          ),
          -1,
          false,
        );
        break;

      case 'concerned':
        bounceY.value = withRepeat(
          withSequence(
            withTiming(-2, { duration: 300 }),
            withTiming(2, { duration: 300 }),
          ),
          3,
          true,
        );
        break;

      default:
        bounceY.value = withSpring(0);
        glowOpacity.value = withTiming(0.5);
    }

    return () => {
      cancelAnimation(bounceY);
      cancelAnimation(rotation);
      cancelAnimation(glowOpacity);
    };
  }, [mood]);

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: breatheScale.value },
      { translateY: bounceY.value },
      { rotateZ: `${rotation.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // Compute stage-based scale
  const stageScale = useMemo(() => {
    const scales: Record<EvolutionStage, number> = {
      1: 0.6,
      2: 0.7,
      3: 0.8,
      4: 0.9,
      5: 1.0,
      6: 1.1,
    };
    return scales[stage];
  }, [stage]);

  return (
    <YStack alignItems="center" gap="$2" style={style}>
      {/* Main container with wealth ring */}
      <Animated.View style={[styles.container, containerStyle]}>
        {/* Wealth indicator ring */}
        {showWealthIndicator && wealthTier > 0 && (
          <>
            {/* Glow effect */}
            <Animated.View
              style={[
                styles.glow,
                glowStyle,
                {
                  width: sizeConfig.container + 20,
                  height: sizeConfig.container + 20,
                  borderRadius: (sizeConfig.container + 20) / 2,
                  backgroundColor: wealthColors.glow,
                },
              ]}
            />
            {/* Ring */}
            <View
              style={[
                styles.ring,
                {
                  width: sizeConfig.container,
                  height: sizeConfig.container,
                  borderRadius: sizeConfig.container / 2,
                  borderWidth: sizeConfig.ring,
                  borderColor: wealthColors.primary,
                },
              ]}
            />
          </>
        )}

        {/* Spirit Animal visual */}
        <View
          style={[
            styles.animalContainer,
            {
              width: sizeConfig.icon,
              height: sizeConfig.icon,
              transform: [{ scale: stageScale }],
            },
          ]}
        >
          {/* Placeholder: Emoji until we have Lottie */}
          <Text
            fontSize={sizeConfig.icon * 0.6}
            textAlign="center"
            lineHeight={sizeConfig.icon}
          >
            {SPECIES_EMOJI[species]}
          </Text>

          {/* Cosmetic overlays would go here */}
          {cosmetics.aura && (
            <View style={[styles.aura, { borderColor: speciesData.primaryColor }]} />
          )}
        </View>

        {/* Obsidian flame effect for tier 6 */}
        {wealthTier === 6 && (
          <Animated.View style={[styles.flames, glowStyle]}>
            <Text fontSize={sizeConfig.icon * 0.3}>🔥</Text>
          </Animated.View>
        )}
      </Animated.View>

      {/* Label */}
      {showLabel && (
        <YStack alignItems="center" gap="$1">
          <Text
            color="$color12"
            fontSize={size === 'small' ? 12 : size === 'medium' ? 14 : 16}
            fontWeight="600"
          >
            {speciesData.name}
          </Text>
          <Text
            color="$color10"
            fontSize={size === 'small' ? 10 : size === 'medium' ? 12 : 14}
          >
            Stage {stage} • {storeData.stageName}
          </Text>
        </YStack>
      )}

      {/* Progress bar */}
      {showProgress && (
        <XStack
          width={sizeConfig.container}
          height={4}
          backgroundColor="$color4"
          borderRadius="$10"
          overflow="hidden"
        >
          <View
            style={{
              width: `${progress.percentage}%`,
              height: '100%',
              backgroundColor: speciesData.primaryColor,
              borderRadius: 10,
            }}
          />
        </XStack>
      )}
    </YStack>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
  },
  ring: {
    position: 'absolute',
  },
  animalContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aura: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    borderRadius: 100,
    borderWidth: 2,
    opacity: 0.5,
  },
  flames: {
    position: 'absolute',
    bottom: -5,
    flexDirection: 'row',
  },
});

export default SpiritAnimal;
